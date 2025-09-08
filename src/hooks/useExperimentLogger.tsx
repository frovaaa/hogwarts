'use client';

import { useCallback, useRef } from 'react';
import ROSLIB from 'roslib';

interface ExperimentEvent {
  timestamp: string;
  event_type: string;
  action: string;
  details: Record<string, unknown>;
  operator_id?: string;
  session_id?: string;
}

export const useExperimentLogger = (ros: ROSLIB.Ros | null, sessionId?: string | null) => {
  const logsRef = useRef<ExperimentEvent[]>([]);

  const logEvent = useCallback((
    eventType: string,
    action: string,
    details: Record<string, unknown> = {},
    operatorId?: string
  ) => {
    const experimentEvent: ExperimentEvent = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      action: action,
      details: details,
      ...(operatorId && { operator_id: operatorId }),
      ...(sessionId && { session_id: sessionId })
    };

    // Store locally for potential JSONL export
    logsRef.current.push(experimentEvent);

    // Publish to ROS topic
    if (ros) {
      const experimentEventTopic = new ROSLIB.Topic({
        ros,
        name: '/experiment/event',
        messageType: 'std_msgs/String',
      });

      const message = new ROSLIB.Message({
        data: JSON.stringify(experimentEvent),
      });

      experimentEventTopic.publish(message);
    } else {
      console.warn('ROS connection not available. Cannot log experiment event to topic.');
    }

    console.log('Experiment event logged:', experimentEvent);
  }, [ros, sessionId]);

  // Export logs as JSONL
  const exportLogsAsJsonl = useCallback((): string => {
    return logsRef.current.map(log => JSON.stringify(log)).join('\n');
  }, []);

  // Download logs as JSONL file
  const downloadLogsAsJsonl = useCallback((filename?: string) => {
    const jsonlContent = exportLogsAsJsonl();
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `experiment_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportLogsAsJsonl]);

  // Clear logs (for new session)
  const clearLogs = useCallback(() => {
    logsRef.current = [];
  }, []);

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
    exportLogsAsJsonl,
    downloadLogsAsJsonl,
    clearLogs,
    getLogCount: () => logsRef.current.length,
  };
};
