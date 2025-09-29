import {
  Box,
  Button,
  Typography,
  Divider,
  Slider,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import ROSLIB from 'roslib';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useExperimentLogger } from '../hooks/useExperimentLogger';
import { useRosContext } from '../hooks/useRosContext';
import ExperimentControl from './ExperimentControl';

export interface SectionVisibility {
  showRobotPosition?: boolean;
  showExperimentControl?: boolean;
  showLeds?: boolean;
  showGripper?: boolean;
  showArm?: boolean;
  showFeedback?: boolean;
  showMacroScenarios?: boolean;
  showMovement?: boolean;
  showPanic?: boolean;
  showSound?: boolean;
}

interface ActionsPanelProps {
  ros: ROSLIB.Ros | null; // Updated to use ROSLIB.Ros type and allow null
  manualIp: string; // Added manualIp to props
  sessionId?: string | null; // Added sessionId for experiment logging
  onActionResult?: (result: {
    success: boolean | null;
    message: string;
  }) => void; // Added callback for action result
  onSessionChange?: (sessionId: string | null) => void; // Added callback for session changes
  moveSpeed: number;
  setMoveSpeed: (v: number) => void;
  sectionVisibility?: SectionVisibility; // Configuration for which sections to show
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
  PASS_PIECE_KID1 = 'pass_piece_kid1',
  PASS_PIECE_KID2 = 'pass_piece_kid2',
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

// Interface for TF data
interface TFData {
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timestamp: number;
}

// Interface for integrated position tracking
interface IntegratedPosition {
  x: number;
  y: number;
  theta: number; // yaw angle in radians
  timestamp: number;
}

export const Positions: Record<string, Position> = {
  KID1: { x: 0.5, y: 0.5, theta: 0.0, label: 'kid1' },
  KID2: { x: 0.5, y: -0.5, theta: 0.0, label: 'kid2' },
  ORIGIN: { x: 0.0, y: 0.0, theta: 0.0, label: 'origin' },
};

export default function ActionsPanel({
  ros,
  manualIp,
  sessionId,
  onActionResult,
  onSessionChange,
  moveSpeed,
  setMoveSpeed,
  sectionVisibility = {},
}: ActionsPanelProps) {
  const { robotConfig } = useRosContext();

  // Extract section visibility with defaults
  const {
    showRobotPosition = false,
    showExperimentControl = true,
    showLeds = true,
    showGripper = true,
    showArm = true,
    showFeedback = true,
    showMacroScenarios = false,
    showMovement = true,
    showPanic = true,
    showSound = true,
  } = sectionVisibility;
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
  // --- New state for TF monitoring ---
  const [tfData, setTfData] = useState<TFData | null>(null);
  const [tfConnected, setTfConnected] = useState(false);
  const tfConnectedRef = useRef(false); // Track if we've already set tfConnected
  // --- New state for integrated position tracking ---
  const integratedPositionRef = useRef<IntegratedPosition>({
    x: 0,
    y: 0,
    theta: 0,
    timestamp: Date.now(),
  });
  const [, setCmdVelSubscribed] = useState(false);
  const lastOdomPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  // Initialize experiment logger with session ID
  const {
    logMovementEvent,
    logArmEvent,
    logLedEvent,
    logSoundEvent,
    logGripperEvent,
    logMacroEvent,
    logSystemEvent,
    exportLogsAsJsonl,
    saveAllLogsToServer,
    clearLogs,
  } = useExperimentLogger(ros, sessionId, manualIp);

  // Memoized session change handler to prevent unnecessary re-renders
  const handleSessionChange = useCallback(
    (sessionId: string | null) => {
      // Clear logs when starting a new session
      if (sessionId) {
        clearLogs();
      }
      // Pass the session change up to the parent component
      onSessionChange?.(sessionId);
    },
    [clearLogs, onSessionChange]
  );

  // TF listener effect
  useEffect(() => {
    if (!ros) {
      console.log('ROS connection is null/undefined');
      setTfConnected(false);
      return;
    }

    console.log('Setting up TF subscription, ROS connected:', ros.isConnected);

    // Subscribe directly to /tf topic instead of using TFClient
    const tfTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/tf',
      messageType: 'tf2_msgs/TFMessage',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tfTopic.subscribe((message: any) => {
      // ...existing code...
      // Look for the robomaster/base_link transform
      if (message.transforms && Array.isArray(message.transforms)) {
        const baseLinkTransform = message.transforms.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (transform: any) =>
            transform.child_frame_id === 'robomaster/base_link' &&
            transform.header.frame_id === 'robomaster/odom'
        );

        if (baseLinkTransform) {
          setTfData({
            position: {
              x: baseLinkTransform.transform.translation.x,
              y: baseLinkTransform.transform.translation.y,
              z: baseLinkTransform.transform.translation.z,
            },
            orientation: {
              x: baseLinkTransform.transform.rotation.x,
              y: baseLinkTransform.transform.rotation.y,
              z: baseLinkTransform.transform.rotation.z,
              w: baseLinkTransform.transform.rotation.w,
            },
            timestamp: Date.now(),
          });
          if (!tfConnectedRef.current) {
            setTfConnected(true);
            tfConnectedRef.current = true;
          }
        }
      }
    });

    // Cleanup function
    return () => {
      if (tfTopic) {
        tfTopic.unsubscribe();
        console.log('TF subscription cleaned up');
      }
      // Reset connection state when cleaning up
      setTfConnected(false);
      tfConnectedRef.current = false;
    };
  }, [ros]);

