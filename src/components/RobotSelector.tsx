import React, { useState, useEffect } from "react";
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
  SelectChangeEvent,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  RobotConfig,
  saveRobotConfig,
  deleteRobotConfig,
} from "../config/robotConfig";
import { useRosContext } from "../hooks/useRosContext";
import { useTopics } from "../hooks/useTopics";
import RobotConfigWizard from "./RobotConfigWizard";

export default function RobotSelector() {
  const {
    robotConfig,
    setRobotType,
    ros,
    connected,
    availableConfigs,
    refreshConfigs,
  } = useRosContext();
  const { topics, refreshTopics } = useTopics(ros, connected);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RobotConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleRobotChange = (event: SelectChangeEvent) => {
    const robotName = event.target.value;
    setRobotType(robotName);
  };

  const handleCreateRobot = () => {
    setEditingConfig(null);
    setWizardOpen(true);
  };

  const handleEditRobot = () => {
    setEditingConfig(robotConfig);
    setWizardOpen(true);
  };

  const handleDeleteRobot = () => {
    setConfigToDelete(robotConfig.name);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRobot = async () => {
    if (configToDelete) {
      const success = await deleteRobotConfig(configToDelete);
      if (success) {
        // Refresh configs from context
        await refreshConfigs();

        // Switch to another config if we deleted the current one
        if (robotConfig.name === configToDelete) {
          const remainingConfigs = Object.keys(availableConfigs);
          if (remainingConfigs.length > 0) {
            setRobotType(remainingConfigs[0]);
          }
        }

        setSnackbar({
          open: true,
          message: "Robot configuration deleted successfully",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Error deleting robot configuration",
          severity: "error",
        });
      }
    }
    setDeleteDialogOpen(false);
    setConfigToDelete("");
  };

  const handleSaveRobot = async (config: RobotConfig): Promise<boolean> => {
    const success = await saveRobotConfig(config);
    if (success) {
      // Refresh configs from context
      await refreshConfigs();

      // Switch to the new/updated config
      setRobotType(config.name);

      setSnackbar({
        open: true,
        message: editingConfig
          ? "Robot configuration updated successfully"
          : "Robot configuration created successfully",
        severity: "success",
      });

      return true;
    } else {
      setSnackbar({
        open: true,
        message: "Error saving robot configuration",
        severity: "error",
      });
      return false;
    }
  };

  const handleRefreshConfigs = async () => {
    try {
      await refreshConfigs();

      setSnackbar({
        open: true,
        message: "Robot configurations refreshed",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error refreshing configurations",
        severity: "error",
      });
    }
  };

  const renderCapabilities = (
    capabilities: typeof robotConfig.capabilities,
  ) => {
    const capabilityList = [
      { key: "hasMovement", label: "Movement", color: "info" as const },
      { key: "hasCamera", label: "RGB Camera", color: "primary" as const },
      { key: "hasArm", label: "Arm", color: "success" as const },
      { key: "hasLeds", label: "LEDs", color: "error" as const },
      { key: "hasSound", label: "Sound", color: "default" as const },
      { key: "hasPanic", label: "Panic", color: "warning" as const },
    ];

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {capabilityList.map(
          ({ key, label, color }) => {
            const hasCapability = capabilities[key as keyof typeof capabilities];
            return hasCapability ? (
              <Chip key={key} label={label} color={color} size="small" />
            ) : null;
          },
        )}
      </Stack>
    );
  };

  const canDelete =
    robotConfig.name !== "robomaster" && robotConfig.name !== "tiago";
  const canEdit = true; // Allow editing of all configs

  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Robot Configuration</Typography>
          <Box display="flex" gap={1}>
            <IconButton
              size="small"
              onClick={handleRefreshConfigs}
              title="Refresh Configurations"
            >
              <RefreshIcon />
            </IconButton>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleCreateRobot}
              variant="outlined"
            >
              New Robot
            </Button>
          </Box>
        </Box>

        <FormControl fullWidth margin="normal">
          <InputLabel id="robot-select-label">Robot Type</InputLabel>
          <Select
            labelId="robot-select-label"
            id="robot-select"
            value={robotConfig.name}
            label="Robot Type"
            onChange={handleRobotChange}
          >
            {Object.values(availableConfigs).map((config) => (
              <MenuItem key={config.name} value={config.name}>
                {config.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box mt={2}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2" gutterBottom>
              Current Robot: <strong>{robotConfig.displayName}</strong>
            </Typography>
            <Box display="flex" gap={1}>
              {canEdit && (
                <IconButton
                  size="small"
                  onClick={handleEditRobot}
                  title="Edit Configuration"
                >
                  <EditIcon />
                </IconButton>
              )}
              {canDelete && (
                <IconButton
                  size="small"
                  onClick={handleDeleteRobot}
                  title="Delete Configuration"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {robotConfig.description}
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
            Capabilities:
          </Typography>
          {renderCapabilities(robotConfig.capabilities)}
        </Box>
      </Paper>

      <RobotConfigWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSaveRobot}
        editConfig={editingConfig}
        availableTopics={topics}
        onRefreshTopics={refreshTopics}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Robot Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the robot configuration "
            {configToDelete}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteRobot}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
