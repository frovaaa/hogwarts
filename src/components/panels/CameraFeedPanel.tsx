'use client';

import { useEffect, useRef } from 'react';
import ROSLIB from 'roslib';
import { useRosContext } from '@/hooks/useRosContext';

// Helper function to validate image message
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateImageMessage(message: any): boolean {
  const { width, height } = message;
  return !!(message.data && width && height && width > 0 && height > 0);
}

// Helper function to decode base64 image data
function decodeImageData(base64Data: string): Uint8Array {
  const rawData = atob(base64Data);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

// Helper function to convert BGR/BGRA to RGBA and create ImageData
function convertToImageData(
  buffer: Uint8Array,
  width: number,
  height: number,
  isBGRA: boolean
): ImageData | null {
  const bytesPerPixel = isBGRA ? 4 : 3;
  const expectedBufferSize = width * height * bytesPerPixel;

  if (buffer.length < expectedBufferSize) {
    console.error(`Buffer size mismatch. Expected: ${expectedBufferSize}, got: ${buffer.length}`);
    return null;
  }

  const rgbaData = new Uint8ClampedArray(width * height * 4);
  
  for (let i = 0; i < width * height; i++) {
    if (isBGRA) {
      // BGRA format
      rgbaData[i * 4] = buffer[i * 4 + 2]; // R
      rgbaData[i * 4 + 1] = buffer[i * 4 + 1]; // G
      rgbaData[i * 4 + 2] = buffer[i * 4]; // B
      rgbaData[i * 4 + 3] = buffer[i * 4 + 3]; // A
    } else {
      // BGR format
      rgbaData[i * 4] = buffer[i * 3 + 2]; // R
      rgbaData[i * 4 + 1] = buffer[i * 3 + 1]; // G
      rgbaData[i * 4 + 2] = buffer[i * 3]; // B
      rgbaData[i * 4 + 3] = 255; // A (fully opaque)
    }
  }

  try {
    return new ImageData(rgbaData, width, height);
  } catch (error) {
    console.error('Failed to create ImageData:', error);
    return null;
  }
}

export default function CameraFeed() {
  const { ros, robotConfig } = useRosContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (
      ros &&
      robotConfig.capabilities.hasCamera &&
      robotConfig.topics.rgbCamera
    ) {
      const imageTopic = new ROSLIB.Topic({
        ros: ros,
        name: robotConfig.topics.rgbCamera,
        messageType: 'sensor_msgs/Image',
        // messageType: 'sensor_msgs/msg/CompressedImage'
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageTopic.subscribe((message: any) => {
        try {
          if (!canvasRef.current || !validateImageMessage(message)) {
            return;
          }

          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context) {
            console.error('Failed to get canvas 2D context');
            return;
          }

          const { width, height, encoding, format } = message;
          const buffer = decodeImageData(message.data);

          const isBGRA = encoding === 'bgra8' || format?.includes('bgra8');
          const isBGR = encoding === 'bgr8' || format?.includes('bgr8');

          if (!(isBGRA || isBGR)) {
            console.error(`Unsupported encoding/format: ${encoding}/${format}`);
            return;
          }

          const imageData = convertToImageData(buffer, width, height, isBGRA);
          if (!imageData) {
            return;
          }

          // Set canvas dimensions and render
          canvas.width = width;
          canvas.height = height;
          context.putImageData(imageData, 0, 0);
        } catch (error) {
          console.error('Error processing camera feed:', error);
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
