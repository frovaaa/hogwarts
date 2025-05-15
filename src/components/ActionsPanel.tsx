import { Box, Button } from '@mui/material';
import ROSLIB from 'roslib';
import { useState } from 'react';

interface ActionsPanelProps {
  ros: ROSLIB.Ros | null; // Updated to use ROSLIB.Ros type and allow null
  manualIp: string; // Added manualIp to props
  onActionResult?: (result: {
    success: boolean | null;
    message: string;
  }) => void; // Added callback for action result
}

export default function ActionsPanel({
  ros,
  manualIp,
  onActionResult,
}: ActionsPanelProps) {
  const [isActionInProgress, setIsActionInProgress] = useState(false);

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

  const callGenericAction = async (
    actionName: string,
    actionType: string,
    goal: Record<string, unknown>
  ) => {
    console.log(
      `Calling generic action: ${actionName}, Type: ${actionType}, Goal:`,
      goal
    );
    setIsActionInProgress(true); // Disable buttons
    // onActionResult?.({ success: null, message: `Executing ${actionName}...` }); // Notify intermediate state
    try {
      const response = await fetch(`http://${manualIp}:4000/generic-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionName,
          actionType,
          goal,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error calling action ${actionName} (${actionType}). Status: ${response.status}`,
          errorText
        );
        onActionResult?.({
          success: false,
          message: `Failed to execute ${actionName}.`,
        }); // Notify failure
        return;
      }

      const result = await response.json();
      console.log(`Result from action ${actionName} (${actionType}):`, result);
      onActionResult?.({
        success: true,
        message: `${actionName} executed successfully.`,
      }); // Notify success
    } catch (err) {
      console.error(
        `API call error for action ${actionName} (${actionType}):`,
        err
      );
      onActionResult?.({
        success: false,
        message: `Error executing ${actionName}.`,
      }); // Notify failure
    } finally {
      setIsActionInProgress(false); // Re-enable buttons
    }
  };

  // const callMoveApi = async () => {
  //   const actionName = '/robomaster/move_robot_world_ref';
  //   const actionType = 'robomaster_hri_msgs/action/MoveRobotWorldRef';
  //   const goal = {
  //     x: 0.0,
  //     y: 0.0,
  //     theta: Math.PI / 2,
  //     linear_speed: 0.001,
  //     angular_speed: 1.2,
  //     robot_world_ref_frame_name: '/optitrack/robomaster_frova',
  //   };
  //   await callGenericAction(actionName, actionType, goal);
  // };

  const moveToKid = async (kid: 'kid1' | 'kid2') => {
    const actionName = '/robomaster/move_robot_world_ref';
    const actionType = 'robomaster_hri_msgs/action/MoveRobotWorldRef';

    const positions = {
      kid1: { x: 0.5, y: 1.0, theta: 0.0 },
      kid2: { x: 0.5, y: -1.0, theta: 0.0 },
    };

    if (!positions[kid]) {
      console.error('Invalid kid identifier');
      return;
    }

    const { x, y, theta } = positions[kid];
    const goal = {
      x,
      y,
      theta,
      linear_speed: 1.5,
      angular_speed: 1.2,
      robot_world_ref_frame_name: 'world',
    };
    console.log(`Initiating move to ${kid}...`);
    // Notify intermediate state
    onActionResult?.({ success: null, message: `Moving to ${kid}...` });
    await callGenericAction(actionName, actionType, goal);
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
      }, 100); // 500ms interval
    };

    if (behavior === 'good') {
      console.log('Marking good behavior...');
      blinkLed(0.0, 1.0, 0.0, 5); // Green LED blinks 5 times
    } else if (behavior === 'bad') {
      console.log('Marking bad behavior...');
      blinkLed(1.0, 0.0, 0.0, 5); // Red LED blinks 5 times
    }
  };

  const rotateOnSpot = (cycles: number, angularSpeed: number) => {
    if (!ros) {
      console.error(
        'ROS connection is not available. Cannot rotate on the spot.'
      );
      return;
    }

    console.log(`Rotating on the spot for ${cycles} cycles…`);
    const cmdVelTopic = new ROSLIB.Topic({
      ros,
      name: '/robomaster/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    });

    const phaseDir = [+1, -1, +1]; // direction of each phase
    const phaseTicks = [1, 2, 1]; // how many 500 ms ticks each phase lasts
    const ticksPerCycle = phaseTicks.reduce((a, b) => a + b, 0);

    let tick = 0;
    const interval = setInterval(() => {
      if (tick >= cycles * ticksPerCycle) {
        clearInterval(interval);
        cmdVelTopic.publish(
          new ROSLIB.Message({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          })
        );
        console.log('Rotation completed.');
        return;
      }

      // Which phase are we in?
      let phase = 0;
      let ticksIntoCycle = tick % ticksPerCycle;
      while (ticksIntoCycle >= phaseTicks[phase]) {
        ticksIntoCycle -= phaseTicks[phase];
        phase++;
      }

      const dir = phaseDir[phase];
      cmdVelTopic.publish(
        new ROSLIB.Message({
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: dir * angularSpeed },
        })
      );
      tick++;
    }, 200);
  };

  const moveToOrigin = async () => {
    const actionName = '/robomaster/move_robot_world_ref';
    const actionType = 'robomaster_hri_msgs/action/MoveRobotWorldRef';
    const goal = {
      x: 0.0,
      y: 0.0,
      theta: 0.0,
      linear_speed: 1.5,
      angular_speed: 1.2,
      robot_world_ref_frame_name: 'world',
    };
    console.log('Initiating move to origin...');
    onActionResult?.({ success: null, message: `Moving to origin...` });
    await callGenericAction(actionName, actionType, goal);
  };

  return (
    <>
      <Box mt={2} mb={5} display="flex" justifyContent="center" gap={2}>
        {/* <Button
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
      </Button> */}
        {/* <Button variant="contained" color="primary" onClick={callMoveApi}>
        Test Navigation
      </Button> */}
        <Button
          variant="contained"
          color="primary"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={() => moveToKid('kid1')}
          disabled={isActionInProgress} // Disable if action is in progress
        >
          Go to Kid 1
        </Button>
        <Button
          variant="contained"
          color="primary"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={() => moveToKid('kid2')}
          disabled={isActionInProgress} // Disable if action is in progress
        >
          Go to Kid 2
        </Button>
        <Button
          variant="contained"
          color="warning"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={moveToOrigin}
          disabled={isActionInProgress} // Disable if action is in progress
        >
          Go to Origin
        </Button>
      </Box>
      <Box mt={0} display="flex" justifyContent="center" gap={2}>
        {/* <Button
          variant="contained"
          color="success"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={() => markBehavior('good')}
        >
          Mark Good Behavior
        </Button> */}
        <Button
          variant="contained"
          color="error"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={() => markBehavior('bad')}
        >
          Mark Bad Behavior
        </Button>
        <Button
          variant="contained"
          color="error"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={() => rotateOnSpot(3, 2.5)} // Rotate 5 cycles with angular speed 1.0
          disabled={isActionInProgress} // Disable if action is in progress
        >
          HEADSHAKE Bad BEHAVIOR
        </Button>
      </Box>
    </>
  );
}
