"use client";

import {
  Box,
  Button,
  Typography,
  Divider,
  Slider,
  Stack,
} from "@mui/material";
import { useState } from "react";

interface FeedbackControlPanelProps {
  onPositiveFeedback: () => void;
  onNegativeFeedback: () => void;
  feedbackLevel: number;
  onFeedbackLevelChange: (level: number) => void;
}

export default function FeedbackControlPanel({ 
  onPositiveFeedback, 
  onNegativeFeedback, 
  feedbackLevel, 
  onFeedbackLevelChange 
}: FeedbackControlPanelProps) {
  return (
    <Box minWidth={220}>
      <Typography variant="h6">Feedback</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button
          variant="contained"
          color="success"
          onClick={onPositiveFeedback}
        >
          Positive Feedback
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onNegativeFeedback}
        >
          Negative Feedback
        </Button>
        <Typography variant="caption">Feedback Intensity</Typography>
        <Slider
          min={1}
          max={3}
          step={1}
          value={feedbackLevel}
          onChange={(_, v) => onFeedbackLevelChange(Number(v))}
          marks={[
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
          ]}
        />
      </Stack>
    </Box>
  );
}