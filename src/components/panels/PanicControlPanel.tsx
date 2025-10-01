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

interface PanicControlPanelProps {
  ros: ROSLIB.Ros | null;
  logSystemEvent: (eventType: string, data: any) => void;
}

export default function PanicControlPanel({ ros, logSystemEvent }: PanicControlPanelProps) {
  const { robotConfig } = useRosContext();

  const publishPanicSignal = () => {
    if (ros) {
      // Log the panic event
      logSystemEvent("panic_signal", {
        repeat_count: 5,
        interval_ms: 100,
      });

      if (!robotConfig.topics.panic) {
        console.warn("Robot does not support panic signal");
        return;
      }
      console.log(
        `Publishing panic signal to ${robotConfig.topics.panic} 5 times`,
      );
      const panicPublisher = new ROSLIB.Topic({
        ros,
        name: robotConfig.topics.panic,
        messageType: "std_msgs/Empty",
      });

      const msg = new ROSLIB.Message({});
      let count = 0;

      const interval = setInterval(() => {
        if (count >= 5) {
          clearInterval(interval);
          console.log("Panic signal published 5 times.");
          return;
        }
        panicPublisher.publish(msg);
        console.log(`Panic signal published (${count + 1}/5).`);
        count++;
      }, 100); // Publish every 100ms
    } else {
      console.error(
        "ROS connection is not available. Cannot publish panic signal.",
      );
    }
  };

  if (!robotConfig.capabilities.hasPanic || !robotConfig.topics.panic) {
    return null;
  }

  return (
    <Box minWidth={120}>
      <Typography variant="h6">Other</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button
          variant="contained"
          color="error"
          onClick={publishPanicSignal}
          size="large"
          style={{ height: 200 }}
        >
          Panic
        </Button>
      </Stack>
    </Box>
  );
}