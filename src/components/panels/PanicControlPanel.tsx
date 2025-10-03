'use client';

import { Box, Button, Typography, Divider, Stack } from '@mui/material';
import ROSLIB from 'roslib';
import { useRosContext } from '../../hooks/useRosContext';

interface PanicControlPanelProps {
  ros: ROSLIB.Ros | null;
  logSystemEvent: (eventType: string, data: any) => void;
}

export default function PanicControlPanel({
  ros,
  logSystemEvent,
}: PanicControlPanelProps) {
  const { robotConfig } = useRosContext();

  const publishPanicSignal = () => {
    if (ros) {
      // Log the panic event
      logSystemEvent('panic_signal', {
        immediate_stop: true,
        timestamp: Date.now(),
      });

      console.log('PANIC: Publishing immediate stop and panic signal');

      // 1. IMMEDIATE SAFETY: Send stop commands to cmd_vel
      if (robotConfig.topics.cmdVel) {
        const cmdVelTopic = new ROSLIB.Topic({
          ros,
          name: robotConfig.topics.cmdVel,
          messageType: 'geometry_msgs/msg/Twist',
        });

        const stopMsg = new ROSLIB.Message({
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: 0 },
        });

        // Send stop commands repeatedly for immediate safety
        for (let i = 0; i < 10; i++) {
          setTimeout(() => cmdVelTopic.publish(stopMsg), i * 50);
        }
      }

      // 2. SEMANTIC PANIC: Send panic message for custom robot logic (5 times for reliability)
      if (robotConfig.topics.panic) {
        const panicPublisher = new ROSLIB.Topic({
          ros,
          name: robotConfig.topics.panic,
          messageType: 'std_msgs/String',
        });

        const panicMsg = new ROSLIB.Message({
          data: JSON.stringify({
            action: 'panic',
            reason: 'user_initiated',
            timestamp: Date.now(),
            immediate_stop: true
          })
        });

        // Send 5 panic messages with 100ms intervals for reliability
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            panicPublisher.publish(panicMsg);
            console.log(`Panic signal sent to robot handler (${i + 1}/5)`);
          }, i * 100);
        }
      } else {
        console.warn('Robot does not support semantic panic signal');
      }
    } else {
      console.error(
        'ROS connection is not available. Cannot publish panic signal.'
      );
    }
  };

  if (!robotConfig.capabilities.hasPanic || !robotConfig.topics.panic) {
    return null;
  }

  return (
    <Box minWidth={120}>
      <Typography variant='h6'>Other</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button
          variant='contained'
          color='error'
          onClick={publishPanicSignal}
          size='large'
          style={{ height: 200 }}
        >
          Panic
        </Button>
      </Stack>
    </Box>
  );
}
