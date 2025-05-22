import { Box, Button, Typography, Divider, Slider, Stack } from '@mui/material';
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
  // --- New state for LED intensity and blink ---
  const [ledIntensity, setLedIntensity] = useState(1.0);
  const [ledBlinkTimes, setLedBlinkTimes] = useState(5);
  const [ledBlinkSpeed, setLedBlinkSpeed] = useState(100);
  // --- New state for feedback intensity ---
  const [feedbackLevel, setFeedbackLevel] = useState(1);
  // --- New state for movement speed ---
  const [moveSpeed, setMoveSpeed] = useState(1.5);

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

  // --- Gripper control ---
  const handleGripper = async (open: boolean) => {
    const actionName = '/robomaster/gripper_action';
    const actionType = 'robomaster_hri_msgs/action/GripperAction';
    const goal = { open };
    await callGenericAction(actionName, actionType, goal);
  };

  // --- Macro scenario actions ---
  const handleMacro = async (macro: string) => {
    if (macro === 'share_lego') {
      // Example: open box, play sound, move arm, etc.
      await moveArmPose(4); // Open box
      playSound();
    } else if (macro === 'pass_piece') {
      await moveArmPose(2); // Close box
      await moveToKid('kid2');
      await moveArmPose(4); // Open box
    } else if (macro === 'encourage_collab') {
      ledFeedback('good', 8, 80);
      rotateOnSpot(2, 2.5);
      playSound();
    }
  };

  // --- Feedback with intensity ---
  const handlePositiveFeedback = () => {
    // Level 1: green blink, Level 2: green blink + sound, Level 3: green blink + sound + spin
    if (feedbackLevel === 1) {
      ledFeedback('good', 4, 120);
    } else if (feedbackLevel === 2) {
      ledFeedback('good', 6, 80);
      playSound();
    } else {
      ledFeedback('good', 8, 60);
      playSound();
      rotateOnSpot(2, 2.5);
    }
  };
  const handleNegativeFeedback = () => {
    // Level 1: red blink, Level 2: red blink + stop, Level 3: red blink + move away
    if (feedbackLevel === 1) {
      ledFeedback('bad', 2, 120);
    } else if (feedbackLevel === 2) {
      ledFeedback('bad', 4, 80);
      moveToOrigin();
    } else {
      ledFeedback('bad', 6, 60);
      moveToOrigin();
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="row"
      gap={4}
      justifyContent="center"
      alignItems="flex-start"
      mt={2}
    >
      {/* LEDs Section */}
      <Box minWidth={220}>
        <Typography variant="h6">LEDs</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(1, 0, 0, ledIntensity)}
          >
            Red
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(0, 1, 0, ledIntensity)}
          >
            Green
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(0, 0, 1, ledIntensity)}
          >
            Blue
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(0, 0, 0, 0)}
          >
            Off
          </Button>
          <Button
            variant="outlined"
            onClick={() => ledFeedback('good', ledBlinkTimes, ledBlinkSpeed)}
          >
            Blink Green
          </Button>
          <Button
            variant="outlined"
            onClick={() => ledFeedback('bad', ledBlinkTimes, ledBlinkSpeed)}
          >
            Blink Red
          </Button>
          <Typography variant="caption">Intensity</Typography>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={ledIntensity}
            onChange={(_, v) => setLedIntensity(Number(v))}
          />
          <Typography variant="caption">Blink Times</Typography>
          <Slider
            min={1}
            max={10}
            step={1}
            value={ledBlinkTimes}
            onChange={(_, v) => setLedBlinkTimes(Number(v))}
          />
          <Typography variant="caption">Blink Speed (ms)</Typography>
          <Slider
            min={50}
            max={500}
            step={10}
            value={ledBlinkSpeed}
            onChange={(_, v) => setLedBlinkSpeed(Number(v))}
          />
        </Stack>
      </Box>
      {/* Gripper Section */}
      <Box minWidth={180}>
        <Typography variant="h6">Gripper</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => handleGripper(true)}>
            Open Gripper
          </Button>
          <Button variant="outlined" onClick={() => handleGripper(false)}>
            Close Gripper
          </Button>
        </Stack>
      </Box>
      {/* Arm/Box Section */}
      <Box minWidth={200}>
        <Typography variant="h6">Arm / Box</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => moveArmPose(4)}>
            Open Box
          </Button>
          <Button variant="outlined" onClick={() => moveArmPose(2)}>
            Close Box
          </Button>
        </Stack>
      </Box>
      {/* Feedback Section */}
      <Box minWidth={220}>
        <Typography variant="h6">Feedback</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button
            variant="contained"
            color="success"
            onClick={handlePositiveFeedback}
          >
            Positive Feedback
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleNegativeFeedback}
          >
            Negative Feedback
          </Button>
          <Typography variant="caption">Feedback Intensity</Typography>
          <Slider
            min={1}
            max={3}
            step={1}
            value={feedbackLevel}
            onChange={(_, v) => setFeedbackLevel(Number(v))}
            marks={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
            ]}
          />
        </Stack>
      </Box>
      {/* Macro Scenarios Section */}
      <Box minWidth={220}>
        <Typography variant="h6">Macro Scenarios</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => handleMacro('share_lego')}>
            Share LEGO
          </Button>
          <Button variant="outlined" onClick={() => handleMacro('pass_piece')}>
            Pass Piece to Other Child
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro('encourage_collab')}
          >
            Encourage Collaboration
          </Button>
        </Stack>
      </Box>
      {/* Movement Section */}
      <Box minWidth={200}>
        <Typography variant="h6">Movement</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => moveToKid('kid1')}>
            Go to Kid 1
          </Button>
          <Button variant="outlined" onClick={() => moveToKid('kid2')}>
            Go to Kid 2
          </Button>
          <Button variant="outlined" color="warning" onClick={moveToOrigin}>
            Go to Origin
          </Button>
          <Typography variant="caption">Speed</Typography>
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={moveSpeed}
            onChange={(_, v) => setMoveSpeed(Number(v))}
          />
        </Stack>
      </Box>
      {/* Panic Button Section */}
      <Box minWidth={120}>
        <Typography variant="h6">Other</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button
            variant="contained"
            color="error"
            onClick={publishPanicSignal}
          >
            Panic
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
