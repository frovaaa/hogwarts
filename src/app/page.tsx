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
// import CameraFeed from '@/components/CameraFeed';
// import TopicsList from '@/components/TopicsList';
import ActionsPanel from '@/components/ActionsPanel';
// import OdomData from '@/components/OdomData';
// import OptitrackData from '@/components/OptitrackData';
// import OdomData from '@/components/OdomData';
// import ROSLIB from 'roslib';

export default function Homepage() {
  const rosContext = useContext(RosContext);

  if (!rosContext) {
    throw new Error('TopicsListPage must be used within a RosProvider');
  }

  const { connected, ros, rosIp, connectToRos } = rosContext;
  // const [topics, setTopics] = useState<string[]>([]);
  // const [error, setError] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState<string>(rosIp);
  const [actionResult, setActionResult] = useState<{
    success: boolean | null;
    message: string;
  } | null>(null);
  // --- MoveSpeed state lifted up ---
  const [moveSpeed, setMoveSpeed] = useState(0.5);

  const ipFromUrl =
    typeof window !== 'undefined' ? window.location.hostname : null;

  useEffect(() => {
    if (!manualIp && ipFromUrl) {
      setManualIp(ipFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualIp]);

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
          {/* <Grid size={4}>
            <Typography variant="h4" gutterBottom>
              ROS2 Topics
            </Typography>
            <TopicsList topics={topics} />
            <OdomData ros={ros} />
          </Grid> */}
          {/* <OptitrackData ros={ros} /> */}
          <Grid size={12}>
            {/* <CameraFeed ros={ros} /> */}
            <ActionsPanel
              ros={ros}
              manualIp={manualIp}
              onActionResult={handleActionResult}
              moveSpeed={moveSpeed}
              setMoveSpeed={setMoveSpeed}
            />
            <Box display="flex" justifyContent="center" mt={0}>
              <JoystickControl ros={ros} moveSpeed={moveSpeed} />
            </Box>
            {/* <OdomData ros={ros} /> */}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
