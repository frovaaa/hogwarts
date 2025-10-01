"use client";

import {
  Box,
  Typography,
  Divider,
  Stack,
  Card,
  CardContent,
} from "@mui/material";

interface TFData {
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timestamp: number;
}

interface RobotPositionPanelProps {
  tfConnected: boolean;
  tfData: TFData | null;
  rosConnected: boolean;
}

export default function RobotPositionPanel({ 
  tfConnected, 
  tfData, 
  rosConnected 
}: RobotPositionPanelProps) {
  // Helper function to convert quaternion to euler angles (for display)
  const quaternionToEuler = (q: {
    x: number;
    y: number;
    z: number;
    w: number;
  }) => {
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch =
      Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return {
      roll: (roll * 180) / Math.PI,
      pitch: (pitch * 180) / Math.PI,
      yaw: (yaw * 180) / Math.PI,
    };
  };

  return (
    <Box minWidth={240}>
      <Typography variant="h6">Robot Position (TF)</Typography>
      <Divider sx={{ mb: 1 }} />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ padding: 1 }}>
          {tfConnected && tfData ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="success.main">
                ✓ Connected to /tf
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Frame: robomaster/base_link → robomaster/odom
              </Typography>
              <Typography variant="body2">
                <strong>Position:</strong>
              </Typography>
              <Typography variant="caption" component="div">
                X: {tfData.position.x.toFixed(3)} m
              </Typography>
              <Typography variant="caption" component="div">
                Y: {tfData.position.y.toFixed(3)} m
              </Typography>
              <Typography variant="caption" component="div">
                Z: {tfData.position.z.toFixed(3)} m
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Orientation (RPY):</strong>
              </Typography>
              {(() => {
                const euler = quaternionToEuler(tfData.orientation);
                return (
                  <>
                    <Typography variant="caption" component="div">
                      Roll: {euler.roll.toFixed(1)}°
                    </Typography>
                    <Typography variant="caption" component="div">
                      Pitch: {euler.pitch.toFixed(1)}°
                    </Typography>
                    <Typography variant="caption" component="div">
                      Yaw: {euler.yaw.toFixed(1)}°
                    </Typography>
                  </>
                );
              })()}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Last update:{" "}
                {new Date(tfData.timestamp).toLocaleTimeString()}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1} alignItems="center">
              <Typography variant="caption" color="error.main">
                ✗ No TF data
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Waiting for /tf messages...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ROS Connected: {rosConnected ? "✓" : "✗"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem" }}
              >
                Looking for: robomaster/base_link
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}