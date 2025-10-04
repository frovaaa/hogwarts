export interface RobotTopicConfig {
  // Core navigation topics
  cmdVel: string;
  odom: string;

  // Camera topics
  rgbCamera?: string;

  // Action server topics (for robot-specific actions)
  moveRobotAction?: string;
  moveArmAction?: string;

  // Semantic/Generic action topics (publish std_msgs/String JSON commands)
  // Robot-specific topics
  leds?: string;
  sound?: string;
  panic?: string;
  gripper?: string;
  // Semantic arm topic (publish JSON string commands like movement)
  arm?: string;

  // External tracking (OptiTrack, etc.)
  externalPose?: string;

  // Semantic command topics
  gotoPosition?: string;
}


export interface RobotMovementParams {
  maxLinearSpeed: number; // m/s
  maxAngularSpeed: number; // rad/s
  rotationSpeed: number; // rad/s for feedback rotations
  backwardDistance: number; // meters for negative feedback
  backwardDuration: number; // milliseconds
  wigglePhase1?: number; // seconds for phase 1 (+)
  wigglePhase2?: number; // seconds for phase 2 (-)
  wigglePhase3?: number; // seconds for phase 3 (+)
  wiggleRateHz?: number; // publish rate
}

export interface RobotConfig {
  name: string;
  displayName: string;
  description: string;
  topics: RobotTopicConfig;
  movementParams: RobotMovementParams;
  capabilities: {
    hasCamera: boolean;
    hasMovement: boolean;
    hasArm: boolean;
    hasGripper: boolean;
    hasLeds: boolean;
    hasSound: boolean;
    hasPanic: boolean;
    hasRecording: boolean;
  };
  semanticPositions?: string[];
  // Optional lists to define semantic arm and gripper actions shown in UI
  semanticArmActions?: string[];
  semanticGripperActions?: string[];
  // Topics to record when experiment recording is enabled
  recordingTopics?: string[];
}

// Robot configurations cache
let ROBOT_CONFIGS: Record<string, RobotConfig> = {};

/**
 * Load robot configuration from JSON file
 */
async function loadRobotConfig(robotName: string): Promise<RobotConfig | null> {
  try {
    const response = await fetch(`/config/robots/${robotName}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load robot config: ${response.statusText}`);
    }
    const config = await response.json();
    return config as RobotConfig;
  } catch (error) {
    console.error(`Error loading robot config for ${robotName}:`, error);
    return null;
  }
}

/**
 * Load all available robot configurations from the server
 */
export async function loadAllRobotConfigs(): Promise<
  Record<string, RobotConfig>
> {
  try {
    // First try to get the list from the server API
    const response = await fetch('http://localhost:4000/robot/configs/list');

    if (response.ok) {
      const { configs } = await response.json();
      const configMap: Record<string, RobotConfig> = {};

      // Load each config
      for (const configInfo of configs) {
        const config = await loadRobotConfig(configInfo.name);
        if (config) {
          configMap[config.name] = config;
        }
      }

      ROBOT_CONFIGS = configMap;
      return configMap;
    }
  } catch (error) {
    console.warn(
      'Could not load configs from server, falling back to hardcoded list:',
      error
    );
  }

  // Fallback to hardcoded list if server is not available
  try {
    const robotNames = ['robomaster', 'tiago'];
    const configs: Record<string, RobotConfig> = {};

    for (const robotName of robotNames) {
      const config = await loadRobotConfig(robotName);
      if (config) {
        configs[robotName] = config;
      }
    }

    ROBOT_CONFIGS = configs;
    return configs;
  } catch (error) {
    console.error('Error loading robot configurations:', error);
    return {};
  }
}

/**
 * Get all loaded robot configurations
 */
export function getAllRobotConfigs(): Record<string, RobotConfig> {
  return ROBOT_CONFIGS;
}

/**
 * Save a new robot configuration
 */
export async function saveRobotConfig(config: RobotConfig): Promise<boolean> {
  try {
    // Try to save to server first
    const response = await fetch('http://localhost:4000/robot/configs/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      // Update local cache
      ROBOT_CONFIGS[config.name] = config;
      return true;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save configuration');
    }
  } catch (error) {
    console.warn(
      'Could not save to server, falling back to localStorage:',
      error
    );

    // Fallback to localStorage
    try {
      ROBOT_CONFIGS[config.name] = config;

      const savedConfigs = JSON.parse(
        localStorage.getItem('customRobotConfigs') || '{}'
      );
      savedConfigs[config.name] = config;
      localStorage.setItem('customRobotConfigs', JSON.stringify(savedConfigs));

      return true;
    } catch (localError) {
      console.error(
        'Error saving robot configuration to localStorage:',
        localError
      );
      return false;
    }
  }
}

/**
 * Load custom robot configurations from localStorage
 */
export function loadCustomRobotConfigs(): Record<string, RobotConfig> {
  try {
    const savedConfigs = JSON.parse(
      localStorage.getItem('customRobotConfigs') || '{}'
    );
    return savedConfigs;
  } catch (error) {
    console.error('Error loading custom robot configurations:', error);
    return {};
  }
}

/**
 * Delete a robot configuration
 */
export async function deleteRobotConfig(robotName: string): Promise<boolean> {
  try {
    // Try to delete from server first
    const response = await fetch(
      `http://localhost:4000/robot/configs/${robotName}`,
      {
        method: 'DELETE',
      }
    );

    if (response.ok) {
      // Remove from cache
      delete ROBOT_CONFIGS[robotName];
      return true;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete configuration');
    }
  } catch (error) {
    console.warn(
      'Could not delete from server, falling back to localStorage:',
      error
    );

    // Fallback to localStorage deletion
    try {
      delete ROBOT_CONFIGS[robotName];

      const savedConfigs = JSON.parse(
        localStorage.getItem('customRobotConfigs') || '{}'
      );
      delete savedConfigs[robotName];
      localStorage.setItem('customRobotConfigs', JSON.stringify(savedConfigs));

      return true;
    } catch (localError) {
      console.error(
        'Error deleting robot configuration from localStorage:',
        localError
      );
      return false;
    }
  }
}

/**
 * Get default robot configuration (fallback)
 */
export const getDefaultRobotConfig = (): RobotConfig => {
  // If no configs are loaded, return a basic fallback
  const configs = getAllRobotConfigs();
  const configNames = Object.keys(configs);

  if (configNames.length > 0) {
    return configs[configNames[0]];
  }

  // Fallback configuration if no configs are available
  return {
    name: 'default',
    displayName: 'Default Robot',
    description: 'Default robot configuration',
    topics: {
      cmdVel: '/cmd_vel',
      odom: '/odom',
      gotoPosition: '/dashboard/movement',
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
      hasRecording: false,
    },
  };
};

/**
 * Get robot configuration by name
 */
export const getRobotConfig = (robotName: string): RobotConfig => {
  const configs = getAllRobotConfigs();
  return configs[robotName] || getDefaultRobotConfig();
};
