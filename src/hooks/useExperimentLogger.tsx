'use client';

import { useCallback, useRef, useEffect } from 'react';
import ROSLIB from 'roslib';

interface ExperimentEvent {
  timestamp: string;
  event_type: string;
  action: string;
  details: Record<string, unknown>;
  operator_id?: string;
  session_id?: string;
}

export const useExperimentLogger = (
  ros: ROSLIB.Ros | null,
  sessionId?: string | null,
  manualIp?: string // Add manualIp parameter for auto-saving
) => {
  const logsRef = useRef<ExperimentEvent[]>([]);
  const lastAutoSaveRef = useRef<number>(0);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load logs from localStorage on mount if we have a session ID
  useEffect(() => {
    if (sessionId) {
      try {
        const savedLogs = localStorage.getItem(`experiment-logs-${sessionId}`);
        const savedCount = localStorage.getItem(
          `experiment-logs-saved-count-${sessionId}`
        );

        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          logsRef.current = parsedLogs;

          // Restore the count of logs that have been saved to server
          if (savedCount) {
            lastAutoSaveRef.current = parseInt(savedCount, 10);
            console.log(
              `Restored ${parsedLogs.length} experiment logs for session ${sessionId} (${lastAutoSaveRef.current} previously saved to server)`
            );
          } else {
            // No saved count info, assume none have been saved
            lastAutoSaveRef.current = 0;
            console.log(
              `Restored ${parsedLogs.length} experiment logs for session ${sessionId} - will attempt to save all to server`
            );
          }
        }
      } catch (error) {
        console.warn(
          'Failed to restore experiment logs from localStorage:',
          error
        );
        localStorage.removeItem(`experiment-logs-${sessionId}`);
        localStorage.removeItem(`experiment-logs-saved-count-${sessionId}`);
      }
    }
  }, [sessionId]);

  // Manual save function - only saves new logs since last save
  const saveLogsToServer = useCallback(async () => {
    if (!sessionId || !manualIp || logsRef.current.length === 0) {
      return false;
    }

    // Only send new logs that haven't been saved yet
    const newLogs = logsRef.current.slice(lastAutoSaveRef.current);

    if (newLogs.length === 0) {
      return true; // Nothing new to save
    }

    try {
      const jsonlContent = newLogs.map((log) => JSON.stringify(log)).join('\n');

      // Try append endpoint first
      let response = await fetch(
        `http://${manualIp}:4000/experiment/logs/append`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            logs: jsonlContent,
          }),
        }
      );

      // If append endpoint doesn't exist, fallback to save with all logs
      if (response.status === 404) {
        console.log('Append endpoint not found, using save endpoint');
        const allLogsContent = logsRef.current
          .map((log) => JSON.stringify(log))
          .join('\n');
        response = await fetch(`http://${manualIp}:4000/experiment/logs/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            logs: allLogsContent,
          }),
        });
      }

      if (response.ok) {
        lastAutoSaveRef.current = logsRef.current.length;
        // Save the count of saved logs to localStorage
        if (sessionId) {
          localStorage.setItem(
            `experiment-logs-saved-count-${sessionId}`,
            lastAutoSaveRef.current.toString()
          );
        }
        console.log(
          `Saved ${newLogs.length} new experiment logs for session ${sessionId} (total: ${logsRef.current.length})`
        );
        return true;
      } else {
        console.warn('Failed to save experiment logs:', response.statusText);
        return false;
      }
    } catch (error) {
      console.warn('Error saving logs to server:', error);
      return false;
    }
  }, [sessionId, manualIp]);

  // Save all logs to server (useful when ending session)
  const saveAllLogsToServer = useCallback(async () => {
    if (!sessionId || !manualIp || logsRef.current.length === 0) {
      return false;
    }

    try {
      const jsonlContent = logsRef.current
        .map((log) => JSON.stringify(log))
        .join('\n');
      const response = await fetch(
        `http://${manualIp}:4000/experiment/logs/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            logs: jsonlContent,
          }),
        }
      );

      if (response.ok) {
        lastAutoSaveRef.current = logsRef.current.length;
        // Save the count of saved logs to localStorage
        if (sessionId) {
          localStorage.setItem(
            `experiment-logs-saved-count-${sessionId}`,
            lastAutoSaveRef.current.toString()
          );
        }
        console.log(
          `Saved all ${logsRef.current.length} experiment logs for session ${sessionId}`
        );
        return true;
      } else {
        console.warn(
          'Failed to save all experiment logs:',
          response.statusText
        );
        return false;
      }
    } catch (error) {
      console.warn('Error saving all logs to server:', error);
      return false;
    }
  }, [sessionId, manualIp]);

  // Trigger immediate save attempt when logs are restored and we have connection details
  useEffect(() => {
    if (
      sessionId &&
      manualIp &&
      logsRef.current.length > lastAutoSaveRef.current
    ) {
      // Small delay to ensure everything is initialized
      const timeoutId = setTimeout(async () => {
        const unsavedCount = logsRef.current.length - lastAutoSaveRef.current;
        console.log(
          `Attempting to save ${unsavedCount} restored unsaved logs to server...`
        );
        await saveLogsToServer();
      }, 2000); // 2 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [sessionId, manualIp, saveLogsToServer]);

  // Auto-save logs to server periodically
  useEffect(() => {
    if (!sessionId || !manualIp) {
      // Clear any existing auto-save interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      return;
    }

    // Auto-save every 10 seconds - more frequent to catch restored logs
    autoSaveIntervalRef.current = setInterval(async () => {
      if (logsRef.current.length > lastAutoSaveRef.current) {
        console.log(
          `Auto-saving ${
            logsRef.current.length - lastAutoSaveRef.current
          } unsaved logs...`
        );
        await saveLogsToServer();
      }
    }, 5000); // 5 seconds for more frequent saves, especially after refresh

    // Cleanup interval on unmount or dependency change
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [sessionId, manualIp, saveLogsToServer]);

  const logEvent = useCallback(
    (
      eventType: string,
      action: string,
      details: Record<string, unknown> = {},
      operatorId?: string
    ) => {
      const experimentEvent: ExperimentEvent = {
        timestamp: new Date().toISOString(),
        event_type: eventType,
        action: action,
        details: details,
        ...(operatorId && { operator_id: operatorId }),
        ...(sessionId && { session_id: sessionId }),
      };

      // Store locally for potential JSONL export
      logsRef.current.push(experimentEvent);

      // Save to localStorage if we have a session ID
      if (sessionId) {
        try {
          localStorage.setItem(
            `experiment-logs-${sessionId}`,
            JSON.stringify(logsRef.current)
          );
        } catch (error) {
          console.warn('Failed to save logs to localStorage:', error);
        }
      }

      // Note: Auto-save to server happens on interval (every 10 seconds)
      // This prevents overwhelming the server with individual requests

      // Publish to ROS topic
      if (ros) {
        const experimentEventTopic = new ROSLIB.Topic({
          ros,
          name: '/experiment/event',
          messageType: 'std_msgs/String',
        });

        const message = new ROSLIB.Message({
          data: JSON.stringify(experimentEvent),
        });

        experimentEventTopic.publish(message);
      } else {
        console.warn(
          'ROS connection not available. Cannot log experiment event to topic.'
        );
      }
    },
    [ros, sessionId]
  );

  // Export logs as JSONL
  const exportLogsAsJsonl = useCallback((): string => {
    return logsRef.current.map((log) => JSON.stringify(log)).join('\n');
  }, []);

  // Download logs as JSONL file
  const downloadLogsAsJsonl = useCallback(
    (filename?: string) => {
      const jsonlContent = exportLogsAsJsonl();
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        filename ||
        `experiment_logs_${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [exportLogsAsJsonl]
  );

  // Clear logs (for new session)
  const clearLogs = useCallback(() => {
    logsRef.current = [];
    lastAutoSaveRef.current = 0; // Reset saved count tracking
    // Clear localStorage for all session logs
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('experiment-logs-')) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Helper functions for different types of events
  const logMovementEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('movement', action, details);
    },
    [logEvent]
  );

  const logArmEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('arm_control', action, details);
    },
    [logEvent]
  );

  const logLedEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('led_control', action, details);
    },
    [logEvent]
  );

  const logSoundEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('sound_control', action, details);
    },
    [logEvent]
  );

  const logGripperEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('gripper_control', action, details);
    },
    [logEvent]
  );

  const logMacroEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('macro', action, details);
    },
    [logEvent]
  );

  const logSystemEvent = useCallback(
    (action: string, details: Record<string, unknown>) => {
      logEvent('system', action, details);
    },
    [logEvent]
  );

  return {
    logEvent,
    logMovementEvent,
    logArmEvent,
    logLedEvent,
    logSoundEvent,
    logGripperEvent,
    logMacroEvent,
    logSystemEvent,
    exportLogsAsJsonl,
    downloadLogsAsJsonl,
    saveLogsToServer,
    saveAllLogsToServer,
    clearLogs,
    getLogCount: () => logsRef.current.length,
  };
};
