'use client';

import { useCallback } from 'react';
import ROSLIB from 'roslib';

interface ExperimentEvent {
  timestamp: string;
  event_type: string;
  action: string;
  details: Record<string, unknown>;
  operator_id?: string;
}

export const useExperimentLogger = (ros: ROSLIB.Ros | null) => {
  const logEvent = useCallback((
    eventType: string,
    action: string,
    details: Record<string, unknown> = {},
    operatorId?: string
  ) => {
    if (!ros) {
      console.warn('ROS connection not available. Cannot log experiment event.');
      return;
    }

    const experimentEvent: ExperimentEvent = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      action: action,
      details: details,
      ...(operatorId && { operator_id: operatorId })
    };

    // Create the topic publisher
    const experimentEventTopic = new ROSLIB.Topic({
      ros,
      name: '/experiment/event',
      messageType: 'std_msgs/String', // Using String message to send JSON
    });

    // Publish the event as JSON string
    const message = new ROSLIB.Message({
      data: JSON.stringify(experimentEvent),
    });

    experimentEventTopic.publish(message);
    
    console.log('Experiment event logged:', experimentEvent);
  }, [ros]);

  // Helper functions for different types of events
  const logMovementEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('movement', action, details);
  }, [logEvent]);

  const logArmEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('arm_control', action, details);
  }, [logEvent]);

  const logLedEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('led_control', action, details);
  }, [logEvent]);

  const logSoundEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('sound_control', action, details);
  }, [logEvent]);

  const logGripperEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('gripper_control', action, details);
  }, [logEvent]);

  const logMacroEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('macro', action, details);
  }, [logEvent]);

  const logSystemEvent = useCallback((action: string, details: Record<string, unknown>) => {
    logEvent('system', action, details);
  }, [logEvent]);

  return {
    logEvent,
    logMovementEvent,
    logArmEvent,
    logLedEvent,
    logSoundEvent,
    logGripperEvent,
    logMacroEvent,
    logSystemEvent,
  };
};
