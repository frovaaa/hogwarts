'use client';

import { Box, Button, Typography, Divider, Stack, Chip } from '@mui/material';

interface MovementControlPanelProps {
  moveToSemanticPosition: (label: string, priority?: number) => Promise<void>;
  availablePositions: string[];
}

// Map semantic positions to user-friendly labels
const getPositionLabel = (position: string): string => {
  const labelMap: Record<string, string> = {
    user1: 'User 1',
    user2: 'User 2',
    origin: 'Origin',
    center: 'Center',
    storage: 'Storage',
    home: 'Home'
  };
  return labelMap[position] || position.charAt(0).toUpperCase() + position.slice(1);
};

// Get button color based on position type
const getPositionColor = (position: string) => {
  if (position === 'origin' || position === 'home') return 'warning';
  if (position.includes('user')) return 'primary';
  return 'inherit';
};

export default function MovementControlPanel({
  moveToSemanticPosition,
  availablePositions,
}: MovementControlPanelProps) {
  if (!availablePositions || availablePositions.length === 0) {
    return (
      <Box minWidth={200}>
        <Typography variant='h6'>Movement</Typography>
        <Divider sx={{ mb: 1 }} />
        <Typography variant='body2' color='text.secondary'>
          No positions configured
        </Typography>
      </Box>
    );
  }

  return (
    <Box minWidth={200}>
      <Typography variant='h6'>Movement</Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        {availablePositions.map((position) => (
          <Button
            key={position}
            variant='outlined'
            color={getPositionColor(position)}
            onClick={() => moveToSemanticPosition(position)}
          >
            Go to {getPositionLabel(position)}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
