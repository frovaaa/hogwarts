'use client';

import { useEffect, useRef } from 'react';
import ROSLIB from 'roslib';
import { useRosContext } from '../hooks/useRosContext';

export default function CameraFeed() {
  const { ros, robotConfig } = useRosContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ros && robotConfig.capabilities.hasCamera && robotConfig.topics.rgbCamera) {
      const imageTopic = new ROSLIB.Topic({
        ros: ros,
        name: robotConfig.topics.rgbCamera,
        messageType: 'sensor_msgs/Image',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageTopic.subscribe((message: any) => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (context && message.data) {
            const { width, height, encoding } = message;

            // Decode the image data
            const rawData = atob(message.data);
            const buffer = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) {
              buffer[i] = rawData.charCodeAt(i);
            }

            if (encoding === 'bgr8') {
              // Convert BGR to RGBA
              const rgbaData = new Uint8ClampedArray(width * height * 4);
              for (let i = 0; i < width * height; i++) {
                rgbaData[i * 4] = buffer[i * 3 + 2]; // R
                rgbaData[i * 4 + 1] = buffer[i * 3 + 1]; // G
                rgbaData[i * 4 + 2] = buffer[i * 3]; // B
                rgbaData[i * 4 + 3] = 255; // A
              }
              const imageData = new ImageData(rgbaData, width, height);

              // Render the image on the canvas
              canvas.width = width;
              canvas.height = height;
              context.putImageData(imageData, 0, 0);
            } else {
              console.error(`Unsupported encoding: ${encoding}`);
            }
          }
        }
      });

      // Cleanup on unmount
      return () => {
        imageTopic.unsubscribe();
      };
    }
  }, [ros, robotConfig.capabilities.hasCamera, robotConfig.topics.rgbCamera]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        maxHeight: '400px',
        margin: '20px auto',
        display: 'block',
      }}
    />
  );
}
