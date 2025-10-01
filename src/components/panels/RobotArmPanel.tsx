"use client";

import {
  Box,
  Button,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import { ArmPose, GripperState } from "../ActionsPanel";

interface RobotArmPanelProps {
  onArmPose: (pose: ArmPose) => Promise<void>;
  onGripper: (state: GripperState) => Promise<void>;
  showGripper: boolean;
  showArm: boolean;
}

export default function RobotArmPanel({ 
  onArmPose, 
  onGripper, 
  showGripper, 
  showArm 
}: RobotArmPanelProps) {
  if (!showGripper && !showArm) {
    return null;
  }

  return (
    <>
      {/* Gripper Section */}
      {showGripper && (
        <Box minWidth={180}>
          <Typography variant="h6">Gripper</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={() => onGripper(GripperState.OPEN)}
            >
              Open Gripper
            </Button>
            <Button
              variant="outlined"
              onClick={() => onGripper(GripperState.CLOSE)}
            >
              Close Gripper
            </Button>
          </Stack>
        </Box>
      )}
      
      {/* Arm/Box Section */}
      {showArm && (
        <Box minWidth={200}>
          <Typography variant="h6">Arm / Box</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={() => onArmPose(ArmPose.OPEN_BOX)}
            >
              Open Box
            </Button>
            <Button
              variant="outlined"
              onClick={() => onArmPose(ArmPose.CLOSE_BOX)}
            >
              Close Box
            </Button>
          </Stack>
        </Box>
      )}
    </>
  );
}