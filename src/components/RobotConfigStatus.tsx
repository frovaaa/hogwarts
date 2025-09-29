import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useRosContext } from '../hooks/useRosContext';

export default function RobotConfigStatus() {
  const { robotConfig, connected } = useRosContext();

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        🤖 Robot Configuration Status
      </Typography>
      
      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>
          Current Robot: <strong>{robotConfig.displayName}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {robotConfig.description}
        </Typography>
        
        <Box mt={1}>
          <Chip 
            label={connected ? "ROS Connected" : "ROS Disconnected"} 
            color={connected ? "success" : "error"} 
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />
      
      <Typography variant="subtitle2" gutterBottom>
        Active Topics:
      </Typography>
      <List dense>
        <ListItem>
          <ListItemText 
            primary="Velocity Command"
            secondary={robotConfig.topics.cmdVel}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Odometry"
            secondary={robotConfig.topics.odom}
          />
        </ListItem>
        {robotConfig.topics.rgbCamera && (
          <ListItem>
            <ListItemText 
              primary="RGB Camera"
              secondary={robotConfig.topics.rgbCamera}
            />
          </ListItem>
        )}
        {robotConfig.topics.depthCamera && (
          <ListItem>
            <ListItemText 
              primary="Depth Camera"
              secondary={robotConfig.topics.depthCamera}
            />
          </ListItem>
        )}
        {robotConfig.topics.leds && (
          <ListItem>
            <ListItemText 
              primary="LED Control"
              secondary={robotConfig.topics.leds}
            />
          </ListItem>
        )}
        {robotConfig.topics.sound && (
          <ListItem>
            <ListItemText 
              primary="Sound Control"
              secondary={robotConfig.topics.sound}
            />
          </ListItem>
        )}
        {robotConfig.topics.laser && (
          <ListItem>
            <ListItemText 
              primary="Laser Scanner"
              secondary={robotConfig.topics.laser}
            />
          </ListItem>
        )}
        {robotConfig.topics.imu && (
          <ListItem>
            <ListItemText 
              primary="IMU"
              secondary={robotConfig.topics.imu}
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
}