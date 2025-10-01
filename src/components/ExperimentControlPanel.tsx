"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Chip,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useExperimentSession } from "../hooks/useExperimentSession";

interface ExperimentControlPanelProps {
  ros: any; // ROS connection
  manualIp: string;
}

export default function ExperimentControlPanel({
  ros,
  manualIp,
}: ExperimentControlPanelProps) {
  const { currentSession, isRecording, startSession, stopSession } =
    useExperimentSession();

  const [experimentName, setExperimentName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [notes, setNotes] = useState("");
  const [rosBagRecording, setRosBagRecording] = useState(false);
  const [rosBagStatus, setRosBagStatus] = useState<string>("");
  const [showStartDialog, setShowStartDialog] = useState(false);

  const handleStartSession = () => {
    setShowStartDialog(true);
  };

  const confirmStartSession = () => {
    const sessionId = startSession(
      experimentName || undefined,
      operatorId || undefined,
      notes || undefined,
    );
    setShowStartDialog(false);

    // Also start ros2 bag recording if requested
    if (rosBagRecording) {
      startRosBagRecording(sessionId);
    }
  };

  const handleStopSession = async () => {
    const session = await stopSession();

    // Stop ros2 bag recording if it was running
    if (rosBagRecording) {
      await stopRosBagRecording();
    }

    // Reset form
    setExperimentName("");
    setOperatorId("");
    setNotes("");
  };

  const startRosBagRecording = async (sessionId?: string) => {
    try {
      const bagName = sessionId || `experiment_${Date.now()}`;
      const response = await fetch(`http://${manualIp}:4000/rosbag/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bag_name: bagName,
          topics: [
            "/experiment/event",
            "/robomaster/cmd_vel",
            "/robomaster/leds/color",
            "/robomaster/cmd_sound",
            "/robomaster/panic",
            "/robomaster/odom",
            "/optitrack/robomaster_frova",
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setRosBagStatus(`Recording: ${result.bag_name}`);
        console.log("Started ros2 bag recording:", result);
      } else {
        throw new Error(`Failed to start ros2 bag: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to start ros2 bag recording:", error);
      setRosBagStatus(`Error: ${error}`);
    }
  };

  const stopRosBagRecording = async () => {
    try {
      const response = await fetch(`http://${manualIp}:4000/rosbag/stop`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        setRosBagStatus(`Saved: ${result.bag_path || "bag file saved"}`);
        setTimeout(() => setRosBagStatus(""), 5000); // Clear status after 5 seconds
        console.log("Stopped ros2 bag recording:", result);
      } else {
        throw new Error(`Failed to stop ros2 bag: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to stop ros2 bag recording:", error);
      setRosBagStatus(`Error: ${error}`);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Experiment Control
        </Typography>

        {!isRecording ? (
          // Not recording - show start controls
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                color="success"
                onClick={handleStartSession}
                disabled={!ros}
              >
                ▶ Start Experiment
              </Button>
              {!ros && (
                <Alert severity="warning" sx={{ flexGrow: 1 }}>
                  ROS connection required to start experiment
                </Alert>
              )}
            </Stack>
          </Stack>
        ) : (
          // Recording - show session info and stop controls
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={`🔴 Recording: ${currentSession?.session_id || "Unknown"}`}
                color="error"
                variant="filled"
              />
              <Typography variant="body2" color="text.secondary">
                Duration:{" "}
                {currentSession
                  ? formatDuration(currentSession.duration_seconds)
                  : "0:00"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Events: {currentSession?.event_count || 0}
              </Typography>
            </Box>

            {currentSession?.experiment_name && (
              <Typography variant="body2">
                <strong>Experiment:</strong> {currentSession.experiment_name}
              </Typography>
            )}

            {currentSession?.operator_id && (
              <Typography variant="body2">
                <strong>Operator:</strong> {currentSession.operator_id}
              </Typography>
            )}

            {rosBagStatus && (
              <Alert
                severity={rosBagStatus.includes("Error") ? "error" : "info"}
              >
                ROS2 Bag: {rosBagStatus}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="error"
                onClick={handleStopSession}
              >
                ⏹ Stop & Save
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Start Session Dialog */}
        <Dialog
          open={showStartDialog}
          onClose={() => setShowStartDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Start New Experiment Session</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Experiment Name"
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                placeholder="e.g., 'HRI Collaboration Study - Session 1'"
                fullWidth
              />
              <TextField
                label="Operator ID"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="e.g., 'operator_1', 'researcher_alice'"
                fullWidth
              />
              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this session..."
                multiline
                rows={3}
                fullWidth
              />
              <Box>
                <Button
                  variant={rosBagRecording ? "contained" : "outlined"}
                  onClick={() => setRosBagRecording(!rosBagRecording)}
                >
                  {rosBagRecording
                    ? "💾 Will record ROS2 bag"
                    : "📁 No ROS2 bag recording"}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  ROS2 bag will include all robot topics and experiment events
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStartDialog(false)}>Cancel</Button>
            <Button
              onClick={confirmStartSession}
              variant="contained"
              color="success"
            >
              Start Session
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
