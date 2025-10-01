"use client";

import {
  Box,
  Button,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import ROSLIB from "roslib";
import { useRosContext } from "../../hooks/useRosContext";
import { MacroScenario } from "../ActionsPanel";

interface SoundControlPanelProps {
  ros: ROSLIB.Ros | null;
  logSoundEvent: (eventType: string, data: any) => void;
  onMacro: (macro: MacroScenario) => void;
}

export default function SoundControlPanel({ ros, logSoundEvent, onMacro }: SoundControlPanelProps) {
  const { robotConfig } = useRosContext();

  const playCustomSound = (sound_id: number = 262) => {
    if (!ros) {
      console.error("ROS connection is not available. Cannot play sound.");
      return;
    }

    // Log the sound event
    logSoundEvent("play_sound", {
      sound_id: sound_id,
      sound_name: getSoundName(sound_id),
    });

    if (!robotConfig.capabilities.hasSound || !robotConfig.topics.sound) {
      console.warn("Robot does not support sound");
      return;
    }
    const soundTopic = new ROSLIB.Topic({
      ros,
      name: robotConfig.topics.sound,
      messageType: "robomaster_msgs/msg/SpeakerCommand",
    });
    soundTopic.publish(
      new ROSLIB.Message({
        control: 1,
        sound_id,
        times: 1,
      }),
    );
    setTimeout(() => {
      soundTopic.publish(
        new ROSLIB.Message({
          control: 0,
          sound_id,
        }),
      );
    }, 500);
  };

  // Helper function to get sound name for logging
  const getSoundName = (soundId: number): string => {
    switch (soundId) {
      case 262:
        return "beep";
      case 263:
        return "chime";
      case 264:
        return "melody";
      case 265:
        return "note";
      default:
        return `custom_sound_${soundId}`;
    }
  };

  if (!robotConfig.capabilities.hasSound) {
    return null;
  }

  return (
    <Box minWidth={180}>
      <Typography variant="h6">Sounds</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button variant="outlined" onClick={() => playCustomSound(262)}>
          Beep
        </Button>
        <Button variant="outlined" onClick={() => playCustomSound(263)}>
          Chime
        </Button>
        <Button variant="outlined" onClick={() => playCustomSound(264)}>
          Melody
        </Button>
        <Button
          variant="outlined"
          onClick={() => onMacro(MacroScenario.PLAY_HAPPY_CHIME)}
        >
          Happy Chime
        </Button>
      </Stack>
    </Box>
  );
}