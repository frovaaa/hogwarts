'use client';

import {
  Container,
  Typography,
  Alert,
  TextField,
  Button,
  Box,
  Grid,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Fab,
  Slider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

import { useContext, useEffect, useState } from 'react';
import { RosContext } from '@/context/RosContext';
import { JoystickControlPanel, CameraFeedPanel } from '@/components/panels';
import ActionsPanel, {
  type SectionVisibility,
} from '@/components/ActionsPanel';
import RobotSelector from '@/components/RobotSelector';

export default function Homepage() {
  const rosContext = useContext(RosContext);

  if (!rosContext) {
    throw new Error('TopicsListPage must be used within a RosProvider');
  }

  const { connected, ros, rosIp, connectToRos, robotConfig } = rosContext;
  const [manualIp, setManualIp] = useState<string>(rosIp);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    success: boolean | null;
    message: string;
  } | null>(null);
  // --- MoveSpeed state lifted up ---
  const [moveSpeed, setMoveSpeed] = useState(0.5);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Configure which sections of ActionsPanel to show
  const sectionVisibility: SectionVisibility = {
    showRobotPosition: false, // Hide TF position data by default
    showExperimentControl: true, // Always show experiment controls
    showLeds: true, // Show LED controls
    showGripper: true, // Show gripper controls
    showArm: true, // Show arm controls
    showFeedback: true, // Show feedback controls
    showMacroScenarios: false, // Hide macro scenarios by default
    showMovement: true, // Show movement controls
    showPanic: true, // Show panic button
    showSound: true, // Show sound controls
  };

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
            severity='error'
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography
              variant='h6'
              gutterBottom
              style={{ textAlign: 'center' }}
            >
              Connection Error
            </Typography>
            <Typography variant='body2' style={{ textAlign: 'center' }}>
              Failed to connect to ROS2 WebSocket. Please enter the IP manually.
            </Typography>
          </Alert>
        </Box>
      )}
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
            <Typography variant='body2'>{actionResult.message}</Typography>
          </Alert>
        </Box>
      )}
      {!connected && (
        <Box display='flex' flexDirection='column' alignItems='center'>
          <TextField
            label='ROS2 Bridge IP'
            variant='outlined'
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            style={{ marginTop: '20px', marginBottom: '10px' }}
          />
          <Button
            variant='contained'
            color='primary'
            onClick={handleManualConnect}
          >
            Connect
          </Button>
        </Box>
      )}
      {connected && (
        <>
          <Grid container spacing={2}>
            <Grid size={8}>
              {/* Current Session Indicator */}
              {currentSessionId && (
                <Box mb={2}>
                  <Alert severity='info'>
                    <Typography variant='body2'>
                      <strong>Active Session:</strong> {currentSessionId}
                    </Typography>
                  </Alert>
                </Box>
              )}

              {robotConfig.capabilities.hasCamera && (
                <Box>
                  <Box
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    mb={1}
                  >
                    <Typography variant='h6'>Camera Feed</Typography>
                    <IconButton
                      size='small'
                      onClick={() => setCameraVisible(!cameraVisible)}
                      title={cameraVisible ? 'Hide Camera' : 'Show Camera'}
                    >
                      {cameraVisible ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </Box>
                  {cameraVisible && <CameraFeedPanel />}
                </Box>
              )}
              <ActionsPanel
                ros={ros}
                manualIp={manualIp}
                sessionId={currentSessionId}
                onActionResult={handleActionResult}
                onSessionChange={handleSessionChange}
                sectionVisibility={sectionVisibility}
                moveSpeed={moveSpeed}
              />
              {robotConfig.capabilities.hasMovement && (
                <Box display='flex' flexDirection='column' alignItems='center'>
                  <JoystickControlPanel moveSpeed={moveSpeed} />
                  <Box
                    display='flex'
                    alignItems='center'
                    gap={2}
                    mt={2}
                    width='200px'
                  >
                    <Typography
                      variant='caption'
                      sx={{ minWidth: 'fit-content' }}
                    >
                      Speed:
                    </Typography>
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={moveSpeed}
                      onChange={(_, v) => setMoveSpeed(Number(v))}
                      valueLabelDisplay='auto'
                      valueLabelFormat={(value) =>
                        `${(value * 100).toFixed(0)}%`
                      }
                    />
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Floating Action Button */}
          <Fab
            color='primary'
            aria-label='settings'
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={() => setDrawerOpen(true)}
          >
            <SettingsIcon />
          </Fab>

          {/* Configuration Drawer */}
          <Drawer
            anchor='right'
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 400,
                maxWidth: '90vw',
              },
            }}
          >
            <AppBar position='static' elevation={0}>
              <Toolbar>
                <Typography variant='h6' sx={{ flexGrow: 1 }}>
                  Robot Configuration
                </Typography>
                <IconButton
                  edge='end'
                  color='inherit'
                  onClick={() => setDrawerOpen(false)}
                  aria-label='close'
                >
                  <CloseIcon />
                </IconButton>
              </Toolbar>
            </AppBar>
            <Box sx={{ p: 2 }}>
              <RobotSelector />
            </Box>
          </Drawer>
        </>
      )}
    </Container>
  );
}
