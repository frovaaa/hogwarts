import { useState, useEffect, useCallback } from 'react';
import ROSLIB from 'roslib';

export interface UseTopicsResult {
  topics: string[];
  loading: boolean;
  error: string | null;
  refreshTopics: () => void;
}

/**
 * Hook for discovering and managing ROS topics
 */
export function useTopics(
  ros: ROSLIB.Ros | null,
  autoRefresh = false
): UseTopicsResult {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTopics = useCallback(() => {
    if (!ros) {
      setTopics([]);
      setError('ROS not connected');
      return;
    }

    setLoading(true);
    setError(null);

    // Create a service client to get topic list
    const getTopicsService = new ROSLIB.Service({
      ros: ros,
      name: '/rosapi/topics',
      serviceType: 'rosapi/Topics',
    });

    const request = new ROSLIB.ServiceRequest({});

    getTopicsService.callService(
      request,
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any) => {
        try {
          if (result && result.topics) {
            // Filter out system topics and sort alphabetically
            const filteredTopics = result.topics
              .filter(
                (topic: string) =>
                  !topic.startsWith('/rosout') &&
                  !topic.startsWith('/tf') &&
                  !topic.startsWith('/clock') &&
                  !topic.startsWith('/rosapi')
              )
              .sort();

            setTopics(filteredTopics);
            setError(null);
          } else {
            setError('Invalid response from topic service');
          }
        } catch (err) {
          console.error('Error processing topics response:', err);
          setError('Error processing topics list');
        } finally {
          setLoading(false);
        }
      },
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => {
        console.error('Error fetching topics:', error);
        setError('Failed to fetch topics. Make sure rosapi is running.');
        setLoading(false);
      }
    );
  }, [ros]);

  // Auto-refresh topics when ROS connection changes
  useEffect(() => {
    if (ros && autoRefresh) {
      refreshTopics();
    }
  }, [ros, autoRefresh, refreshTopics]);

  return {
    topics,
    loading,
    error,
    refreshTopics,
  };
}

/**
 * Hook for getting detailed information about a specific topic
 */
export function useTopicInfo(ros: ROSLIB.Ros | null, topicName: string) {
  const [topicInfo, setTopicInfo] = useState<{
    type: string;
    publishers: string[];
    subscribers: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTopicInfo = useCallback(() => {
    if (!ros || !topicName) {
      setTopicInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    const getTopicTypeService = new ROSLIB.Service({
      ros: ros,
      name: '/rosapi/topic_type',
      serviceType: 'rosapi/TopicType',
    });

    const request = new ROSLIB.ServiceRequest({
      topic: topicName,
    });

    getTopicTypeService.callService(
      request,
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any) => {
        try {
          setTopicInfo({
            type: result.type || 'unknown',
            publishers: result.publishers || [],
            subscribers: result.subscribers || [],
          });
          setError(null);
        } catch (err) {
          console.error('Error processing topic info:', err);
          setError('Error getting topic information');
        } finally {
          setLoading(false);
        }
      },
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => {
        console.error('Error fetching topic info:', error);
        setError('Failed to fetch topic information');
        setLoading(false);
      }
    );
  }, [ros, topicName]);

  useEffect(() => {
    if (ros && topicName) {
      getTopicInfo();
    }
  }, [ros, topicName, getTopicInfo]);

  return {
    topicInfo,
    loading,
    error,
    refresh: getTopicInfo,
  };
}

/**
 * Hook for topic validation and suggestions
 */
export function useTopicSuggestions(
  availableTopics: string[],
  robotCapabilities: Record<string, boolean>
) {
  const getSuggestionsForTopic = useCallback(
    (topicKey: string): string[] => {
      if (!availableTopics.length) return [];

      const suggestions: string[] = [];

      // Define common patterns for different topic types
        const patterns: Record<string, string[]> = {
        cmdVel: ['cmd_vel', 'velocity', 'command'],
        odom: ['odom', 'odometry'],
        rgbCamera: ['rgb', 'image', 'color', 'camera'],
        depthCamera: ['depth', 'camera'],
        cameraInfo: ['camera_info', 'info'],
        imu: ['imu', 'inertial'],
        laser: ['scan', 'laser', 'lidar'],
        sonar: ['sonar', 'ultrasonic'],
        jointStates: ['joint_states', 'joints'],
        moveRobotAction: ['move', 'navigate', 'goal'],
        moveArmAction: ['arm', 'manipulator', 'trajectory'],
        arm: ['arm', 'manipulator', 'ee', 'end_effector'],
        gripper: ['gripper', 'grasp'],
        leds: ['led', 'light'],
        sound: ['sound', 'audio', 'beep'],
        panic: ['panic', 'stop', 'emergency'],
        externalPose: ['pose', 'position', 'optitrack', 'mocap'],
      };

      const keyPatterns = patterns[topicKey] || [];

      // Find topics that match the patterns
      keyPatterns.forEach((pattern) => {
        const matches = availableTopics.filter((topic) =>
          topic.toLowerCase().includes(pattern.toLowerCase())
        );
        suggestions.push(...matches);
      });

      // Remove duplicates and sort by relevance
      const uniqueSuggestions = Array.from(new Set(suggestions));

      // Sort by how well they match (exact matches first, then partial)
      uniqueSuggestions.sort((a, b) => {
        const aScore = keyPatterns.reduce((score, pattern) => {
          if (a.toLowerCase().includes(pattern.toLowerCase())) {
            return score + (a.toLowerCase() === pattern.toLowerCase() ? 10 : 1);
          }
          return score;
        }, 0);

        const bScore = keyPatterns.reduce((score, pattern) => {
          if (b.toLowerCase().includes(pattern.toLowerCase())) {
            return score + (b.toLowerCase() === pattern.toLowerCase() ? 10 : 1);
          }
          return score;
        }, 0);

        return bScore - aScore;
      });

      return uniqueSuggestions.slice(0, 10); // Return top 10 suggestions
    },
    [availableTopics]
  );

  const validateTopic = useCallback(
    (
      topicName: string
    ): {
      isValid: boolean;
      exists: boolean;
      suggestions: string[];
    } => {
      const exists = availableTopics.includes(topicName);
      const isValid = topicName.startsWith('/') && topicName.length > 1;

      let suggestions: string[] = [];
      if (!exists && topicName) {
        // Find similar topics for suggestions
        const similar = availableTopics.filter(
          (topic) =>
            topic.toLowerCase().includes(topicName.toLowerCase()) ||
            topicName.toLowerCase().includes(topic.toLowerCase())
        );
        suggestions = similar.slice(0, 5);
      }

      return {
        isValid,
        exists,
        suggestions,
      };
    },
    [availableTopics]
  );

  return {
    getSuggestionsForTopic,
    validateTopic,
  };
}
