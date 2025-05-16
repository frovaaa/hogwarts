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
        success: result.result.success === true,
        message: result.result.success
          ? `${actionName} executed successfully.`
          : `Failed to execute ${actionName}.`,
      }); // Notify success or failure based on result.success
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
      kid1: { x: 0.5, y: 0.5, theta: 0.0 },
      kid2: { x: 0.5, y: -0.5, theta: 0.0 },
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

  const ledFeedback = async (
    behavior: 'good' | 'bad',
    times: number = 5, // Default to 5 times if not specified
    speed: number = 100 // Default to 100ms interval if not specified
  ) => {
    const blinkLed = (
      r: number,
      g: number,
      b: number,
      times: number,
      speed: number
    ) => {
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
      }, speed); // Parametric interval
    };

    if (behavior === 'good') {
      console.log(
        `Marking good behavior with ${times} blinks at ${speed}ms speed...`
      );
      blinkLed(0.0, 1.0, 0.0, times, speed); // Green LED blinks specified times
    } else if (behavior === 'bad') {
      console.log(
        `Marking bad behavior with ${times} blinks at ${speed}ms speed...`
      );
      blinkLed(1.0, 0.0, 0.0, times, speed); // Red LED blinks specified times
    }
  };

  const rotateOnSpot = (cycles: number, angularSpeed: number) => {
    if (!ros) {
      console.error(
        'ROS connection is not available. Cannot rotate on the spot.'
      );
      return;
    }

    setIsActionInProgress(true); // Disable buttons

    console.log(`Rotating on the spot for ${cycles} cycles…`);
    const cmdVelTopic = new ROSLIB.Topic({
      ros,
      name: '/robomaster/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    });

    const phaseDir = [+1, -1, +1]; // Direction for each phase
    const phaseTicks = [1, 2, 1]; // Tick duration (each 200ms) for each phase
    const ticksPerCycle = phaseTicks.reduce((a, b) => a + b, 0);
    const totalTicks = cycles * ticksPerCycle;

    let tick = 0;
    const interval = setInterval(() => {
      // Determine which phase we're in
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

      // Stop immediately after the final tick
      if (tick === totalTicks - 1) {
        setTimeout(() => {
          cmdVelTopic.publish(
            new ROSLIB.Message({
              linear: { x: 0, y: 0, z: 0 },
              angular: { x: 0, y: 0, z: 0 },
            })
          );
          console.log('Rotation completed and robot stopped.');
          setIsActionInProgress(false); // Re-enable buttons
        }, 200); // buffer to ensure the last movement gets sent first

        clearInterval(interval);
      }

      tick++;
    }, 200); // 200ms per tick
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

  const playSound = () => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot play sound.');
      return;
    }

    console.log('Playing sound...');
    const soundTopic = new ROSLIB.Topic({
      ros,
      name: '/robomaster/cmd_sound',
      messageType: 'robomaster_msgs/msg/SpeakerCommand',
    });

    // Function to play and stop sound
    const playAndStopSound = (times: number) => {
      if (times <= 0) return;

      // Publish the "start sound" message
      soundTopic.publish(
        new ROSLIB.Message({
          control: 1,
          sound_id: 262,
          times: 1,
        })
      );

      // Delay and publish the "stop sound" message
      setTimeout(() => {
        soundTopic.publish(
          new ROSLIB.Message({
            control: 0,
            sound_id: 262,
          })
        );

        // Recursively play and stop sound again
        setTimeout(() => playAndStopSound(times - 1), 100);
      }, 500);
    };

    // Play and stop sound twice
    playAndStopSound(2);
  };

  const markBadBehaviorWithAllActions = () => {
    console.log('Executing all actions for marking bad behavior...');
    ledFeedback('bad', 8, 100); // Blink red LEDs
    playSound(); // Play sound
    rotateOnSpot(2, 3.0); // Perform headshake
  };

  const moveArmPose = async (poseType: number) => {
    const actionName = '/robomaster/move_arm_pose';
    const actionType = 'robomaster_hri_msgs/action/MoveArmPose';
    const goal = { pose_type: poseType };

    await callGenericAction(actionName, actionType, goal);
  };

  const publishPanicSignal = () => {
    if (ros) {
      console.log('Publishing panic signal to /robomaster/panic 5 times');
      const panicPublisher = new ROSLIB.Topic({
        ros,
        name: '/robomaster/panic',
        messageType: 'std_msgs/Empty',
      });

      const msg = new ROSLIB.Message({});
      let count = 0;

      const interval = setInterval(() => {
        if (count >= 5) {
          clearInterval(interval);
          console.log('Panic signal published 5 times.');
          return;
        }
        panicPublisher.publish(msg);
        console.log(`Panic signal published (${count + 1}/5).`);
        count++;
      }, 100); // Publish every 100ms
    } else {
      console.error(
        'ROS connection is not available. Cannot publish panic signal.'
      );
    }
  };

  return (
    <>
      <Box mt={2} mb={5} display="flex" justifyContent="center" gap={2}>
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
        <Button
          variant="contained"
          color="error"
          style={{
            fontSize: '1.5rem',
            height: '10rem',
          }}
          onClick={markBadBehaviorWithAllActions}
          disabled={isActionInProgress} // Disable if action is in progress
        >
          Mark Bad Behavior
        </Button>
      </Box>
      <Box mt={2} display="flex" justifyContent="center" gap={2}>
        <Button
          variant="contained"
          color="primary"
          style={{ fontSize: '1.5rem', height: '10rem' }}
          onClick={() => moveArmPose(2)}
        >
          Move Arm | Close Box
        </Button>
        <Button
          variant="contained"
          color="primary"
          style={{ fontSize: '1.5rem', height: '10rem' }}
          onClick={() => moveArmPose(4)}
        >
          Move Arm | Open Box
        </Button>
      </Box>
      <Box mt={2} display="flex" justifyContent="center" gap={2}>
        <Button
          variant="contained"
          color="error"
          style={{ fontSize: '1.5rem', height: '10rem' }}
          onClick={publishPanicSignal}
        >
          Panic Button
        </Button>
      </Box>
    </>
  );
}
