'use client';

import React, { createContext, useEffect, useState } from 'react';
import ROSLIB from 'roslib';

interface RosContextType {
    connected: boolean;
    ros: ROSLIB.Ros | null;
    rosIp: string;
    connectToRos: (rosIp: string) => void;
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

    return (
        <RosContext.Provider
            value={{
                connected,
                ros,
                rosIp,
                connectToRos,
            }}
        >
            {children}
        </RosContext.Provider>
    );
};