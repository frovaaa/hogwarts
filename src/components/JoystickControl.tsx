'use client';

import { useEffect } from 'react';
import ROSLIB, { Ros } from 'roslib';

interface JoystickControlProps {
    ros: Ros | null;
}

export default function JoystickControl({ ros }: JoystickControlProps) {
    useEffect(() => {
        let manager: any;

        if (ros) {
            const joystickContainer = document.getElementById('joystick');
            if (joystickContainer) {
                // Dynamically import nipplejs
                import('nipplejs').then((nipplejs) => {
                    manager = nipplejs.create({
                        zone: joystickContainer,
                        mode: 'static',
                        position: { left: '50%', bottom: '50px' },
                        color: 'blue',
                    });

                    const cmdVelTopic = new ROSLIB.Topic({
                        ros: ros,
                        name: '/cmd_vel',
                        messageType: 'geometry_msgs/Twist',
                    });

                    manager.on('move', (evt: any, data: any) => {
                        if (data && data.vector) {
                            const speedFactor = 0.5; // Used to reduce the speed of the robot
                            const linearX = data.vector.y * speedFactor; // Forward/backward
                            const angularZ = -data.vector.x; // Left/right

                            const twist = new ROSLIB.Message({
                                linear: { x: linearX, y: 0, z: 0 },
                                angular: { x: 0, y: 0, z: angularZ },
                            });

                            cmdVelTopic.publish(twist);
                        }
                    });

                    manager.on('end', () => {
                        // Stop the robot when joystick is released
                        const stopTwist = new ROSLIB.Message({
                            linear: { x: 0, y: 0, z: 0 },
                            angular: { x: 0, y: 0, z: 0 },
                        });
                        cmdVelTopic.publish(stopTwist);
                    });
                });
            }
        }

        // Cleanup on unmount
        return () => {
            if (manager) {
                manager.destroy();
            }
        };
    }, [ros]);

    return <div id="joystick" style={{ width: '200px', height: '200px', margin: '0 auto' }}></div>;
}