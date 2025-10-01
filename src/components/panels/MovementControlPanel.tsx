"use client";

import {
  Box,
  Button,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import ROSLIB from "roslib";
import { Position, Positions } from "../ActionsPanel";

interface MovementControlPanelProps {
  moveToPosition: (pos: Position) => Promise<void>;
}

export default function MovementControlPanel({ moveToPosition }: MovementControlPanelProps) {
  return (
    <Box minWidth={200}>
      <Typography variant="h6">Movement</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        <Button
          variant="outlined"
          onClick={() => moveToPosition(Positions.KID1)}
        >
          Go to Kid 1
        </Button>
        <Button
          variant="outlined"
          onClick={() => moveToPosition(Positions.KID2)}
        >
          Go to Kid 2
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => moveToPosition(Positions.ORIGIN)}
        >
          Go to Origin
        </Button>
      </Stack>
    </Box>
  );
}