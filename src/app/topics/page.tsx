"use client";

import { useEffect, useState, useRef } from "react";
import ROSLIB, { Ros } from "roslib";
import nipplejs from "nipplejs";
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Box,
} from "@mui/material";

export default function TopicsList() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rosRef = useRef<Ros | null>(null);
  const cmdVelRef = useRef<ROSLIB.Topic | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const rosbridgeUrl = `ws://${url.hostname}:9090`;

    const ros = new ROSLIB.Ros({
      url: rosbridgeUrl,
    });

    ros.on("connection", () => {
      console.log("Connected to ROS2 WebSocket");
      fetchTopics(ros);
    });

    ros.on("error", (err: unknown) => {
      console.error("ROS2 Connection Error:", err);
      setError("Failed to connect to ROS2 WebSocket");
      setLoading(false);
    });

    rosRef.current = ros;

    cmdVelRef.current = new ROSLIB.Topic({
      ros,
      name: "/cmd_vel",
      messageType: "geometry_msgs/Twist",
    });

    const interval = setInterval(() => fetchTopics(ros), 5000);

    return () => {
      ros.close();
      clearInterval(interval);
    };
  }, []);

  const fetchTopics = (ros: Ros) => {
    const topicsClient = new ROSLIB.Service({
      ros,
      name: "/rosapi/topics",
      serviceType: "rosapi/Topics",
    });

    const request = new ROSLIB.ServiceRequest({});

    topicsClient.callService(request, (result) => {
      if (result && result.topics) {
        setTopics(result.topics);
      } else {
        setError("Failed to retrieve topics");
      }
      setLoading(false);
    });
  };

  // Initialize Joystick
  useEffect(() => {
    if (!joystickRef.current || !cmdVelRef.current) return;

    const manager = nipplejs.create({
      zone: joystickRef.current,
      mode: "dynamic",
      color: "blue",
      size: 100,
    });

    manager.on("move", (_, data) => {
      if (!cmdVelRef.current) return;

      const x = data.vector.y * 0.5; // Forward/backward speed
      const z = -data.vector.x * 1.0; // Left/right rotation

      const twist = new ROSLIB.Message({
        linear: { x, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z },
      });

      cmdVelRef.current.publish(twist);
    });

    manager.on("end", () => {
      if (!cmdVelRef.current) return;

      const stopTwist = new ROSLIB.Message({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
      });

      cmdVelRef.current.publish(stopTwist);
    });

    return () => manager.destroy();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container style={{ textAlign: "center", padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        ROS2 Topics & Robot Control
      </Typography>

      <Box
        ref={joystickRef}
        sx={{
          width: "200px",
          height: "200px",
          margin: "auto",
          backgroundColor: "#f0f0f0",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <Typography variant="body1">Joystick</Typography>
      </Box>

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