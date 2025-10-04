'use client';

import { Box, Button, Typography, Divider, Stack } from '@mui/material';
import { ArmPose } from '../ActionsPanel';

interface RobotArmPanelProps {
  onArmPose: (pose: ArmPose) => Promise<void>;
  onSemanticGripper: (action: string, force?: number) => Promise<void>;
  // New generic arm action handler
  onSemanticArmAction?: (actionName: string, params?: Record<string, unknown>) => Promise<void>;
  // Available semantic actions to render as buttons
  availableArmActions?: string[];
  availableGripperActions?: string[];
  showGripper: boolean;
  showArm: boolean;
}

export default function RobotArmPanel({
  onArmPose,
  onSemanticGripper,
  onSemanticArmAction,
  availableArmActions = [],
  availableGripperActions = [],
  showGripper,
  showArm,
}: RobotArmPanelProps) {
  if (!showGripper && !showArm) {
    return null;
  }

  return (
    <>
      {/* Gripper Section */}
      {showGripper && (
        <Box minWidth={180}>
          <Typography variant='h6'>Gripper</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            {availableGripperActions.length > 0 ? (
              availableGripperActions.map((act) => (
                <Button
                  key={act}
                  variant='outlined'
                  onClick={() => onSemanticGripper(act)}
                >
                  {act.charAt(0).toUpperCase() + act.slice(1)}
                </Button>
              ))
            ) : (
              <>
                <Button
                  variant='outlined'
                  onClick={() => onSemanticGripper('open')}
                >
                  Open Gripper
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => onSemanticGripper('close')}
                >
                  Close Gripper
                </Button>
              </>
            )}
          </Stack>
        </Box>
      )}

      {/* Arm/Box Section */}
      {showArm && (
        <Box minWidth={200}>
          <Typography variant='h6'>Arm</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            {availableArmActions.length > 0 ? (
              availableArmActions.map((act) => (
                <Button
                  key={act}
                  variant='outlined'
                  onClick={() => onSemanticArmAction?.(act)}
                >
                  {act.charAt(0).toUpperCase() + act.slice(1)}
                </Button>
              ))
            ) : (
              <>
                <Button
                  variant='outlined'
                  onClick={() => onArmPose(ArmPose.OPEN_BOX)}
                >
                  Open Box
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => onArmPose(ArmPose.CLOSE_BOX)}
                >
                  Close Box
                </Button>
              </>
            )}
          </Stack>
        </Box>
      )}
    </>
  );
}
