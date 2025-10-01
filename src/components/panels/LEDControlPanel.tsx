'use client';

import { Box, Button, Typography, Divider, Slider, Stack } from '@mui/material';
import ROSLIB from 'roslib';
import { useState } from 'react';
import { useRosContext } from '../../hooks/useRosContext';

interface LEDControlPanelProps {
  ros: ROSLIB.Ros | null;
  logLedEvent: (eventType: string, data: any) => void;
}

export default function LEDControlPanel({
  ros,
  logLedEvent,
}: LEDControlPanelProps) {
  const { robotConfig } = useRosContext();
  const [ledIntensity, setLedIntensity] = useState(1.0);
  const [ledBlinkTimes, setLedBlinkTimes] = useState(5);
  const [ledBlinkSpeed, setLedBlinkSpeed] = useState(100);

  const publishLedColor = (
    r: number,
    g: number,
    b: number,
    intensity: number = 1.0
  ) => {
    if (ros) {
      // Scale RGB by intensity, alpha always 1.0
      const scaledR = r * intensity;
      const scaledG = g * intensity;
      const scaledB = b * intensity;
      const msg = new ROSLIB.Message({
        r: scaledR,
        g: scaledG,
        b: scaledB,
        a: 1.0,
      });
      if (!robotConfig.capabilities.hasLeds || !robotConfig.topics.leds) {
        console.warn('Robot does not support LEDs');
        return;
      }
      const ledColorPublisher = new ROSLIB.Topic({
        ros,
        name: robotConfig.topics.leds,
        messageType: 'std_msgs/ColorRGBA',
      });
      ledColorPublisher.publish(msg);
      console.log(
        `Publishing LED color: r=${scaledR}, g=${scaledG}, b=${scaledB}, a=1.0`
      );

      // Log the event
      logLedEvent('set_color', {
        r: scaledR,
        g: scaledG,
        b: scaledB,
        intensity: intensity,
        color_name: getColorName(r, g, b),
      });
    } else {
      console.error(
        'ROS connection is not available. Cannot publish LED color.'
      );
    }
  };

  // Helper function to get color name for logging
  const getColorName = (r: number, g: number, b: number): string => {
    if (r === 1 && g === 0 && b === 0) return 'red';
    if (r === 0 && g === 1 && b === 0) return 'green';
    if (r === 0 && g === 0 && b === 1) return 'blue';
    if (r === 1 && g === 0.2 && b === 0) return 'orange';
    if (r === 0.21 && g === 0.27 && b === 0.31) return 'gray';
    if (r === 1 && g === 1 && b === 1) return 'white';
    if (r === 1 && g === 1 && b === 0) return 'yellow';
    if (r === 0 && g === 0 && b === 0) return 'off';
    return `custom_rgb(${r},${g},${b})`;
  };

  const ledFeedback = async (
    behavior: 'good' | 'bad',
    times: number = 5,
    speed: number = 100
  ) => {
    // Log the LED feedback event
    logLedEvent('feedback_blink', {
      behavior: behavior,
      times: times,
      speed: speed,
      intensity: ledIntensity,
    });

    const blinkLed = (
      r: number,
      g: number,
      b: number,
      times: number,
      speed: number
    ) => {
      let count = 0;
      const interval = setInterval(() => {
        if (count >= times * 2) {
          clearInterval(interval);
          return;
        }
        if (count % 2 === 0) {
          publishLedColor(r, g, b, ledIntensity); // Turn on with intensity
        } else {
          publishLedColor(0.0, 0.0, 0.0, 0.0); // Turn off
        }
        count++;
      }, speed);
    };

    if (behavior === 'good') {
      console.log(
        `Marking good behavior with ${times} blinks at ${speed}ms speed...`
      );
      blinkLed(0.0, 1.0, 0.0, times, speed); // Green LED blinks specified times
    } else if (behavior === 'bad') {
      console.log(
        `Marking bad behavior with ${times} blinks at ${speed}ms speed...`
      );
      blinkLed(1.0, 0.0, 0.0, times, speed); // Red LED blinks specified times
    }
  };

  return (
    <Box minWidth={220}>
      <Typography variant='h6'>LEDs</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(1, 0, 0, ledIntensity)}
        >
          Red
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(0, 1, 0, ledIntensity)}
        >
          Green
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(0, 0, 1, ledIntensity)}
        >
          Blue
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(1, 0.2, 0.0, ledIntensity)}
        >
          Orange
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(0.21, 0.27, 0.31, ledIntensity)}
        >
          Gray
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(1, 1, 1, ledIntensity)}
        >
          White
        </Button>
        <Button
          variant='outlined'
          onClick={() => publishLedColor(1, 1, 0, ledIntensity)}
        >
          Yellow
        </Button>
        <Button variant='outlined' onClick={() => publishLedColor(0, 0, 0, 0)}>
          Off
        </Button>
        <Button
          variant='outlined'
          onClick={() => ledFeedback('good', ledBlinkTimes, ledBlinkSpeed)}
        >
          Blink Green
        </Button>
        <Button
          variant='outlined'
          onClick={() => ledFeedback('bad', ledBlinkTimes, ledBlinkSpeed)}
        >
          Blink Red
        </Button>
        <Typography variant='caption'>Intensity</Typography>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={ledIntensity}
          onChange={(_, v) => setLedIntensity(Number(v))}
        />
        <Typography variant='caption'>Blink Times</Typography>
        <Slider
          min={1}
          max={10}
          step={1}
          value={ledBlinkTimes}
          onChange={(_, v) => setLedBlinkTimes(Number(v))}
        />
        <Typography variant='caption'>Blink Speed (ms)</Typography>
        <Slider
          min={50}
          max={500}
          step={10}
          value={ledBlinkSpeed}
          onChange={(_, v) => setLedBlinkSpeed(Number(v))}
        />
      </Stack>
    </Box>
  );
}
