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
  moveSpeed: number;
  setMoveSpeed: (v: number) => void;
}

// Enum for arm poses
enum ArmPose {
  OPEN_BOX = 4,
  CLOSE_BOX = 2,
}

// Enum for gripper states
enum GripperState {
  OPEN = 1,
  CLOSE = 2,
}

// Enum for macro scenarios
export enum MacroScenario {
  SHARE_LEGO = 'share_lego',
  PASS_PIECE = 'pass_piece',
  ENCOURAGE_COLLAB = 'encourage_collab',
  PLAY_HAPPY_CHIME = 'play_happy_chime',
}

// Position interface and named positions
export interface Position {
  x: number;
  y: number;
  theta: number;
  label: string;
}

export const Positions: Record<string, Position> = {
  KID1: { x: 0.5, y: 0.5, theta: 0.0, label: 'kid1' },
  KID2: { x: 0.5, y: -0.5, theta: 0.0, label: 'kid2' },
  ORIGIN: { x: 0.0, y: 0.0, theta: 0.0, label: 'origin' },
};

export default function ActionsPanel({
  ros,
  manualIp,
  onActionResult,
  moveSpeed,
  setMoveSpeed,
}: ActionsPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gripperPower, setGripperPower] = useState(0.5);
  // --- New state for LED intensity and blink ---
  const [ledIntensity, setLedIntensity] = useState(1.0);
  const [ledBlinkTimes, setLedBlinkTimes] = useState(5);
  const [ledBlinkSpeed, setLedBlinkSpeed] = useState(100);
  // --- New state for feedback intensity ---
  const [feedbackLevel, setFeedbackLevel] = useState(1);

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
        success: result.result.success === true || result.status == 4,
        message:
          result.result.success || result.status == 4
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

  // Helper to move to any position
  const moveToPosition = async (pos: Position) => {
    const actionName = '/robomaster/move_robot_world_ref';
    const actionType = 'robomaster_hri_msgs/action/MoveRobotWorldRef';
    const goal = {
      x: pos.x,
      y: pos.y,
      theta: pos.theta,
      linear_speed: 1.5 * moveSpeed,
      angular_speed: 1.2,
      robot_world_ref_frame_name: 'world',
    };
    console.log(`Initiating move to ${pos.label}...`);
    onActionResult?.({ success: null, message: `Moving to ${pos.label}...` });
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

  // --- Sound Section ---
  const playCustomSound = (sound_id: number = 262) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot play sound.');
      return;
    }
    const soundTopic = new ROSLIB.Topic({
      ros,
      name: '/robomaster/cmd_sound',
      messageType: 'robomaster_msgs/msg/SpeakerCommand',
    });
    soundTopic.publish(
      new ROSLIB.Message({
        control: 1,
        sound_id,
        times: 1,
      })
    );
    setTimeout(() => {
      soundTopic.publish(
        new ROSLIB.Message({
          control: 0,
          sound_id,
        })
      );
    }, 500);
  };

  const moveArmPose = async (poseType: ArmPose) => {
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
  const handleGripper = async (targetState: GripperState) => {
    const actionName = '/robomaster/gripper';
    const actionType = 'robomaster_msgs/action/GripperControl';
    const goal = {
      target_state: targetState,
      power: gripperPower,
    };
    await callGenericAction(actionName, actionType, goal);
  };

  const happyChimeSong = async () => {
    playCustomSound(263);
    setTimeout(() => playCustomSound(264), 200);
    setTimeout(() => playCustomSound(265), 300);
    setTimeout(() => playCustomSound(262), 400);
    setTimeout(() => playCustomSound(263), 500);
    setTimeout(() => playCustomSound(264), 600);
    setTimeout(() => playCustomSound(265), 700);
  };

  // --- Macro scenario actions ---
  const handleMacro = async (macro: MacroScenario) => {
    switch (macro) {
      case MacroScenario.SHARE_LEGO:
        await moveArmPose(ArmPose.OPEN_BOX);
        playCustomSound(262);
        break;
      case MacroScenario.PASS_PIECE:
        await moveArmPose(ArmPose.CLOSE_BOX);
        await moveToPosition(Positions.KID2);
        await moveArmPose(ArmPose.OPEN_BOX);
        break;
      case MacroScenario.ENCOURAGE_COLLAB:
        ledFeedback('good', 8, 80);
        rotateOnSpot(2, 2.5);
        playCustomSound(262);
        break;
      case MacroScenario.PLAY_HAPPY_CHIME:
        // Blink green LED
        ledFeedback('good', 4, 120);
        // Play happy chime
        happyChimeSong();
        break;
      default:
        break;
    }
  };

  // --- Feedback with intensity ---
  const handlePositiveFeedback = () => {
    // Level 1: green blink, Level 2: green blink + sound, Level 3: green blink + sound + spin
    if (feedbackLevel === 1) {
      ledFeedback('good', 4, 120);
    } else if (feedbackLevel === 2) {
      ledFeedback('good', 6, 80);
      for (let i = 0; i < 3; i++)
        setTimeout(() => playCustomSound(262), i * 600);
    } else {
      ledFeedback('good', 8, 60);
      // for (let i = 0; i < 3; i++)
      //   setTimeout(() => playCustomSound(262), i * 600);
      happyChimeSong();

      rotateOnSpot(2, 2.5);
    }
  };
  const moveBack = (distance = -0.2, duration = 300) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot move back.');
      return;
    }
    const cmdVelTopic = new ROSLIB.Topic({
      ros,
      name: '/robomaster/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    });
    const twist = new ROSLIB.Message({
      linear: { x: distance, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 },
    });
    cmdVelTopic.publish(twist);
    setTimeout(() => {
      const stopTwist = new ROSLIB.Message({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
      });
      cmdVelTopic.publish(stopTwist);
    }, duration);
  };
  const handleNegativeFeedback = () => {
    // Level 1: red blink, Level 2: red blink + back, Level 3: red blink + more back
    if (feedbackLevel === 1) {
      ledFeedback('bad', 2, 120);
    } else if (feedbackLevel === 2) {
      ledFeedback('bad', 4, 80);
      moveBack();
    } else {
      ledFeedback('bad', 6, 60);
      moveBack(-0.4, 500); // Go further back and for longer
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
          <Button
            variant="outlined"
            onClick={() => handleGripper(GripperState.OPEN)}
          >
            Open Gripper
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleGripper(GripperState.CLOSE)}
          >
            Close Gripper
          </Button>
        </Stack>
      </Box>
      {/* Arm/Box Section */}
      <Box minWidth={200}>
        <Typography variant="h6">Arm / Box</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button
            variant="outlined"
            onClick={() => moveArmPose(ArmPose.OPEN_BOX)}
          >
            Open Box
          </Button>
          <Button
            variant="outlined"
            onClick={() => moveArmPose(ArmPose.CLOSE_BOX)}
          >
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
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.SHARE_LEGO)}
          >
            Share LEGO
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.PASS_PIECE)}
          >
            Pass Piece to Other Child
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.ENCOURAGE_COLLAB)}
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
          <Button
            variant="outlined"
            onClick={() => moveToPosition(Positions.KID1)}
          >
            Go to Kid 1
          </Button>
          <Button
            variant="outlined"
            onClick={() => moveToPosition(Positions.KID2)}
          >
            Go to Kid 2
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => moveToPosition(Positions.ORIGIN)}
          >
            Go to Origin
          </Button>
          <Typography variant="caption">Speed</Typography>
          <Slider
            min={0.1}
            max={1}
            step={0.05}
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
      {/* Sound Section */}
      <Box minWidth={180}>
        <Typography variant="h6">Sounds</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => playCustomSound(262)}>
            Beep
          </Button>
          <Button variant="outlined" onClick={() => playCustomSound(263)}>
            Chime
          </Button>
          <Button variant="outlined" onClick={() => playCustomSound(264)}>
            Melody
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.PLAY_HAPPY_CHIME)}
          >
            Happy Chime
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
