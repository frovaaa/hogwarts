import { Box, Button } from '@mui/material';
import ROSLIB from 'roslib';

interface ActionsPanelProps {
  ros: any; // Keeping the prop for compatibility, but it's unused now
}

export default function ActionsPanel({ ros }: ActionsPanelProps) {
  const publishLedColor = (
    r: number,
    g: number,
    b: number,
    a: number = 1.0
  ) => {
    if (ros) {
      console.log(`Publishing LED color: r=${r}, g=${g}, b=${b}, a=${a}`);
      const ledColorPublisher = new ROSLIB.Topic({
        ros,
        name: '/robomaster/leds/color',
        messageType: 'std_msgs/ColorRGBA',
      });

      const msg = new ROSLIB.Message({
        r,
        g,
        b,
        a, // Intensity (1.0 for full intensity, 0.0 to turn off)
      });

      ledColorPublisher.publish(msg);
      console.log('LED color message published.');
    } else {
      console.error(
        'ROS connection is not available. Cannot publish LED color.'
      );
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
          x: 0.0,
          y: 0.0,
          theta: Math.PI / 2,
          linear_speed: 0.001,
          angular_speed: 1.2,
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

  const moveToKid = async (kid: 'kid1' | 'kid2') => {
    try {
      const response = await fetch('http://localhost:4000/move-to-kid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kid }),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Read the response as text
        console.error('Error:', errorText);
        return;
      }

      const result = await response.json();
      console.log(`Moved to ${kid}:`, result);
    } catch (err) {
      console.error('API call error:', err);
    }
  };

  const markBehavior = async (behavior: 'good' | 'bad') => {
    const blinkLed = (r: number, g: number, b: number, times: number) => {
      let count = 0;
      const interval = setInterval(() => {
        if (count >= times * 2) {
          clearInterval(interval);
          return;
        }
        if (count % 2 === 0) {
          publishLedColor(r, g, b); // Turn on
        } else {
          publishLedColor(0.0, 0.0, 0.0, 0.0); // Turn off
        }
        count++;
      }, 500); // 500ms interval
    };

    if (behavior === 'good') {
      console.log('Marking good behavior...');
      blinkLed(0.0, 1.0, 0.0, 3); // Green LED blinks 3 times
    } else if (behavior === 'bad') {
      console.log('Marking bad behavior...');
      blinkLed(1.0, 0.0, 0.0, 3); // Red LED blinks 3 times
    }
  };

  const moveToOrigin = async () => {
    try {
      const response = await fetch('http://localhost:4000/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: 0.0,
          y: 0.0,
          theta: 0.0,
          linear_speed: 1.5,
          angular_speed: 1.2,
          robot_world_ref_frame_name: '/robomaster/odom',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error:', error);
        return;
      }

      const result = await response.json();
      console.log('Moved to origin:', result);
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
      <Button
        variant="contained"
        color="secondary"
        onClick={() => publishLedColor(0.0, 0.0, 0.0, 0.0)}
      >
        Turn Off LEDs
      </Button>
      <Button variant="contained" color="primary" onClick={callMoveApi}>
        Test Navigation
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={() => moveToKid('kid1')}
      >
        Go to Kid 1
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={() => moveToKid('kid2')}
      >
        Go to Kid 2
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={() => markBehavior('good')}
      >
        Mark Good Behavior
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={() => markBehavior('bad')}
      >
        Mark Bad Behavior
      </Button>
      <Button variant="contained" color="warning" onClick={moveToOrigin}>
        Go to Origin
      </Button>
    </Box>
  );
}
