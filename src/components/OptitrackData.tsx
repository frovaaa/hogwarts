import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import ROSLIB from 'roslib';
import { useRosContext } from '../hooks/useRosContext';

export default function ExternalPoseData() {
  const { ros, robotConfig } = useRosContext();
  const [pose, setPose] = useState<string | null>(null);

  useEffect(() => {
    if (ros && robotConfig.topics.externalPose) {
      const poseListener = new ROSLIB.Topic({
        ros,
        name: robotConfig.topics.externalPose,
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
  }, [ros, robotConfig.topics.externalPose]);

  return (
    <Box mt={2}>
      <Typography variant="h6">External Pose Data</Typography>
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
        {pose || 'Waiting for external pose data...'}
      </Typography>
    </Box>
  );
}
