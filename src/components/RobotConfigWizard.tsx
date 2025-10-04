import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
  Box,
  Autocomplete,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  RobotConfig,
  RobotTopicConfig,
  RobotMovementParams,
} from '../config/robotConfig';

interface RobotConfigWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: RobotConfig) => Promise<boolean>;
  editConfig?: RobotConfig | null;
  availableTopics: string[];
  onRefreshTopics: () => void;
}

const steps = [
  'Basic Information',
  'Robot Capabilities',
  'Movement Parameters',
  'Topic Configuration',
  'Review & Save',
];

const topicDescriptions = {
  cmdVel: 'Command velocity topic for robot movement',
  odom: 'Odometry topic for robot position feedback',
  rgbCamera: 'RGB camera image topic',
  moveRobotAction: 'Action server for robot navigation',
  moveArmAction: 'Action server for arm movement',
  arm: 'Semantic arm control topic (JSON commands)',
  gripper: 'Gripper control topic (semantic JSON commands)',
  leds: 'LED control topic',
  sound: 'Sound command topic (semantic JSON commands)',
  panic: 'Emergency stop topic',
  externalPose: 'External pose tracking topic (e.g., OptiTrack)',
  gotoPosition: 'Semantic movement/position navigation topic (JSON commands)',
};

// User-friendly display names for topics
const topicDisplayNames: Record<keyof typeof topicDescriptions, string> = {
  cmdVel: 'Command Velocity',
  odom: 'Odometry',
  rgbCamera: 'RGB Camera',
  moveRobotAction: 'Robot Navigation Action',
  moveArmAction: 'Arm Movement Action',
  arm: 'Arm Control',
  gripper: 'Gripper Control',
  leds: 'LED Control',
  sound: 'Sound Control',
  panic: 'Panic/Emergency Stop',
  externalPose: 'External Pose Tracking',
  gotoPosition: 'Movement Control',
};

