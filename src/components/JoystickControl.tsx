'use client';

import { useEffect, useRef } from 'react';
import ROSLIB, { Ros } from 'roslib';
import { useExperimentLogger } from '../hooks/useExperimentLogger';

interface JoystickControlProps {
  ros: Ros | null;
  moveSpeed: number;
}

export default function JoystickControl({
  ros,
  moveSpeed,
}: JoystickControlProps) {
  const { logMovementEvent } = useExperimentLogger(ros);
  const lastLogTime = useRef(0);
  const logThrottleMs = 500; // Log joystick movements at most every 500ms

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let manager: any;

    if (ros) {
      const joystickContainer = document.getElementById('joystick');
      if (joystickContainer) {
        // Dynamically import nipplejs
        import('nipplejs').then((nipplejs) => {
          manager = nipplejs.create({
            zone: joystickContainer,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'blue',
          });

          const cmdVelTopic = new ROSLIB.Topic({
            ros: ros,
            name: '/robomaster/cmd_vel',
            messageType: 'geometry_msgs/Twist',
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          manager.on('start', () => {
            // Log when joystick control starts
            logMovementEvent('joystick_start', {
              move_speed: moveSpeed
            });
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          manager.on('move', (evt: any, data: any) => {
            if (data && data.vector) {
              const speedFactor = moveSpeed; // Use moveSpeed from props
              const linearX = data.vector.y * speedFactor; // Forward/backward
              const angularZ = -data.vector.x * speedFactor; // Left/right, scale with moveSpeed

              const twist = new ROSLIB.Message({
                linear: { x: linearX, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: angularZ },
              });

              cmdVelTopic.publish(twist);

              // Throttle logging of joystick movements to avoid spam
              const now = Date.now();
              if (now - lastLogTime.current > logThrottleMs) {
                logMovementEvent('joystick_move', {
                  linear_x: linearX,
                  angular_z: angularZ,
                  speed_factor: speedFactor,
                  vector: data.vector
                });
                lastLogTime.current = now;
              }
            }
          });

          manager.on('end', () => {
            // Stop the robot when joystick is released
            const stopTwist = new ROSLIB.Message({
              linear: { x: 0, y: 0, z: 0 },
              angular: { x: 0, y: 0, z: 0 },
            });
            cmdVelTopic.publish(stopTwist);

            // Log when joystick control ends
            logMovementEvent('joystick_end', {
              move_speed: moveSpeed
            });
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
  }, [ros, moveSpeed]);

  return (
    <div
      id="joystick"
      style={{
        width: '200px',
        height: '200px',
        margin: '5em auto',
        border: '1px solid black',
        position: 'relative',
      }}
    ></div>
  );
}
