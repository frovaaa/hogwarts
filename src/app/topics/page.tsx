'use client';

import { useEffect, useState } from 'react';
import ROSLIB, { Ros, Topic } from 'roslib';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextareaAutosize,
} from '@mui/material';

export default function TopicsList() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicOutput, setTopicOutput] = useState('');

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

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic);
    setTopicOutput(''); // Clear previous output

    const ros = new ROSLIB.Ros({
      url: `ws://${window.location.hostname}:9090`,
    });

    const rosTopic = new ROSLIB.Topic({
      ros: ros,
      name: topic,
      messageType: 'std_msgs/String', // Adjust message type as needed
    });

    rosTopic.subscribe((message) => {
      setTopicOutput((prevOutput) => `${prevOutput}\n${JSON.stringify(message)}`);
    });

    return () => rosTopic.unsubscribe();
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
          <ListItem component="li" button key={index} onClick={() => handleTopicClick(topic)}>
            <ListItemText primary={topic} />
          </ListItem>
        ))}
      </List>
      {selectedTopic && (
        <Paper style={{ marginTop: '20px', padding: '10px' }}>
          <Typography variant="h6">{selectedTopic} Output</Typography>
          <TextareaAutosize
            minRows={10}
            value={topicOutput}
            style={{ width: '100%', marginTop: '10px' }}
            readOnly
          />
        </Paper>
      )}
    </Container>
  );
}
