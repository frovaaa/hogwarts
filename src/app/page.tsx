'use client';

import { useContext, useEffect, useState } from 'react';
import { RosContext } from '@/context/RosContext';
import {
  Container,
  Typography,
  Alert,
  TextField,
  Button,
  Box,
  Grid2 as Grid,
} from '@mui/material';
import JoystickControl from '@/components/JoystickControl';
import CameraFeed from '@/components/CameraFeed';
import TopicsList from '@/components/TopicsList';
import ActionsPanel from '@/components/ActionsPanel';
import OdomData from '@/components/OdomData';
import ExternalPoseData from '@/components/OptitrackData';
import RobotSelector from '@/components/RobotSelector';
import RobotConfigStatus from '@/components/RobotConfigStatus';

export default function Homepage() {
  const rosContext = useContext(RosContext);

  if (!rosContext) {
    throw new Error('TopicsListPage must be used within a RosProvider');
  }

  const { connected, ros, rosIp, connectToRos } = rosContext;
  // const [topics, setTopics] = useState<string[]>([]);
  // const [error, setError] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState<string>(rosIp);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    success: boolean | null;
    message: string;
  } | null>(null);
  // --- MoveSpeed state lifted up ---
  const [moveSpeed, setMoveSpeed] = useState(0.5);
  const [sessionRestored, setSessionRestored] = useState(false);

  const ipFromUrl =
    typeof window !== 'undefined' ? window.location.hostname : null;

  useEffect(() => {
    if (!manualIp && ipFromUrl) {
      setManualIp(ipFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualIp]);

  // Check for restored session on mount
  useEffect(() => {
    const checkRestoredSession = () => {
      const savedSession = localStorage.getItem('experiment-control-session');
      const savedExperimentSession = localStorage.getItem('experiment-session');

      if (savedSession || savedExperimentSession) {
        setSessionRestored(true);
        setActionResult({
          success: true,
          message: 'Session restored after page refresh',
        });

        // Clear the restoration message after 3 seconds
        setTimeout(() => {
          setSessionRestored(false);
          setActionResult(null);
        }, 3000);
      }
    };

    checkRestoredSession();
  }, []); // Empty dependency array - only run on mount

  const handleManualConnect = () => {
    if (manualIp) {
      connectToRos(manualIp);
    }
  };

  const handleActionResult = (result: {
    success: boolean | null;
    message: string;
  }) => {
    setActionResult(result);
  };

  const handleSessionChange = (sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    if (sessionId && !sessionRestored) {
      setActionResult({
        success: true,
        message: `Experiment session started: ${sessionId}`,
      });
    } else if (!sessionId) {
      setActionResult({
        success: true,
        message: 'Experiment session ended',
      });
    }
  };

  return (
    <Container style={{ textAlign: 'center', padding: '20px' }}>
      {!connected && (
        <Box mb={2}>
          <Alert
            severity="error"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              style={{ textAlign: 'center' }}
            >
              Connection Error
            </Typography>
            <Typography variant="body2" style={{ textAlign: 'center' }}>
              Failed to connect to ROS2 WebSocket. Please enter the IP manually.
            </Typography>
          </Alert>
        </Box>
      )}
      {/* {error && (
        <Box mb={2}>
          <Alert severity="warning">
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </Box>
      )} */}
      {actionResult && (
        <Box mt={2}>
          <Alert
            severity={
              actionResult.success === null
                ? 'warning'
                : actionResult.success
                ? 'success'
                : 'error'
            }
          >
            <Typography variant="body2">{actionResult.message}</Typography>
          </Alert>
        </Box>
      )}
      {!connected && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <TextField
            label="ROS2 Bridge IP"
            variant="outlined"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            style={{ marginTop: '20px', marginBottom: '10px' }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualConnect}
          >
            Connect
          </Button>
        </Box>
      )}
      {connected && (
        <Grid container spacing={2}>
          <Grid size={12}>
            <RobotSelector />
            <RobotConfigStatus />
          </Grid>
          <Grid size={4}>
            <Typography variant="h4" gutterBottom>
              Robot Data
            </Typography>
            <TopicsList topics={[]} />
            <OdomData />
            {/* Only show external pose data if available */}
            <ExternalPoseData />
          </Grid>
          <Grid size={8}>
            {/* Current Session Indicator */}
            {currentSessionId && (
              <Box mb={2}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Active Session:</strong> {currentSessionId}
                  </Typography>
                </Alert>
              </Box>
            )}

            <CameraFeed />
            <ActionsPanel
              ros={ros}
              manualIp={manualIp}
              sessionId={currentSessionId}
              onActionResult={handleActionResult}
              onSessionChange={handleSessionChange}
              moveSpeed={moveSpeed}
              setMoveSpeed={setMoveSpeed}
            />
            <Box display="flex" justifyContent="center" mt={0}>
              <JoystickControl moveSpeed={moveSpeed} />
            </Box>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
