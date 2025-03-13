'use client';

import { useEffect, useState } from 'react';
import ROSLIB, { Ros } from 'roslib';

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

    return () => ros.close(); // Cleanup on unmount
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

  if (loading) return <p>Loading topics...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>ROS2 Topics</h1>
      <ul>
        {topics.map((topic, index) => (
          <li key={index}>{topic}</li>
        ))}
      </ul>
    </div>
  );
}
