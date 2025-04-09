import { Box, Button } from '@mui/material';
import ROSLIB from 'roslib';

interface ActionsPanelProps {
  ros: any; // Keeping the prop for compatibility, but it's unused now
}

export default function ActionsPanel({ ros }: ActionsPanelProps) {
  const publishLedColor = (r: number, g: number, b: number) => {
    if (ros) {
      const ledColorPublisher = new ROSLIB.Topic({
        ros,
        name: '/robomaster/leds/color',
        messageType: 'std_msgs/ColorRGBA',
      });

      const msg = new ROSLIB.Message({
        r,
        g,
        b,
        a: 1.0, // full intensity
      });

      ledColorPublisher.publish(msg);
    }
  };

  const callMoveApi = async () => {
    try {
      const response = await fetch('http://localhost:4000/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: 0.1,
          y: 0.0,
          theta: 0.0,
          linear_speed: 0.5,
          angular_speed: 0.5,
          robot_world_ref_frame_name: '/robomaster/odom',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error:', error);
        return;
      }

      const result = await response.json();
      console.log('Result:', result);
    } catch (err) {
      console.error('API call error:', err);
    }
  };

  return (
    <Box mt={2} display="flex" justifyContent="center" gap={2}>
      <Button
        variant="contained"
        color="error"
        onClick={() => publishLedColor(1.0, 0.0, 0.0)}
      >
        Red LED
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={() => publishLedColor(0.0, 1.0, 0.0)}
      >
        Green LED
      </Button>
      <Button
        variant="contained"
        color="info"
        onClick={() => publishLedColor(0.0, 0.0, 1.0)}
      >
        Blue LED
      </Button>
      <Button variant="contained" color="primary" onClick={callMoveApi}>
        Test Navigation
      </Button>
    </Box>
  );
}
