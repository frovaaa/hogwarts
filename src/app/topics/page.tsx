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
} from '@mui/material';

export default function TopicsList() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const rosbridgeUrl = `ws://${url.hostname}:9090`;

    const ros = new ROSLIB.Ros({
      url: rosbridgeUrl, // Connect to rosbridge
    });

    ros.on('connection', () => {
      console.log('Connected to ROS2 WebSocket');
      fetchTopics(ros);
    });

    ros.on('error', (err: unknown) => {
      console.error('ROS2 Connection Error:', err);
      setError('Failed to connect to ROS2 WebSocket');
      setLoading(false);
    });

    // Fetch topics every 5 seconds
    const interval = setInterval(() => fetchTopics(ros), 5000);

    // Cleanup on unmount
    return () => {
      ros.close();
      clearInterval(interval);
    };
  }, []);

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

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container style={{ textAlign: 'center', padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        ROS2 Topics
      </Typography>
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