  // Integrated position tracking effect - subscribes to cmd_vel to track rotations
  useEffect(() => {
    if (!ros) {
      setCmdVelSubscribed(false);
      return;
    }

    console.log('Setting up cmd_vel subscription for position integration');

    // Subscribe to cmd_vel to track intended movements
    const cmdVelTopic = new ROSLIB.Topic({
      ros: ros,
      name: robotConfig.topics.cmdVel,
      messageType: 'geometry_msgs/msg/Twist',
    });

    let lastCmdTime = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cmdVelTopic.subscribe((message: any) => {
      const currentTime = Date.now();
      const dt = (currentTime - lastCmdTime) / 1000; // Convert to seconds
      lastCmdTime = currentTime;

      if (dt > 0.5) return; // Ignore large time gaps

      const linearX = message.linear.x || 0;
      const linearY = message.linear.y || 0;
      const angularZ = message.angular.z || 0;

      // Update integrated position using ref instead of state to avoid re-renders
      const prev = integratedPositionRef.current;

      // Update orientation first
      const newTheta = prev.theta + angularZ * dt;

      // Update position based on current orientation
      const deltaX =
        (linearX * Math.cos(prev.theta) - linearY * Math.sin(prev.theta)) * dt;
      const deltaY =
        (linearX * Math.sin(prev.theta) + linearY * Math.cos(prev.theta)) * dt;

      integratedPositionRef.current = {
        x: prev.x + deltaX,
        y: prev.y + deltaY,
        theta: newTheta,
        timestamp: currentTime,
      };
    });

    setCmdVelSubscribed(true);

    // Cleanup function
    return () => {
      if (cmdVelTopic) {
        cmdVelTopic.unsubscribe();
        console.log('cmd_vel subscription cleaned up');
      }
    };
  }, [ros]);

  // Reset integrated position when odometry position changes significantly (like when using navigation actions)
  useEffect(() => {
    if (tfData && tfData.position) {
      const currentOdom = { x: tfData.position.x, y: tfData.position.y };

      if (lastOdomPositionRef.current) {
        const dx = currentOdom.x - lastOdomPositionRef.current.x;
        const dy = currentOdom.y - lastOdomPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If robot moved significantly via navigation (not manual cmd_vel), reset integrated position
        if (distance > 0.1) {
          console.log(
            'Large odometry change detected, resetting integrated position'
          );
          integratedPositionRef.current = {
            x: currentOdom.x,
            y: currentOdom.y,
            theta: integratedPositionRef.current.theta, // Keep the integrated orientation
            timestamp: Date.now(),
          };
        }
      }

      lastOdomPositionRef.current = currentOdom;
    }
  }, [tfData]);

  // Helper function to convert quaternion to euler angles (for display)
  const quaternionToEuler = (q: {
    x: number;
    y: number;
    z: number;
    w: number;
  }) => {
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch =
      Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return {
      roll: (roll * 180) / Math.PI,
      pitch: (pitch * 180) / Math.PI,
      yaw: (yaw * 180) / Math.PI,
    };
  };

