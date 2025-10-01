'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  TextField,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

interface ExperimentControlProps {
  manualIp: string;
  onSessionChange?: (sessionId: string | null) => void;
  exportLogsAsJsonl?: () => string;
  saveAllLogsToServer?: () => Promise<boolean>;
}

interface BagStatus {
  recording: boolean;
  path: string | null;
  pid: number | null;
}

interface LogFile {
  name: string;
  sessionId: string;
  created: string;
  modified: string;
  size: number;
}

export default function ExperimentControl({
  manualIp,
  onSessionChange,
  exportLogsAsJsonl,
  saveAllLogsToServer,
}: ExperimentControlProps) {
  const [sessionName, setSessionName] = useState('');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [bagStatus, setBagStatus] = useState<BagStatus>({
    recording: false,
    path: null,
    pid: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('experiment-control-session');
      const savedStartTime = localStorage.getItem(
        'experiment-control-start-time'
      );

      if (savedSession && savedStartTime) {
        setCurrentSession(savedSession);
        setSessionStartTime(new Date(savedStartTime));
        onSessionChange?.(savedSession);
        console.log(
          'Restored experiment control session from localStorage:',
          savedSession
        );
      }
    } catch (error) {
      console.warn(
        'Failed to restore experiment control session from localStorage:',
        error
      );
      localStorage.removeItem('experiment-control-session');
      localStorage.removeItem('experiment-control-start-time');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount to restore session

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (currentSession && sessionStartTime) {
      localStorage.setItem('experiment-control-session', currentSession);
      localStorage.setItem(
        'experiment-control-start-time',
        sessionStartTime.toISOString()
      );
    } else {
      localStorage.removeItem('experiment-control-session');
      localStorage.removeItem('experiment-control-start-time');
    }
  }, [currentSession, sessionStartTime]);

  // Check bag status periodically
  useEffect(() => {
    const checkBagStatus = async () => {
      try {
        const response = await fetch(`http://${manualIp}:4000/bag/status`);
        if (response.ok) {
          const status = await response.json();
          setBagStatus(status);

          // If we have a session but bag is not recording, there might be a disconnect
          if (currentSession && !status.recording) {
            console.warn(
              'Session exists but bag is not recording - possible disconnection or crash'
            );
          }
        }
      } catch {
        // Silently fail - bag status check shouldn't interrupt user experience
      }
    };

    checkBagStatus();
    const interval = setInterval(checkBagStatus, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [manualIp, currentSession]);

  const startSession = async () => {
    if (!sessionName.trim()) {
      setError('Please enter a session name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Start ROS2 bag recording
      const bagResponse = await fetch(`http://${manualIp}:4000/bag/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
        }),
      });

      if (!bagResponse.ok) {
        const errorData = await bagResponse.json();
        throw new Error(errorData.error || 'Failed to start bag recording');
      }

      const bagData = await bagResponse.json();

      // Set current session
      const sessionId = `${sessionName.trim()}_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}`;
      const startTime = new Date();
      setCurrentSession(sessionId);
      setSessionStartTime(startTime);
      onSessionChange?.(sessionId);

      // Save to localStorage immediately
      localStorage.setItem('experiment-control-session', sessionId);
      localStorage.setItem(
        'experiment-control-start-time',
        startTime.toISOString()
      );

      setSuccess(`Session started: ${sessionName}`);
      console.log('Bag recording started:', bagData);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    setLoading(true);
    setError(null);

    // Fallback save method using the old approach
    const fallbackSaveLogs = async () => {
      if (exportLogsAsJsonl && currentSession) {
        try {
          const logsJsonl = exportLogsAsJsonl();
          if (logsJsonl.trim()) {
            const saveResponse = await fetch(
              `http://${manualIp}:4000/experiment/logs/save`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: currentSession,
                  logs: logsJsonl,
                }),
              }
            );

            if (!saveResponse.ok) {
              console.warn('Failed to save experiment logs, but continuing...');
            } else {
              console.log('Experiment logs saved successfully via fallback');
            }
          }
        } catch (logError) {
          console.warn('Error saving experiment logs via fallback:', logError);
        }
      }
    };

    try {
      // Save experiment logs if available - use new saveAllLogsToServer if provided
      if (saveAllLogsToServer && currentSession) {
        try {
          const saveSuccess = await saveAllLogsToServer();
          if (saveSuccess) {
            console.log(
              'Experiment logs saved successfully using saveAllLogsToServer'
            );
          } else {
            console.warn(
              'Failed to save experiment logs using saveAllLogsToServer, trying fallback...'
            );
            // Fallback to old method
            await fallbackSaveLogs();
          }
        } catch (logError) {
          console.warn(
            'Error saving experiment logs with saveAllLogsToServer:',
            logError
          );
          // Fallback to old method
          await fallbackSaveLogs();
        }
      } else if (exportLogsAsJsonl && currentSession) {
        await fallbackSaveLogs();
      }

      // Stop ROS2 bag recording
      const bagResponse = await fetch(`http://${manualIp}:4000/bag/stop`, {
        method: 'POST',
      });

      if (!bagResponse.ok) {
        const errorData = await bagResponse.json();
        throw new Error(errorData.error || 'Failed to stop bag recording');
      }

      const bagData = await bagResponse.json();

      // End current session
      setCurrentSession(null);
      setSessionStartTime(null);
      onSessionChange?.(null);

      // Clean up localStorage
      localStorage.removeItem('experiment-control-session');
      localStorage.removeItem('experiment-control-start-time');

      setSuccess('Session stopped and data saved');
      console.log('Bag recording stopped:', bagData);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  const loadLogFiles = async () => {
    try {
      const response = await fetch(
        `http://${manualIp}:4000/experiment/logs/list`
      );
      if (response.ok) {
        const data = await response.json();
        setLogFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load log files:', err);
    }
  };

  const downloadLogFile = async (sessionId: string) => {
    try {
      const response = await fetch(
        `http://${manualIp}:4000/experiment/logs/download/${sessionId}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `experiment_${sessionId}.jsonl`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download log file:', err);
    }
  };

  const openLogsDialog = () => {
    loadLogFiles();
    setShowLogsDialog(true);
  };

  const formatDuration = (startTime: Date): string => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Box minWidth={220}>
      <Typography variant='h6'>Experiment Control</Typography>
      <Divider sx={{ mb: 1 }} />

      <Stack spacing={1}>
        {loading && <LinearProgress sx={{ mb: 1 }} />}

        {error && (
          <Alert severity='error' sx={{ mb: 1 }} onClose={() => setError(null)}>
            <Typography variant='caption'>{error}</Typography>
          </Alert>
        )}

        {success && (
          <Alert
            severity='success'
            sx={{ mb: 1 }}
            onClose={() => setSuccess(null)}
          >
            <Typography variant='caption'>{success}</Typography>
          </Alert>
        )}

        {/* Current Session Status */}
        {currentSession ? (
          <Box sx={{ mb: 2 }}>
            <Chip
              label='Session Active'
              color='success'
              variant='filled'
              size='small'
              sx={{ mb: 1 }}
            />
            <Typography
              variant='caption'
              display='block'
              color='text.secondary'
            >
              {sessionStartTime && formatDuration(sessionStartTime)}
            </Typography>
            <Typography variant='caption' display='block' sx={{ mb: 1 }}>
              <strong>ID:</strong>{' '}
              {currentSession.split('_').slice(0, -1).join('_')}
            </Typography>
            <Chip
              label={bagStatus.recording ? '🔴 Recording' : '⚫ Stopped'}
              color={bagStatus.recording ? 'success' : 'default'}
              size='small'
            />
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Chip
              label='No Active Session'
              color='default'
              variant='outlined'
              size='small'
            />
          </Box>
        )}

        {/* Session Controls */}
        {!currentSession ? (
          <>
            <TextField
              label='Session Name'
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder='pilot_study_001'
              disabled={loading}
              size='small'
              sx={{ mb: 1 }}
            />
            <Button
              variant='contained'
              onClick={startSession}
              disabled={loading || !sessionName.trim()}
              color='success'
              size='small'
            >
              Start Session
            </Button>
          </>
        ) : (
          <Button
            variant='contained'
            onClick={stopSession}
            disabled={loading}
            color='error'
            size='small'
          >
            Stop & Save
          </Button>
        )}

        <Button
          variant='outlined'
          onClick={openLogsDialog}
          disabled={loading}
          size='small'
        >
          View Previous
        </Button>
      </Stack>

      {/* Previous Sessions Dialog */}
      <Dialog
        open={showLogsDialog}
        onClose={() => setShowLogsDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Previous Experiment Sessions</DialogTitle>
        <DialogContent>
          {logFiles.length === 0 ? (
            <Typography>No previous sessions found.</Typography>
          ) : (
            <List>
              {logFiles.map((file) => (
                <ListItem
                  key={file.sessionId}
                  secondaryAction={
                    <Button
                      size='small'
                      onClick={() => downloadLogFile(file.sessionId)}
                    >
                      Download
                    </Button>
                  }
                >
                  <ListItemText
                    primary={file.sessionId}
                    secondary={
                      <span>
                        Created: {new Date(file.created).toLocaleString()} •
                        Size: {formatFileSize(file.size)}
                      </span>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
