"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ExperimentEvent {
  timestamp: string;
  event_type: string;
  action: string;
  details: Record<string, unknown>;
  operator_id?: string;
}

interface ExperimentSession {
  session_id: string;
  start_time: string;
  end_time?: string;
  experiment_name?: string;
  operator_id?: string;
  notes?: string;
  events: ExperimentEvent[];
}

export const useExperimentSession = () => {
  const [currentSession, setCurrentSession] =
    useState<ExperimentSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const eventsRef = useRef<ExperimentEvent[]>([]);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("experiment-session");
      const savedEvents = localStorage.getItem("experiment-events");

      if (savedSession) {
        const session = JSON.parse(savedSession);
        // Only restore if the session was active (no end_time)
        if (!session.end_time) {
          setCurrentSession(session);
          setIsRecording(true);

          if (savedEvents) {
            eventsRef.current = JSON.parse(savedEvents);
          }

          console.log(
            "Restored experiment session from localStorage:",
            session.session_id,
          );
        } else {
          // Clean up completed session
          localStorage.removeItem("experiment-session");
          localStorage.removeItem("experiment-events");
        }
      }
    } catch (error) {
      console.warn("Failed to restore session from localStorage:", error);
      // Clean up corrupted data
      localStorage.removeItem("experiment-session");
      localStorage.removeItem("experiment-events");
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (currentSession && isRecording) {
      localStorage.setItem(
        "experiment-session",
        JSON.stringify(currentSession),
      );
    } else {
      localStorage.removeItem("experiment-session");
    }
  }, [currentSession, isRecording]);

  // Save events to localStorage periodically
  useEffect(() => {
    if (isRecording && eventsRef.current.length > 0) {
      localStorage.setItem(
        "experiment-events",
        JSON.stringify(eventsRef.current),
      );
    }
  }, [isRecording]);

  // Start a new experiment session
  const startSession = useCallback(
    (experimentName?: string, operatorId?: string, notes?: string) => {
      const sessionId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const startTime = new Date().toISOString();

      const newSession: ExperimentSession = {
        session_id: sessionId,
        start_time: startTime,
        experiment_name: experimentName,
        operator_id: operatorId,
        notes: notes,
        events: [],
      };

      setCurrentSession(newSession);
      setIsRecording(true);
      eventsRef.current = [];

      // Save to localStorage immediately
      localStorage.setItem("experiment-session", JSON.stringify(newSession));
      localStorage.removeItem("experiment-events");

      console.log(`Started experiment session: ${sessionId}`);
      return sessionId;
    },
    [],
  );

  // Stop the current session and save logs
  const stopSession = useCallback(async () => {
    if (!currentSession || !isRecording) {
      console.warn("No active session to stop");
      return null;
    }

    const endTime = new Date().toISOString();
    const finalSession: ExperimentSession = {
      ...currentSession,
      end_time: endTime,
      events: [...eventsRef.current],
    };

    // Save to JSONL file
    await saveSessionToFile(finalSession);

    setCurrentSession(null);
    setIsRecording(false);
    eventsRef.current = [];

    // Clean up localStorage
    localStorage.removeItem("experiment-session");
    localStorage.removeItem("experiment-events");

    console.log(`Stopped experiment session: ${finalSession.session_id}`);
    return finalSession;
  }, [currentSession, isRecording]);

  // Add an event to the current session
  const addEvent = useCallback(
    (event: ExperimentEvent) => {
      if (isRecording && currentSession) {
        eventsRef.current.push(event);

        // Update localStorage with new event
        localStorage.setItem(
          "experiment-events",
          JSON.stringify(eventsRef.current),
        );

        // Also save individual event to JSONL in real-time
        saveEventToFile(event, currentSession.session_id);
      }
    },
    [isRecording, currentSession],
  );

  // Save session metadata and all events to JSONL file
  const saveSessionToFile = async (session: ExperimentSession) => {
    try {
      // Create session summary
      const sessionSummary = {
        type: "session_summary",
        ...session,
        event_count: session.events.length,
        duration_seconds: session.end_time
          ? (new Date(session.end_time).getTime() -
              new Date(session.start_time).getTime()) /
            1000
          : null,
      };

      // Convert to JSONL format (one JSON object per line)
      const jsonlContent = [
        JSON.stringify(sessionSummary),
        ...session.events.map((event) =>
          JSON.stringify({
            type: "event",
            session_id: session.session_id,
            ...event,
          }),
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([jsonlContent], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `experiment_${session.session_id}_${new Date().toISOString().split("T")[0]}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Saved session ${session.session_id} to JSONL file`);
    } catch (error) {
      console.error("Failed to save session to file:", error);
    }
  };

  // Save individual event to file (for real-time logging)
  const saveEventToFile = async (event: ExperimentEvent, sessionId: string) => {
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      // Use File System Access API if available (Chrome-based browsers)
      try {
        // This would require setting up a file handle, but for now we'll skip real-time saving
        // and only save when session ends
      } catch (error) {
        // Fallback to end-of-session saving only
      }
    }
  };

  // Get current session info
  const getSessionInfo = useCallback(() => {
    if (!currentSession) return null;

    return {
      ...currentSession,
      duration_seconds:
        (new Date().getTime() - new Date(currentSession.start_time).getTime()) /
        1000,
      event_count: eventsRef.current.length,
      is_recording: isRecording,
    };
  }, [currentSession, isRecording]);

  return {
    currentSession: getSessionInfo(),
    isRecording,
    startSession,
    stopSession,
    addEvent,
  };
};
