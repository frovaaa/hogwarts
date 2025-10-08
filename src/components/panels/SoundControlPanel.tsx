'use client';

import { Box, Button, Typography, Divider, Stack } from '@mui/material';
import ROSLIB from 'roslib';
import { useRosContext } from '../../hooks/useRosContext';


interface SoundControlPanelProps {
  ros: ROSLIB.Ros | null;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  logSoundEvent: (eventType: string, data: any) => void;
}

export default function SoundControlPanel({
  ros,
  logSoundEvent,
}: SoundControlPanelProps) {
  const { robotConfig } = useRosContext();

  const playSemanticSound = (soundType: string) => {
    if (!ros) {
      console.error('ROS connection is not available. Cannot play sound.');
      return;
    }

    // Log the sound event
    logSoundEvent('play_semantic_sound', {
      sound_type: soundType,
      timestamp: Date.now(),
    });

    if (!robotConfig.capabilities.hasSound || !robotConfig.topics.sound) {
      console.warn('Robot does not support sound');
      return;
    }

    const soundMsg = new ROSLIB.Message({
      data: JSON.stringify({
        action: 'play_sound',
        sound_type: soundType,
        timestamp: Date.now()
      })
    });

    const soundTopic = new ROSLIB.Topic({
      ros,
      name: robotConfig.topics.sound,
      messageType: 'std_msgs/String',
    });

    soundTopic.publish(soundMsg);
    console.log(`Semantic sound command sent: ${soundType}`);
  };



  const happyChimeSong = async () => {
    // Log the complex sound event
    logSoundEvent('happy_chime_sequence', {
      sequence: ['chime', 'melody', 'note', 'beep', 'chime', 'melody', 'note'],
      timing: 'sequential with delays',
    });

    playSemanticSound('chime');
    setTimeout(() => playSemanticSound('melody'), 200);
    setTimeout(() => playSemanticSound('note'), 300);
    setTimeout(() => playSemanticSound('beep'), 400);
    setTimeout(() => playSemanticSound('chime'), 500);
    setTimeout(() => playSemanticSound('melody'), 600);
    setTimeout(() => playSemanticSound('note'), 700);
  };

  if (!robotConfig.capabilities.hasSound) {
    return null;
  }

  return (
    <Box minWidth={180}>
      <Typography variant='h6'>Sounds</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button variant='outlined' onClick={() => playSemanticSound('beep')}>
          Beep
        </Button>
        <Button variant='outlined' onClick={() => playSemanticSound('chime')}>
          Chime
        </Button>
        <Button variant='outlined' onClick={() => playSemanticSound('melody')}>
          Melody
        </Button>
        <Button variant='outlined' onClick={() => happyChimeSong()}>
          Happy Chime
        </Button>
      </Stack>
    </Box>
  );
}