export default function RobotConfigWizard({
  open,
  onClose,
  onSave,
  editConfig,
  availableTopics,
  onRefreshTopics,
}: RobotConfigWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [config, setConfig] = useState<RobotConfig>({
    name: '',
    displayName: '',
    description: '',
    topics: {
      cmdVel: '',
      odom: '',
      gotoPosition: '/dashboard/movement',
      panic: '/dashboard/panic',
      sound: '/dashboard/sound',
      gripper: '/dashboard/gripper',
      arm: '/dashboard/arm',
    },
    movementParams: {
      maxLinearSpeed: 1.0,
      maxAngularSpeed: 1.0,
      rotationSpeed: 0.5,
      backwardDistance: -0.1,
      backwardDuration: 500,
    },
    capabilities: {
      hasCamera: false,
      hasMovement: true,
      hasArm: false,
      hasGripper: false,
      hasLeds: false,
      hasSound: false,
      hasPanic: false,
    },
    semanticPositions: [],
  });

  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form with edit config if provided
  useEffect(() => {
    if (editConfig) {
      setConfig(editConfig);
    } else {
      // Reset to default values when creating new config
      setConfig({
        name: '',
        displayName: '',
        description: '',
        topics: {
          cmdVel: '',
          odom: '',
          gotoPosition: '/dashboard/movement',
          panic: '/dashboard/panic',
          sound: '/dashboard/sound',
          gripper: '/dashboard/gripper',
          arm: '/dashboard/arm',
        },
        movementParams: {
          maxLinearSpeed: 1.0,
          maxAngularSpeed: 1.0,
          rotationSpeed: 0.5,
          backwardDistance: -0.1,
          backwardDuration: 500,
        },
        capabilities: {
          hasCamera: false,
          hasMovement: true,
          hasArm: false,
          hasGripper: false,
          hasLeds: false,
          hasSound: false,
          hasPanic: false,
        },
        semanticPositions: [],
      });
    }
  }, [editConfig, open]);

  const handleNext = () => {
    const validationErrors = validateStep(activeStep);
    if (validationErrors.length === 0) {
      setErrors([]);
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      setErrors(validationErrors);
    }
  };

  const handleBack = () => {
    setErrors([]);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setErrors([]);
  };

  const handleSave = async () => {
    const validationErrors = validateConfig();
    if (validationErrors.length === 0) {
      const success = await onSave(config);
      if (success) {
        onClose();
        handleReset();
      }
    } else {
      setErrors(validationErrors);
    }
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];

    switch (step) {
      case 0: // Basic Information
        if (!config.name.trim()) errors.push('Robot name is required');
        if (!config.displayName.trim()) errors.push('Display name is required');
        if (!/^[a-zA-Z0-9_-]+$/.test(config.name)) {
          errors.push(
            'Robot name can only contain letters, numbers, underscores, and hyphens'
          );
        }
        break;
      case 3: // Topic Configuration
        if (!config.topics.cmdVel.trim())
          errors.push('Command velocity topic is required');
        if (!config.topics.odom.trim())
          errors.push('Odometry topic is required');
        break;
    }

    return errors;
  };

  const validateConfig = (): string[] => {
    const errors: string[] = [];

    // Validate all steps (except review step)
    for (let i = 0; i < 4; i++) {
      errors.push(...validateStep(i));
    }

    return errors;
  };

  const updateCapability = (
    capability: keyof typeof config.capabilities,
    value: boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: value,
      },
    }));
  };

  const updateMovementParam = (
    param: keyof RobotMovementParams,
    value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      movementParams: {
        ...prev.movementParams,
        [param]: value,
      },
    }));
  };

  const updateTopic = (topicKey: keyof RobotTopicConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      topics: {
        ...prev.topics,
        [topicKey]: value,
      },
    }));
  };

  const getRequiredTopics = (): (keyof RobotTopicConfig)[] => {
    const required: (keyof RobotTopicConfig)[] = [];

    if (config.capabilities.hasMovement) {
      required.push('cmdVel', 'odom');
      // gotoPosition is optional - it will show with default value
    }
    if (config.capabilities.hasCamera) required.push('rgbCamera');
    if (config.capabilities.hasArm) {
      required.push('moveArmAction', 'arm');
    }
    if (config.capabilities.hasGripper) {
      required.push('gripper');
    }
    if (config.capabilities.hasLeds) required.push('leds');
    if (config.capabilities.hasSound) required.push('sound');
    if (config.capabilities.hasPanic) required.push('panic');

    return required;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Information
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label='Robot Name'
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
                helperText='Unique identifier for the robot (lowercase, no spaces)'
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label='Display Name'
                value={config.displayName}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                helperText='Human-friendly name shown in the interface'
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Description'
                value={config.description}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                helperText='Brief description of the robot and its purpose'
              />
            </Grid>
          </Grid>
        );

      case 1: // Robot Capabilities
        return (
          <Box>
            <Typography variant='h6' gutterBottom>
              Select Robot Capabilities
            </Typography>
            <Typography variant='body2' color='text.secondary' paragraph>
              Choose which features and sensors your robot has. This will
              determine which topics and controls are available.
            </Typography>

            <FormControl component='fieldset'>
              <FormGroup>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasMovement}
                          onChange={(e) =>
                            updateCapability('hasMovement', e.target.checked)
                          }
                        />
                      }
                      label='Movement'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasCamera}
                          onChange={(e) =>
                            updateCapability('hasCamera', e.target.checked)
                          }
                        />
                      }
                      label='RGB Camera'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasArm}
                          onChange={(e) =>
                            updateCapability('hasArm', e.target.checked)
                          }
                        />
                      }
                      label='Arm'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasGripper}
                          onChange={(e) =>
                            updateCapability('hasGripper', e.target.checked)
                          }
                        />
                      }
                      label='Gripper'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasLeds}
                          onChange={(e) =>
                            updateCapability('hasLeds', e.target.checked)
                          }
                        />
                      }
                      label='LED Lights'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasSound}
                          onChange={(e) =>
                            updateCapability('hasSound', e.target.checked)
                          }
                        />
                      }
                      label='Sound/Audio'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.capabilities.hasPanic}
                          onChange={(e) =>
                            updateCapability('hasPanic', e.target.checked)
                          }
                        />
                      }
                      label='Panic Button'
                    />
                  </Grid>
                </Grid>
              </FormGroup>
            </FormControl>
          </Box>
        );

      case 2: // Movement Parameters
        if (!config.capabilities.hasMovement) {
          return (
            <Box>
              <Typography variant='h6' gutterBottom>
                Movement Parameters
              </Typography>
              <Alert severity='info'>
                Movement capability is not enabled. Enable movement in the previous step to configure movement parameters.
              </Alert>
            </Box>
          );
        }

        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant='h6' gutterBottom>
                Movement Parameters
              </Typography>
              <Typography variant='body2' color='text.secondary' paragraph>
                Configure the robot's movement limits, behavior parameters, and semantic positions.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Max Linear Speed (m/s)'
                value={config.movementParams.maxLinearSpeed}
                onChange={(e) =>
                  updateMovementParam(
                    'maxLinearSpeed',
                    parseFloat(e.target.value) || 0
                  )
                }
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Max Angular Speed (rad/s)'
                value={config.movementParams.maxAngularSpeed}
                onChange={(e) =>
                  updateMovementParam(
                    'maxAngularSpeed',
                    parseFloat(e.target.value) || 0
                  )
                }
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Rotation Speed (rad/s)'
                value={config.movementParams.rotationSpeed}
                onChange={(e) =>
                  updateMovementParam(
                    'rotationSpeed',
                    parseFloat(e.target.value) || 0
                  )
                }
                inputProps={{ step: 0.1, min: 0 }}
                helperText='Speed for feedback rotations'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Backward Distance (m)'
                value={config.movementParams.backwardDistance}
                onChange={(e) =>
                  updateMovementParam(
                    'backwardDistance',
                    parseFloat(e.target.value) || 0
                  )
                }
                inputProps={{ step: 0.01 }}
                helperText='Distance for negative feedback (usually negative)'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Backward Duration (ms)'
                value={config.movementParams.backwardDuration}
                onChange={(e) =>
                  updateMovementParam(
                    'backwardDuration',
                    parseFloat(e.target.value) || 0
                  )
                }
                inputProps={{ step: 100, min: 0 }}
              />
            </Grid>

            {/* Semantic Positions Section */}
            {config.capabilities.hasMovement && (
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  Semantic Positions
                </Typography>
                <Typography variant='body2' color='text.secondary' paragraph>
                  Define position labels that your robot can navigate to. These will appear as buttons in the Movement panel.
                </Typography>

                <Grid container spacing={2}>
                  {(config.semanticPositions || []).map((position, index) => (
                    <Grid size={{ xs: 12, md: 6 }} key={index}>
                      <Box display='flex' alignItems='center' gap={1}>
                        <TextField
                          fullWidth
                          label={`Position ${index + 1}`}
                          value={position}
                          onChange={(e) => {
                            const newPositions = [...(config.semanticPositions || [])];
                            newPositions[index] = e.target.value;
                            setConfig(prev => ({
                              ...prev,
                              semanticPositions: newPositions
                            }));
                          }}
                          placeholder="e.g., user1, storage, home"
                        />
                        <IconButton
                          onClick={() => {
                            const newPositions = [...(config.semanticPositions || [])];
                            newPositions.splice(index, 1);
                            setConfig(prev => ({
                              ...prev,
                              semanticPositions: newPositions
                            }));
                          }}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}

                  <Grid size={12}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const newPositions = [...(config.semanticPositions || []), ''];
                        setConfig(prev => ({
                          ...prev,
                          semanticPositions: newPositions
                        }));
                      }}
                      variant="outlined"
                    >
                      Add Position
                    </Button>
                  </Grid>

                  {(!config.semanticPositions || config.semanticPositions.length === 0) && (
                    <Grid size={12}>
                      <Alert severity="info">
                        Add some common positions like "user1", "user2", "origin", "center" to get started.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            )}
            {config.capabilities.hasArm && (
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  Semantic Arm Actions
                </Typography>
                <Typography variant='body2' color='text.secondary' paragraph>
                  Define arm actions (strings) that will be published as JSON messages on the arm topic. These will appear as buttons in the Arm panel.
                </Typography>

                <Grid container spacing={2}>
                  {(config.semanticArmActions || []).map((action, index) => (
                    <Grid size={{ xs: 12, md: 6 }} key={`arm-${index}`}>
                      <Box display='flex' alignItems='center' gap={1}>
                        <TextField
                          fullWidth
                          label={`Arm action ${index + 1}`}
                          value={action}
                          onChange={(e) => {
                            const newActions = [...(config.semanticArmActions || [])];
                            newActions[index] = e.target.value;
                            setConfig(prev => ({ ...prev, semanticArmActions: newActions }));
                          }}
                          placeholder='e.g., open_box, pick_up, wave'
                        />
                        <IconButton
                          onClick={() => {
                            const newActions = [...(config.semanticArmActions || [])];
                            newActions.splice(index, 1);
                            setConfig(prev => ({ ...prev, semanticArmActions: newActions }));
                          }}
                          color='error'
                          size='small'
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}

                  <Grid size={12}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const newActions = [...(config.semanticArmActions || []), ''];
                        setConfig(prev => ({ ...prev, semanticArmActions: newActions }));
                      }}
                      variant='outlined'
                    >
                      Add Arm Action
                    </Button>
                  </Grid>

                  {(!config.semanticArmActions || config.semanticArmActions.length === 0) && (
                    <Grid size={12}>
                      <Alert severity='info'>Add arm actions like "open_box" or "pick_up" to get started.</Alert>
                    </Grid>
                  )}
                </Grid>
              </Grid>

            )}
            {config.capabilities.hasGripper && (
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  Semantic Gripper Actions
                </Typography>
              <Typography variant='body2' color='text.secondary' paragraph>
                Define gripper actions (strings) that will be published as JSON messages on the gripper topic. These will appear as buttons in the Gripper section.
              </Typography>

              <Grid container spacing={2}>
                {(config.semanticGripperActions || []).map((action, index) => (
                  <Grid size={{ xs: 12, md: 6 }} key={`grip-${index}`}>
                    <Box display='flex' alignItems='center' gap={1}>
                      <TextField
                        fullWidth
                        label={`Gripper action ${index + 1}`}
                        value={action}
                        onChange={(e) => {
                          const newActions = [...(config.semanticGripperActions || [])];
                          newActions[index] = e.target.value;
                          setConfig(prev => ({ ...prev, semanticGripperActions: newActions }));
                        }}
                        placeholder='e.g., open, close, hold'
                      />
                      <IconButton
                        onClick={() => {
                          const newActions = [...(config.semanticGripperActions || [])];
                          newActions.splice(index, 1);
                          setConfig(prev => ({ ...prev, semanticGripperActions: newActions }));
                        }}
                        color='error'
                        size='small'
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}

                <Grid size={12}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newActions = [...(config.semanticGripperActions || []), ''];
                      setConfig(prev => ({ ...prev, semanticGripperActions: newActions }));
                    }}
                    variant='outlined'
                  >
                    Add Gripper Action
                  </Button>
                </Grid>

                {(!config.semanticGripperActions || config.semanticGripperActions.length === 0) && (
                  <Grid size={12}>
                    <Alert severity='info'>Add gripper actions like "open" and "close" to get started.</Alert>
                  </Grid>
                )}
              </Grid>
              </Grid>
            )}
            {/* Optional wiggle parameters */}
            <Grid size={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Wiggle Parameters (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Wiggle Phase 1 (s)'
                        value={config.movementParams.wigglePhase1 || ''}
                        onChange={(e) =>
                          updateMovementParam(
                            'wigglePhase1',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{ step: 0.1, min: 0 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Wiggle Phase 2 (s)'
                        value={config.movementParams.wigglePhase2 || ''}
                        onChange={(e) =>
                          updateMovementParam(
                            'wigglePhase2',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{ step: 0.1, min: 0 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Wiggle Phase 3 (s)'
                        value={config.movementParams.wigglePhase3 || ''}
                        onChange={(e) =>
                          updateMovementParam(
                            'wigglePhase3',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{ step: 0.1, min: 0 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Wiggle Rate (Hz)'
                        value={config.movementParams.wiggleRateHz || ''}
                        onChange={(e) =>
                          updateMovementParam(
                            'wiggleRateHz',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{ step: 1, min: 1 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

          </Grid>
        );


      case 3: // Topic Configuration
        const requiredTopics = getRequiredTopics();
        return (
          <Box>
            <Box
              display='flex'
              alignItems='center'
              justifyContent='space-between'
              mb={2}
            >
              <Typography variant='h6'>Topic Configuration</Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={onRefreshTopics}
                size='small'
              >
                Refresh Topics
              </Button>
            </Box>

            <Typography variant='body2' color='text.secondary' paragraph>
              Map your robot's ROS topics. Required topics are marked with *,
              optional topics are based on your selected capabilities.
            </Typography>

            <Grid container spacing={2}>
              {(
                Object.keys(topicDescriptions) as (keyof RobotTopicConfig)[]
              ).map((topicKey) => {
                const isRequired = requiredTopics.includes(topicKey);
                const isRelevant =
                  isRequired ||
                  (topicKey === 'rgbCamera' && config.capabilities.hasCamera) ||
                  ((topicKey === 'cmdVel' || topicKey === 'odom' || topicKey === 'gotoPosition') &&
                    config.capabilities.hasMovement) ||
                  (topicKey === 'panic' && config.capabilities.hasPanic) ||
                  (topicKey === 'sound' && config.capabilities.hasSound) ||
                  (topicKey === 'arm' && config.capabilities.hasArm) ||
                  (topicKey === 'gripper' && config.capabilities.hasGripper);

                if (!isRelevant) return null;

                return (
                  <Grid size={12} key={topicKey}>
                    <Autocomplete
                      freeSolo
                      options={availableTopics}
                      value={config.topics[topicKey] || ''}
                      onInputChange={(event, newValue) => {
                        updateTopic(topicKey, newValue || '');
                      }}
                      onChange={(event, newValue) => {
                        updateTopic(topicKey, newValue || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`${topicDisplayNames[topicKey] || topicKey}${isRequired ? ' *' : ''}`}
                          helperText={topicDescriptions[topicKey]}
                          required={isRequired}
                        />
                      )}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );

      case 4: // Review & Save
        return (
          <Box>
            <Typography variant='h6' gutterBottom>
              Review Configuration
            </Typography>

            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle1' gutterBottom>
                Basic Information
              </Typography>
              <Typography>
                <strong>Name:</strong> {config.name}
              </Typography>
              <Typography>
                <strong>Display Name:</strong> {config.displayName}
              </Typography>
              <Typography>
                <strong>Description:</strong>{' '}
                {config.description || 'No description'}
              </Typography>
            </Paper>

            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle1' gutterBottom>
                Capabilities
              </Typography>
              <Box display='flex' flexWrap='wrap' gap={1}>
                {Object.entries(config.capabilities).map(
                  ([key, value]) =>
                    value && (
                      <Typography
                        key={key}
                        variant='body2'
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.8rem',
                        }}
                      >
                        {key.replace('has', '')}
                      </Typography>
                    )
                )}
              </Box>
            </Paper>

            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle1' gutterBottom>
                Movement Parameters
              </Typography>
              <Box display='flex' gap={2}>
                <Typography variant='body2'>
                  Max Linear: {config.movementParams.maxLinearSpeed} m/s
                </Typography>
                <Typography variant='body2'>
                  Max Angular: {config.movementParams.maxAngularSpeed} rad/s
                </Typography>
              </Box>
            </Paper>

            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant='subtitle1' gutterBottom>
                Topic Mappings
              </Typography>
              {Object.entries(config.topics).map(
                ([key, value]) =>
                  value && (
                    <Typography key={key} variant='body2'>
                      <strong>{key}:</strong> {value}
                    </Typography>
                  )
              )}
            </Paper>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {editConfig
          ? 'Edit Robot Configuration'
          : 'Create New Robot Configuration'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 3, mb: 2 }}>
            {errors.length > 0 && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </Alert>
            )}

            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleSave} variant='contained'>
            {editConfig ? 'Update' : 'Create'} Robot
          </Button>
        ) : (
          <Button onClick={handleNext} variant='contained'>
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