  const publishLedColor = (
    r: number,
    g: number,
    b: number,
    intensity: number = 1.0
  ) => {
    if (ros) {
      // Scale RGB by intensity, alpha always 1.0
      const scaledR = r * intensity;
      const scaledG = g * intensity;
      const scaledB = b * intensity;
      const msg = new ROSLIB.Message({
        r: scaledR,
        g: scaledG,
        b: scaledB,
        a: 1.0,
      });
      if (!robotConfig.capabilities.hasLeds || !robotConfig.topics.leds) {
        console.warn('Robot does not support LEDs');
        return;
      }
      const ledColorPublisher = new ROSLIB.Topic({
        ros,
        name: robotConfig.topics.leds,
        messageType: 'std_msgs/ColorRGBA',
      });
      ledColorPublisher.publish(msg);
      console.log(
        `Publishing LED color: r=${scaledR}, g=${scaledG}, b=${scaledB}, a=1.0`
      );

      // Log the event
      logLedEvent('set_color', {
        r: scaledR,
        g: scaledG,
        b: scaledB,
        intensity: intensity,
        color_name: getColorName(r, g, b),
      });
    } else {
      console.error(
        'ROS connection is not available. Cannot publish LED color.'
      );
    }
  };

  // Helper function to get color name for logging
  const getColorName = (r: number, g: number, b: number): string => {
    if (r === 1 && g === 0 && b === 0) return 'red';
    if (r === 0 && g === 1 && b === 0) return 'green';
    if (r === 0 && g === 0 && b === 1) return 'blue';
    if (r === 1 && g === 0.2 && b === 0) return 'orange';
    if (r === 0.21 && g === 0.27 && b === 0.31) return 'gray';
    if (r === 1 && g === 1 && b === 1) return 'white';
    if (r === 1 && g === 1 && b === 0) return 'yellow';
    if (r === 0 && g === 0 && b === 0) return 'off';
    return `custom_rgb(${r},${g},${b})`;
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

    // Log the generic action before execution
    const actionCategory = getActionCategory(actionName);
    const eventLogger = getEventLogger(actionCategory);
    eventLogger('generic_action', {
      action_name: actionName,
      action_type: actionType,
      goal: goal,
    });

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

        // Log the failure
        eventLogger('generic_action_failed', {
          action_name: actionName,
          action_type: actionType,
          goal: goal,
          error: errorText,
          status: response.status,
        });
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

      // Log the success/failure result
      eventLogger('generic_action_completed', {
        action_name: actionName,
        action_type: actionType,
        goal: goal,
        result: result,
        success: result.result.success === true || result.status == 4,
      });
    } catch (err) {
      console.error(
        `API call error for action ${actionName} (${actionType}):`,
        err
      );
      onActionResult?.({
        success: false,
        message: `Error executing ${actionName}.`,
      }); // Notify failure

      // Log the error
      eventLogger('generic_action_error', {
        action_name: actionName,
        action_type: actionType,
        goal: goal,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsActionInProgress(false); // Re-enable buttons
    }
  };

  // Helper to determine action category for logging
  const getActionCategory = (actionName: string): string => {
    if (actionName.includes('sound')) return 'sound';
    if (actionName.includes('led')) return 'led';
    if (actionName.includes('gripper')) return 'gripper';
    if (actionName.includes('arm')) return 'arm';
    if (actionName.includes('move_robot') || actionName.includes('move'))
      return 'movement';
    return 'system';
  };

  // Helper to get the right event logger based on category
  const getEventLogger = (category: string) => {
    switch (category) {
      case 'movement':
        return logMovementEvent;
      case 'arm':
        return logArmEvent;
      case 'gripper':
        return logGripperEvent;
      case 'led':
        return logLedEvent;
      case 'sound':
        return logSoundEvent;
      default:
        return logSystemEvent;
    }
  };

  // Helper to move to any position
  const moveToPosition = async (pos: Position) => {
    if (!robotConfig.topics.moveRobotAction) {
      console.warn('Robot does not support move robot action');
      return;
    }
    const actionName = robotConfig.topics.moveRobotAction;
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
    // Log the LED feedback event
    logLedEvent('feedback_blink', {
      behavior: behavior,
      times: times,
      speed: speed,
      intensity: ledIntensity,
    });

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
          publishLedColor(r, g, b, ledIntensity); // Turn on with intensity
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
      console.error('ROS not available');
      return;
    }

    setIsActionInProgress(true);
    logMovementEvent('rotate_on_spot', { cycles, angular_speed: angularSpeed });

    const cmdVelTopic = new ROSLIB.Topic({
      ros,
      name: robotConfig.topics.cmdVel,
      messageType: 'geometry_msgs/msg/Twist',
    });

    // ---- timing from movementParams (fallbacks keep it generic) ----
    const rateHz = robotConfig.movementParams.wiggleRateHz ?? 30;
    const dtMs = Math.max(10, Math.round(1000 / rateHz));

    const phase1Sec = robotConfig.movementParams.wigglePhase1 ?? 0.25; // +
    const phase2Sec = robotConfig.movementParams.wigglePhase2 ?? 0.50; // -
    const phase3Sec = robotConfig.movementParams.wigglePhase3 ?? 0.25; // +

    // Convert to ticks (ensure >=1)
    const n1 = Math.max(1, Math.round(phase1Sec * rateHz));
    const n2 = Math.max(1, Math.round(phase2Sec * rateHz));
    const n3 = Math.max(1, Math.round(phase3Sec * rateHz));

    const ticksPerCycle = n1 + n2 + n3;
    const totalTicks = Math.max(1, Math.floor(cycles) * ticksPerCycle);

    // ---- magnitudes: middle scaled so (+M)*n1 + (-αM)*n2 + (+M)*n3 = 0 ----
    const alpha = (n1 + n3) / n2; // how much bigger the right turn must be
    const maxW = robotConfig.movementParams.maxAngularSpeed ?? 1.0;
    const req = Math.abs(angularSpeed);
    const M = Math.min(req, maxW / Math.max(1, alpha)); // keep within limits

    // constant per-phase velocities (no ramps)
    const wzP = +M;           // left
    const wzN = -alpha * M;   // right (bigger magnitude), ensures return to center

    let tick = 0;
    const h = setInterval(() => {
      const t = tick % ticksPerCycle;

      let wz = 0;
      if (t < n1) {
        wz = wzP;                 // phase 1: left
      } else if (t < n1 + n2) {
        wz = wzN;                 // phase 2: right (bigger)
      } else {
        wz = wzP;                 // phase 3: short left back to center
      }

      cmdVelTopic.publish(new ROSLIB.Message({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: wz },
      }));

      tick++;
      if (tick >= totalTicks) {
        clearInterval(h);
        // stop cleanly at the very end
        cmdVelTopic.publish(new ROSLIB.Message({
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: 0 },
        }));
        setIsActionInProgress(false);
      }
    }, dtMs);
  };

  // --- Sound Section ---
  const playCustomSound = (sound_id: number = 262) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot play sound.');
      return;
    }

    // Log the sound event
    logSoundEvent('play_sound', {
      sound_id: sound_id,
      sound_name: getSoundName(sound_id),
    });

    if (!robotConfig.capabilities.hasSound || !robotConfig.topics.sound) {
      console.warn('Robot does not support sound');
      return;
    }
    const soundTopic = new ROSLIB.Topic({
      ros,
      name: robotConfig.topics.sound,
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

  // Helper function to get sound name for logging
  const getSoundName = (soundId: number): string => {
    switch (soundId) {
      case 262:
        return 'beep';
      case 263:
        return 'chime';
      case 264:
        return 'melody';
      case 265:
        return 'note';
      default:
        return `custom_sound_${soundId}`;
    }
  };

  const moveArmPose = async (poseType: ArmPose) => {
    if (!robotConfig.capabilities.hasArm || !robotConfig.topics.moveArmAction) {
      console.warn('Robot does not support arm control');
      return;
    }
    const actionName = robotConfig.topics.moveArmAction;
    const actionType = 'robomaster_hri_msgs/action/MoveArmPose';
    const goal = { pose_type: poseType };

    await callGenericAction(actionName, actionType, goal);
  };

  const publishPanicSignal = () => {
    if (ros) {
      // Log the panic event
      logSystemEvent('panic_signal', {
        repeat_count: 5,
        interval_ms: 100,
      });

      if (!robotConfig.topics.panic) {
        console.warn('Robot does not support panic signal');
        return;
      }
      console.log(`Publishing panic signal to ${robotConfig.topics.panic} 5 times`);
      const panicPublisher = new ROSLIB.Topic({
        ros,
        name: robotConfig.topics.panic,
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
    if (!robotConfig.capabilities.hasArm || !robotConfig.topics.gripperAction) {
      console.warn('Robot does not support gripper control');
      return;
    }
    const actionName = robotConfig.topics.gripperAction;
    const actionType = 'robomaster_msgs/action/GripperControl';
    const goal = {
      target_state: targetState,
      power: gripperPower,
    };
    await callGenericAction(actionName, actionType, goal);
  };

  const happyChimeSong = async () => {
    // Log the complex sound event
    logSoundEvent('happy_chime_sequence', {
      sequence: [263, 264, 265, 262, 263, 264, 265],
      timing: 'sequential with delays',
    });

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
    // Log the macro event
    logMacroEvent('execute_macro', {
      macro_name: macro,
      macro_type: macro,
    });

    switch (macro) {
      case MacroScenario.SHARE_LEGO:
        await moveArmPose(ArmPose.OPEN_BOX);
        playCustomSound(262);
        break;
      case MacroScenario.PASS_PIECE_KID1:
        await moveArmPose(ArmPose.CLOSE_BOX);
        await moveToPosition(Positions.KID1);
        await moveArmPose(ArmPose.OPEN_BOX);
        break;
      case MacroScenario.PASS_PIECE_KID2:
        await moveArmPose(ArmPose.CLOSE_BOX);
        await moveToPosition(Positions.KID2);
        await moveArmPose(ArmPose.OPEN_BOX);
        break;
      case MacroScenario.ENCOURAGE_COLLAB:
        ledFeedback('good', 8, 80);
        rotateOnSpot(2, robotConfig.movementParams.rotationSpeed);
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
    // Log the positive feedback event
    logSystemEvent('positive_feedback', {
      feedback_level: feedbackLevel,
      actions_triggered: getFeedbackActions(feedbackLevel, 'positive'),
    });

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

      rotateOnSpot(2, robotConfig.movementParams.rotationSpeed);
    }
  };
  const moveBack = (
    distance = robotConfig.movementParams.backwardDistance,   // e.g., -0.1 m
    speed = Math.min(Math.abs(robotConfig.movementParams.maxLinearSpeed || 0.3), 0.3) // cap to something safe
  ) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot move back.');
      return;
    }

    // Ensure speed is positive; we’ll set the sign via direction
    const v = Math.max(0.05, Math.abs(speed)); // at least 5 cm/s so it’s visible
    const dir = distance < 0 ? -1 : 1;
    const durationMs = Math.max(50, Math.round((Math.abs(distance) / v) * 1000));
    const periodMs = 100; // 10 Hz
    const ticks = Math.ceil(durationMs / periodMs);

    logMovementEvent('move_backward', { distance, speed: dir * v, duration_ms: durationMs });

    const cmdVelTopic = new ROSLIB.Topic({
      ros,
      name: robotConfig.topics.cmdVel,
      messageType: 'geometry_msgs/msg/Twist',
    });

    let sent = 0;
    const interval = setInterval(() => {
      cmdVelTopic.publish(
        new ROSLIB.Message({
          linear: { x: dir * v, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: 0 },
        })
      );
      sent++;

      if (sent >= ticks) {
        clearInterval(interval);
        // Send a stop to satisfy the watchdog and avoid drift
        cmdVelTopic.publish(
          new ROSLIB.Message({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          })
        );
      }
    }, periodMs);
  };

  const handleNegativeFeedback = () => {
    // Log the negative feedback event
    logSystemEvent('negative_feedback', {
      feedback_level: feedbackLevel,
      actions_triggered: getFeedbackActions(feedbackLevel, 'negative'),
    });

    // Level 1: red blink, Level 2: red blink + back, Level 3: red blink + more back
    if (feedbackLevel === 1) {
      ledFeedback('bad', 2, 120);
    } else if (feedbackLevel === 2) {
      ledFeedback('bad', 4, 80);
      moveBack();
    } else {
      ledFeedback('bad', 6, 60);
      moveBack(robotConfig.movementParams.backwardDistance * 2);
    }
  };

  // Helper function to describe feedback actions
  const getFeedbackActions = (
    level: number,
    type: 'positive' | 'negative'
  ): string[] => {
    if (type === 'positive') {
      switch (level) {
        case 1:
          return ['led_blink_green_4x'];
        case 2:
          return ['led_blink_green_6x', 'sound_beep_3x'];
        case 3:
          return [
            'led_blink_green_8x',
            'happy_chime_sequence',
            'rotate_2_cycles',
          ];
        default:
          return ['unknown'];
      }
    } else {
      switch (level) {
        case 1:
          return ['led_blink_red_2x'];
        case 2:
          return ['led_blink_red_4x', 'move_back_0.2m'];
        case 3:
          return ['led_blink_red_6x', 'move_back_0.4m'];
        default:
          return ['unknown'];
      }
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
      {/* Robot Position/TF Section */}
      {showRobotPosition && <Box minWidth={240}>
        <Typography variant="h6">Robot Position (TF)</Typography>
        <Divider sx={{ mb: 1 }} />
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ padding: 1 }}>
            {tfConnected && tfData ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="success.main">
                  ✓ Connected to /tf
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Frame: robomaster/base_link → robomaster/odom
                </Typography>
                <Typography variant="body2">
                  <strong>Position:</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  X: {tfData.position.x.toFixed(3)} m
                </Typography>
                <Typography variant="caption" component="div">
                  Y: {tfData.position.y.toFixed(3)} m
                </Typography>
                <Typography variant="caption" component="div">
                  Z: {tfData.position.z.toFixed(3)} m
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Orientation (RPY):</strong>
                </Typography>
                {(() => {
                  const euler = quaternionToEuler(tfData.orientation);
                  return (
                    <>
                      <Typography variant="caption" component="div">
                        Roll: {euler.roll.toFixed(1)}°
                      </Typography>
                      <Typography variant="caption" component="div">
                        Pitch: {euler.pitch.toFixed(1)}°
                      </Typography>
                      <Typography variant="caption" component="div">
                        Yaw: {euler.yaw.toFixed(1)}°
                      </Typography>
                    </>
                  );
                })()}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Last update: {new Date(tfData.timestamp).toLocaleTimeString()}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1} alignItems="center">
                <Typography variant="caption" color="error.main">
                  ✗ No TF data
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Waiting for /tf messages...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ROS Connected: {ros?.isConnected ? '✓' : '✗'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.7rem' }}
                >
                  Looking for: robomaster/base_link
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>}

      {/* Experiment Control Section */}
      {showExperimentControl && <Box minWidth={220}>
        <ExperimentControl
          manualIp={manualIp}
          onSessionChange={handleSessionChange}
          exportLogsAsJsonl={exportLogsAsJsonl}
          saveAllLogsToServer={saveAllLogsToServer}
        />
      </Box>}

      {/* LEDs Section */}
      {showLeds && <Box minWidth={220}>
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
            onClick={() => publishLedColor(1, 0.2, 0.0, ledIntensity)}
          >
            Orange
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(0.21, 0.27, 0.31, ledIntensity)}
          >
            Gray
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(1, 1, 1, ledIntensity)}
          >
            White
          </Button>
          <Button
            variant="outlined"
            onClick={() => publishLedColor(1, 1, 0, ledIntensity)}
          >
            Yellow
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
      </Box>}
      {/* Gripper Section */}
      {showGripper && <Box minWidth={180}>
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
      </Box>}
      {/* Arm/Box Section */}
      {showArm && <Box minWidth={200}>
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
      </Box>}
      {/* Feedback Section */}
      {showFeedback && <Box minWidth={220}>
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
      </Box>}
      {/* Macro Scenarios Section */}
      {showMacroScenarios && <Box minWidth={220}>
        <Typography variant="h6">Macro Scenarios</Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1}>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.SHARE_LEGO)}
          >
            Ask to Share LEGO
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.PASS_PIECE_KID1)}
          >
            Pass Piece to Kid 1
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.PASS_PIECE_KID2)}
          >
            Pass Piece to Kid 2
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleMacro(MacroScenario.ENCOURAGE_COLLAB)}
          >
            Encourage Collaboration
          </Button>
        </Stack>
      </Box>}
      {/* Movement Section */}
      {showMovement && <Box minWidth={200}>
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
      </Box>}
      {/* )} */}
      {/* Panic Button Section - Only show if robot has panic */}
      {showPanic && robotConfig.topics.panic && (
        <Box minWidth={120}>
          <Typography variant="h6">Other</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            <Button
              variant="contained"
              color="error"
              onClick={publishPanicSignal}
              size="large"
              style={{ height: 200 }}
            >
              Panic
            </Button>
          </Stack>
        </Box>
      )}
      {/* Sound Section - Only show if robot has sound */}
      {showSound && robotConfig.capabilities.hasSound && (
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
      )}
    </Box>
  );
}
