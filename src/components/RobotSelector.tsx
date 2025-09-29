import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Paper, 
  Box,
  Chip,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import { ROBOT_CONFIGS } from '../config/robotConfig';
import { useRosContext } from '../hooks/useRosContext';

export default function RobotSelector() {
  const { robotConfig, setRobotType } = useRosContext();

  const handleRobotChange = (event: SelectChangeEvent) => {
    const robotName = event.target.value;
    setRobotType(robotName);
  };

  const renderCapabilities = (capabilities: typeof robotConfig.capabilities) => {
    const capabilityList = [
      { key: 'hasCamera', label: 'RGB Camera', color: 'primary' as const },
      { key: 'hasDepthCamera', label: 'Depth Camera', color: 'secondary' as const },
      { key: 'hasArm', label: 'Arm', color: 'success' as const },
      { key: 'hasLaser', label: 'Laser Scanner', color: 'warning' as const },
      { key: 'hasIMU', label: 'IMU', color: 'info' as const },
      { key: 'hasSonar', label: 'Sonar', color: 'default' as const },
      { key: 'hasLeds', label: 'LEDs', color: 'error' as const },
      { key: 'hasSound', label: 'Sound', color: 'default' as const }
    ];

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {capabilityList.map(({ key, label, color }) => 
          capabilities[key as keyof typeof capabilities] && (
            <Chip 
              key={key} 
              label={label} 
              color={color}
              size="small" 
            />
          )
        )}
      </Stack>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Robot Configuration
      </Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="robot-select-label">Robot Type</InputLabel>
        <Select
          labelId="robot-select-label"
          id="robot-select"
          value={robotConfig.name}
          label="Robot Type"
          onChange={handleRobotChange}
        >
          {Object.values(ROBOT_CONFIGS).map((config) => (
            <MenuItem key={config.name} value={config.name}>
              {config.displayName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle2" gutterBottom>
          Current Robot: <strong>{robotConfig.displayName}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {robotConfig.description}
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
          Capabilities:
        </Typography>
        {renderCapabilities(robotConfig.capabilities)}
      </Box>
    </Paper>
  );
}