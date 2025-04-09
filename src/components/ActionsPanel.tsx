import { Box, Button } from '@mui/material';
import ROSLIB from 'roslib';

interface ActionsPanelProps {
  ros: ROSLIB.Ros | null;
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
        color="primary"
        onClick={() => {
          if (ros) {
            // const test = new ROSLIB.Action

            const actionClient = new ROSLIB.ActionClient({
              ros,
              serverName: '/robomaster/move_robot_world_ref',
              actionName: 'robomaster_hri_msgs/action/MoveRobotWorldRef',
            });

            const goal = new ROSLIB.Goal({
              actionClient,
              goalMessage: {
                x: 1.0,
                y: 1.0,
                theta: 0.0,
                linear_speed: 0.5,
                angular_speed: 0.5,
                robot_world_ref_frame_name: '/odom',
              },
            });

            goal.on('feedback', (feedback) => {
              console.log('Feedback:', feedback);
            });

            goal.on('result', (result) => {
              console.log('Result:', result);
            });

            goal.send();
          }
        }}
      >
        Test Navigation
      </Button>
    </Box>
  );
}
