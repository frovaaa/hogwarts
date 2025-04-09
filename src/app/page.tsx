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
import ROSLIB from 'roslib';

export default function Homepage() {
  const rosContext = useContext(RosContext);

  if (!rosContext) {
    throw new Error('TopicsListPage must be used within a RosProvider');
  }

  const { connected, ros, rosIp, connectToRos } = rosContext;
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState<string>(rosIp);

  useEffect(() => {
    if (connected && ros) {
      const fetchTopics = () => {
        const topicsClient = new ROSLIB.Service({
          ros,
          name: '/rosapi/topics',
          serviceType: 'rosapi/Topics',
        });

        const request = new ROSLIB.ServiceRequest({});

        topicsClient.callService(request, (result) => {
          if (result && result.topics) {
            setTopics(result.topics);
            // Clear error if topics are successfully fetched
            setError(null);
          } else {
            setError('Failed to retrieve topics');
          }
        });
      };

      fetchTopics();
      const interval = setInterval(fetchTopics, 5000);

      return () => clearInterval(interval);
    }
  }, [connected, ros]);

  const handleManualConnect = () => {
    if (manualIp) {
      connectToRos(manualIp);
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
      {error && (
        <Box mb={2}>
          <Alert severity="warning">
            <Typography variant="body2">{error}</Typography>
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
          <Grid size={4}>
            <Typography variant="h4" gutterBottom>
              ROS2 Topics
            </Typography>
            <TopicsList topics={topics} />
            <OdomData ros={ros} />
          </Grid>
          <Grid size={8}>
            <CameraFeed ros={ros} />
            <ActionsPanel ros={ros} />
            <Box display="flex" justifyContent="center" mt={2}>
              <JoystickControl ros={ros} />
            </Box>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
