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
} from '@mui/material';
import JoystickControl from '@/components/JoystickControl';
import CameraFeed from '@/components/CameraFeed';
import TopicsList from '@/components/TopicsList';
import ROSLIB from 'roslib';

export default function TopicsListPage() {
  const rosContext = useContext(RosContext);

  if (!rosContext) {
    throw new Error("TopicsListPage must be used within a RosProvider");
  }

  const { connected, ros, rosIp, setRosIp, connectToRos } = rosContext;
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
            setError(null); // Clear error if topics are successfully fetched
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
    if (rosIp) {
      connectToRos(`ws://${rosIp}:9090`);
    }
  };

  return (
    <Container style={{ textAlign: 'center', padding: '20px' }}>
      {!connected && (
        <Box mb={2}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Connection Error
            </Typography>
            <Typography variant="body2">
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
        <>
          <TextField
            label="ROS2 Bridge IP"
            variant="outlined"
            value={rosIp}
            onChange={(e) => setRosIp(e.target.value)}
            style={{ marginTop: '20px', marginBottom: '10px' }}
          />
          <Button variant="contained" color="primary" onClick={handleManualConnect}>
            Connect
          </Button>
        </>
      )}
      {connected && (
        <>
          <Typography variant="h4" gutterBottom>
            ROS2 Topics
          </Typography>
          <JoystickControl ros={ros} />
          <CameraFeed ros={ros} />
          <TopicsList topics={topics} />
        </>
      )}
    </Container>
  );
}