'use client';

import { useEffect, useState } from 'react';
import ROSLIB, { Ros } from 'roslib';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Button,
} from '@mui/material';
import JoystickControl from '@/components/JoystickControl';

export default function TopicsList() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ros, setRos] = useState<Ros | null>(null);
  const [manualIp, setManualIp] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const rosbridgeUrl = `ws://${url.hostname}:9090`;

      connectToRos(rosbridgeUrl);
    }
  }, []);

  const connectToRos = (rosbridgeUrl: string) => {
    const rosInstance = new ROSLIB.Ros({
      url: rosbridgeUrl, // Connect to rosbridge
    });

    rosInstance.on('connection', () => {
      console.log('Connected to ROS2 WebSocket');
      setRos(rosInstance);
      setConnected(true);
      fetchTopics(rosInstance);
    });

    rosInstance.on('error', (err: unknown) => {
      console.error('ROS2 Connection Error:', err);
      setError('Failed to connect to ROS2 WebSocket. Please enter the IP manually.');
      setLoading(false);
    });

    // Fetch topics every 5 seconds
    const interval = setInterval(() => fetchTopics(rosInstance), 5000);

    // Cleanup on unmount
    return () => {
      rosInstance.close();
      clearInterval(interval);
    };
  };

  const fetchTopics = (ros: Ros) => {
    const topicsClient = new ROSLIB.Service({
      ros: ros,
      name: '/rosapi/topics',
      serviceType: 'rosapi/Topics',
    });

    const request = new ROSLIB.ServiceRequest({});

    topicsClient.callService(request, (result) => {
      if (result && result.topics) {
        setTopics(result.topics);
      } else {
        setError('Failed to retrieve topics');
      }
      setLoading(false);
    });
  };

  const handleManualConnect = () => {
    if (manualIp) {
      const rosbridgeUrl = `ws://${manualIp}:9090`;
      setError(''); // Clear previous errors
      setLoading(true);
      connectToRos(rosbridgeUrl);
    }
  };

  if (loading) return <CircularProgress />;
  if (!connected && error) {
    return (
      <Container style={{ textAlign: 'center', padding: '20px' }}>
        <Alert severity="error">{error}</Alert>
        <TextField
          label="ROS2 Bridge IP"
          variant="outlined"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          style={{ marginTop: '20px', marginBottom: '10px' }}
        />
        <Button variant="contained" color="primary" onClick={handleManualConnect}>
          Connect
        </Button>
      </Container>
    );
  }

  return (
    <Container style={{ textAlign: 'center', padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        ROS2 Topics
      </Typography>
      <JoystickControl ros={ros} />
      <List component={Paper}>
        {topics.map((topic, index) => (
          <ListItem key={index}>
            <ListItemText primary={topic} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}