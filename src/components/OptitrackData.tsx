import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import ROSLIB, { Ros } from 'roslib';

interface PoseDataProps {
  ros: Ros | null;
}

export default function PoseData({ ros }: PoseDataProps) {
  const [pose, setPose] = useState<string | null>(null);

  useEffect(() => {
    if (ros) {
      const poseListener = new ROSLIB.Topic({
        ros,
        name: '/optitrack/robomaster_frova',
        messageType: 'geometry_msgs/PoseStamped',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlePoseMessage = (message: any) => {
        const trimmedMessage = {
          header: message.header,
          pose: {
            position: {
              x: parseFloat(message.pose.position.x.toFixed(3)),
              y: parseFloat(message.pose.position.y.toFixed(3)),
              z: parseFloat(message.pose.position.z.toFixed(3)),
            },
            orientation: {
              x: parseFloat(message.pose.orientation.x.toFixed(3)),
              y: parseFloat(message.pose.orientation.y.toFixed(3)),
              z: parseFloat(message.pose.orientation.z.toFixed(3)),
              w: parseFloat(message.pose.orientation.w.toFixed(3)),
            },
          },
        };
        setPose(JSON.stringify(trimmedMessage, null, 2));
      };

      poseListener.subscribe(handlePoseMessage);

      return () => {
        poseListener.unsubscribe();
      };
    }
  }, [ros]);

  return (
    <Box mt={2}>
      <Typography variant="h6">Pose Data</Typography>
      <Typography
        variant="body2"
        component="pre"
        style={{
          backgroundColor: '#f4f4f4',
          padding: '10px',
          borderRadius: '5px',
          overflowX: 'auto',
          width: '15rem',
        }}
      >
        {pose || 'Waiting for pose data...'}
      </Typography>
    </Box>
  );
}
