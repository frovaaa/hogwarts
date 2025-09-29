'use client';

import React, { createContext, useEffect, useState, useMemo } from 'react';
import ROSLIB from 'roslib';
import { RobotConfig, getDefaultRobotConfig, getRobotConfig } from '../config/robotConfig';

interface RosContextType {
  connected: boolean;
  ros: ROSLIB.Ros | null;
  rosIp: string;
  robotConfig: RobotConfig;
  connectToRos: (rosIp: string) => void;
  setRobotType: (robotName: string) => void;
}

/**
 * Context for the ROS bridge connection.
 * Provides the ROS connection state and the ROS instance.
 */
export const RosContext = createContext<RosContextType | undefined>(undefined);

export const RosProvider = ({ children }: { children: React.ReactNode }) => {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [connected, setConnected] = useState(false);
  const [rosIp, setRosIp] = useState<string>(''); // Initialize as an empty string
  const [robotConfig, setRobotConfig] = useState<RobotConfig>(getDefaultRobotConfig());

  /**
   * Set the ROS IP to the hostname of the window when the component mounts.
   * This helps prevent hydration mismatch issues.
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set rosIp to the hostname after the component has mounted
      setRosIp(window.location.hostname);
    }
  }, []);

  /**
   * Set the robot type and load the corresponding configuration
   */
  const setRobotType = (robotName: string) => {
    setRobotConfig(getRobotConfig(robotName));
  };

  /**
   * Connect to the ROS bridge server using the given IP.
   * Updates the rosIp state and sets up the connection.
   * @param ip - The IP address of the ROS bridge server
   */
  const connectToRos = (ip: string) => {
    // Construct the full WebSocket URL
    const rosbridgeUrl = `ws://${ip}:9090`;

    // Update the rosIp state
    setRosIp(ip);

    // Create a new ROSLIB.Ros instance and set up event listeners
    const rosInstance = new ROSLIB.Ros({
      url: rosbridgeUrl,
    });

    rosInstance.on('connection', () => {
      console.log('Connected to ROS');
      setRos(rosInstance);
      setConnected(true);
    });

    rosInstance.on('error', (err) => {
      console.error('ROS connection error:', err);
      setConnected(false);
    });

    rosInstance.on('close', () => {
      console.warn('ROS connection closed');
      setRos(null);
      setConnected(false);
    });

    return rosInstance;
  };

  /**
   * Automatically connect to the ROS bridge server when rosIp changes.
   * Closes the connection when the component is unmounted.
   */
  useEffect(() => {
    if (rosIp) {
      const rosInstance = connectToRos(rosIp);

      return () => {
        rosInstance.close();
      };
    }
  }, [rosIp]);

  const contextValue = useMemo(() => ({
    connected,
    ros,
    rosIp,
    robotConfig,
    connectToRos,
    setRobotType,
  }), [connected, ros, rosIp, robotConfig]);

  return (
    <RosContext.Provider value={contextValue}>
      {children}
    </RosContext.Provider>
  );
};
