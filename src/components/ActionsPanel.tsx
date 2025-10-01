'use client';

import { Box } from '@mui/material';
import ROSLIB from 'roslib';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useExperimentLogger } from '@/hooks/useExperimentLogger';
import { useRosContext } from '@/hooks/useRosContext';
// Import panel components
import {
  ExperimentControlPanel,
  LEDControlPanel,
  SoundControlPanel,
  MovementControlPanel,
  FeedbackControlPanel,
  RobotArmPanel,
  RobotPositionPanel,
  PanicControlPanel,
} from './panels';

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
  ros: ROSLIB.Ros | null;
  manualIp: string;
  sessionId?: string | null;
  onActionResult?: (result: {
    success: boolean | null;
    message: string;
  }) => void;
  onSessionChange?: (sessionId: string | null) => void;
  sectionVisibility?: SectionVisibility;
}

// Enum for arm poses
export enum ArmPose {
  OPEN_BOX = 4,
  CLOSE_BOX = 2,
}

// Enum for gripper states
export enum GripperState {
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

  // State management
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [gripperPower, setGripperPower] = useState(0.5);
  const [feedbackLevel, setFeedbackLevel] = useState(1);
  const [tfData, setTfData] = useState<TFData | null>(null);
  const [tfConnected, setTfConnected] = useState(false);
  const tfConnectedRef = useRef(false);
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
      const dt = (currentTime - lastCmdTime) / 1000;
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
  }, [ros, robotConfig.topics.cmdVel]);

  // Reset integrated position when odometry position changes significantly
  useEffect(() => {
    if (tfData && tfData.position) {
      const currentOdom = { x: tfData.position.x, y: tfData.position.y };

      if (lastOdomPositionRef.current) {
        const dx = currentOdom.x - lastOdomPositionRef.current.x;
        const dy = currentOdom.y - lastOdomPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If robot moved significantly via navigation, reset integrated position
        if (distance > 0.1) {
          console.log(
            'Large odometry change detected, resetting integrated position'
          );
          integratedPositionRef.current = {
            x: currentOdom.x,
            y: currentOdom.y,
            theta: integratedPositionRef.current.theta,
            timestamp: Date.now(),
          };
        }
      }

      lastOdomPositionRef.current = currentOdom;
    }
  }, [tfData]);

  // Core action functions
  const callGenericAction = async (
    actionName: string,
    actionType: string,
    goal: Record<string, unknown>
  ) => {
    console.log(
      `Calling generic action: ${actionName}, Type: ${actionType}, Goal:`,
      goal
    );
    setIsActionInProgress(true);

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
        });

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
      });

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
      });

      // Log the error
      eventLogger('generic_action_error', {
        action_name: actionName,
        action_type: actionType,
        goal: goal,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsActionInProgress(false);
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

  // Movement functions
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
      linear_speed: 1.5 * 0.5, // Default speed since we removed moveSpeed
      angular_speed: 1.2,
      robot_world_ref_frame_name: 'world',
    };
    console.log(`Initiating move to ${pos.label}...`);
    onActionResult?.({ success: null, message: `Moving to ${pos.label}...` });
    await callGenericAction(actionName, actionType, goal);
  };

  // Arm control functions
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

  // Gripper control functions
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

  // Feedback functions
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

    // Use movement params from robot config
    const rateHz = robotConfig.movementParams.wiggleRateHz ?? 30;
    const dtMs = Math.max(10, Math.round(1000 / rateHz));

    const phase1Sec = robotConfig.movementParams.wigglePhase1 ?? 0.25;
    const phase2Sec = robotConfig.movementParams.wigglePhase2 ?? 0.5;
    const phase3Sec = robotConfig.movementParams.wigglePhase3 ?? 0.25;

    // Convert to ticks
    const n1 = Math.max(1, Math.round(phase1Sec * rateHz));
    const n2 = Math.max(1, Math.round(phase2Sec * rateHz));
    const n3 = Math.max(1, Math.round(phase3Sec * rateHz));

    const ticksPerCycle = n1 + n2 + n3;
    const totalTicks = Math.max(1, Math.floor(cycles) * ticksPerCycle);

    const alpha = (n1 + n3) / n2;
    const maxW = robotConfig.movementParams.maxAngularSpeed ?? 1.0;
    const req = Math.abs(angularSpeed);
    const M = Math.min(req, maxW / Math.max(1, alpha));

    const wzP = +M;
    const wzN = -alpha * M;

    let tick = 0;
    const h = setInterval(() => {
      const t = tick % ticksPerCycle;

      let wz = 0;
      if (t < n1) {
        wz = wzP;
      } else if (t < n1 + n2) {
        wz = wzN;
      } else {
        wz = wzP;
      }

      cmdVelTopic.publish(
        new ROSLIB.Message({
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: wz },
        })
      );

      tick++;
      if (tick >= totalTicks) {
        clearInterval(h);
        cmdVelTopic.publish(
          new ROSLIB.Message({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          })
        );
        setIsActionInProgress(false);
      }
    }, dtMs);
  };

  const moveBack = (
    distance = robotConfig.movementParams.backwardDistance,
    speed = Math.min(
      Math.abs(robotConfig.movementParams.maxLinearSpeed || 0.3),
      0.3
    )
  ) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot move back.');
      return;
    }

    const v = Math.max(0.05, Math.abs(speed));
    const dir = distance < 0 ? -1 : 1;
    const durationMs = Math.max(
      50,
      Math.round((Math.abs(distance) / v) * 1000)
    );
    const periodMs = 100;
    const ticks = Math.ceil(durationMs / periodMs);

    logMovementEvent('move_backward', {
      distance,
      speed: dir * v,
      duration_ms: durationMs,
    });

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
        cmdVelTopic.publish(
          new ROSLIB.Message({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          })
        );
      }
    }, periodMs);
  };

  const handlePositiveFeedback = () => {
    logSystemEvent('positive_feedback', {
      feedback_level: feedbackLevel,
      actions_triggered: getFeedbackActions(feedbackLevel, 'positive'),
    });

    if (feedbackLevel === 1) {
      // Level 1 logic handled in LEDControlPanel
    } else if (feedbackLevel === 2) {
      // Level 2 logic
    } else {
      // Level 3 logic
      rotateOnSpot(2, robotConfig.movementParams.rotationSpeed);
    }
  };

  const handleNegativeFeedback = () => {
    logSystemEvent('negative_feedback', {
      feedback_level: feedbackLevel,
      actions_triggered: getFeedbackActions(feedbackLevel, 'negative'),
    });

    if (feedbackLevel === 1) {
      // Level 1 logic handled in LEDControlPanel
    } else if (feedbackLevel === 2) {
      moveBack();
    } else {
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

  // Macro scenario handler
  const handleMacro = async (macro: MacroScenario) => {
    logMacroEvent('execute_macro', {
      macro_name: macro,
      macro_type: macro,
    });

    switch (macro) {
      case MacroScenario.SHARE_LEGO:
        await moveArmPose(ArmPose.OPEN_BOX);
        // Play sound handled in SoundControlPanel
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
        // LED feedback handled in LEDControlPanel
        rotateOnSpot(2, robotConfig.movementParams.rotationSpeed);
        // Play sound handled in SoundControlPanel
        break;
      case MacroScenario.PLAY_HAPPY_CHIME:
        // LED feedback and sound handled in respective panels
        break;
      default:
        break;
    }
  };

  return (
    <Box
      display='flex'
      flexDirection='row'
      gap={4}
      justifyContent='center'
      alignItems='flex-start'
      mt={2}
    >
      {/* Robot Position/TF Section */}
      {showRobotPosition && (
        <RobotPositionPanel
          tfConnected={tfConnected}
          tfData={tfData}
          rosConnected={ros?.isConnected || false}
        />
      )}

      {/* Experiment Control Section */}
      {showExperimentControl && (
        <ExperimentControlPanel
          manualIp={manualIp}
          onSessionChange={handleSessionChange}
          exportLogsAsJsonl={exportLogsAsJsonl}
          saveAllLogsToServer={saveAllLogsToServer}
        />
      )}

      {/* LEDs Section */}
      {showLeds && robotConfig.capabilities.hasLeds && (
        <LEDControlPanel ros={ros} logLedEvent={logLedEvent} />
      )}

      {/* Robot Arm Panel (Gripper + Arm) */}
      <RobotArmPanel
        onArmPose={moveArmPose}
        onGripper={handleGripper}
        showGripper={showGripper && robotConfig.capabilities.hasArm}
        showArm={showArm && robotConfig.capabilities.hasArm}
      />

      {/* Feedback Section */}
      {showFeedback && (
        <FeedbackControlPanel
          onPositiveFeedback={handlePositiveFeedback}
          onNegativeFeedback={handleNegativeFeedback}
          feedbackLevel={feedbackLevel}
          onFeedbackLevelChange={setFeedbackLevel}
        />
      )}

      {/* Movement Section */}
      {showMovement && robotConfig.capabilities.hasMovement && (
        <MovementControlPanel moveToPosition={moveToPosition} />
      )}

      {/* Panic Button Section */}
      {showPanic && (
        <PanicControlPanel ros={ros} logSystemEvent={logSystemEvent} />
      )}

      {/* Sound Section */}
      {showSound && (
        <SoundControlPanel ros={ros} logSoundEvent={logSoundEvent} />
      )}
    </Box>
  );
}
