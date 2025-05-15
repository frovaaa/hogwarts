import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import ROSLIB, { Ros } from 'roslib';

interface OdomDataProps {
  ros: Ros | null;
}

export default function OdomData({ ros }: OdomDataProps) {
  const [odom, setOdom] = useState<string | null>(null);

  useEffect(() => {
    if (ros) {
      const odomListener = new ROSLIB.Topic({
        ros,
        name: '/robomaster/odom',
        messageType: 'nav_msgs/Odometry',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleOdomMessage = (message: any) => {
        const { position, orientation } = message.pose.pose;
        const formattedData = JSON.stringify(
          { position, orientation },
          null,
          2
        );
        setOdom(formattedData);
      };

      odomListener.subscribe(handleOdomMessage);

      return () => {
        odomListener.unsubscribe();
      };
    }
  }, [ros]);

  return (
    <Box mt={2}>
      <Typography variant="h6">Odometry Data</Typography>
      <Typography
        variant="body2"
        component="pre"
        style={{
          backgroundColor: '#f4f4f4',
          padding: '10px',
          borderRadius: '5px',
          overflowX: 'auto',
        }}
      >
        {odom || 'Waiting for odometry data...'}
      </Typography>
    </Box>
  );
}
