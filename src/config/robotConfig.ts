export interface RobotTopicConfig {
  // Core navigation topics
  cmdVel: string;
  odom: string;
  
  // Camera topics  
  rgbCamera?: string;
  depthCamera?: string;
  cameraInfo?: string;
  
  // Sensor topics
  imu?: string;
  laser?: string;
  sonar?: string;
  
  // Manipulation topics (for robots with arms)
  jointStates?: string;
  
  // Action server topics (for robot-specific actions)
  moveRobotAction?: string;
  moveArmAction?: string;
  gripperAction?: string;
  
  // Robot-specific topics
  leds?: string;
  sound?: string;
  panic?: string;
  
  // External tracking (OptiTrack, etc.)
  externalPose?: string;
}

export interface RobotConfig {
  name: string;
  displayName: string;
  description: string;
  topics: RobotTopicConfig;
  capabilities: {
    hasCamera: boolean;
    hasDepthCamera: boolean;
    hasArm: boolean;
    hasLeds: boolean;
    hasSound: boolean;
    hasLaser: boolean;
    hasSonar: boolean;
    hasIMU: boolean;
  };
}

export const ROBOT_CONFIGS: Record<string, RobotConfig> = {
  robomaster: {
    name: 'robomaster',
    displayName: 'RoboMaster S1',
    description: 'DJI RoboMaster S1 educational robot',
    topics: {
      cmdVel: '/robomaster/cmd_vel',
      odom: '/robomaster/odom',
      rgbCamera: '/robomaster/camera/image_color',
      moveRobotAction: '/robomaster/move_robot_world_ref',
      moveArmAction: '/robomaster/move_arm_pose',
      gripperAction: '/robomaster/gripper',
      leds: '/robomaster/leds/color',
      sound: '/robomaster/cmd_sound',
      panic: '/robomaster/panic',
      externalPose: '/optitrack/robomaster_frova'
    },
    capabilities: {
      hasCamera: true,
      hasDepthCamera: false,
      hasArm: true,
      hasLeds: true,
      hasSound: true,
      hasLaser: false,
      hasSonar: false,
      hasIMU: false
    }
  },
  
  tiago: {
    name: 'tiago',
    displayName: 'TIAGo Robot',
    description: 'PAL Robotics TIAGo mobile manipulator robot',
    topics: {
      cmdVel: '/cmd_vel',
      odom: '/mobile_base_controller/odom',
      rgbCamera: '/head_front_camera/rgb/image_raw',
      depthCamera: '/head_front_camera/depth/image_raw',
      cameraInfo: '/head_front_camera/rgb/camera_info',
      jointStates: '/joint_states',
      // TIAGo would use different action servers for arm control
      moveArmAction: '/arm_controller/joint_trajectory',
      gripperAction: '/gripper_controller/joint_trajectory',  
      imu: '/base_imu',
      laser: '/scan_raw',
      sonar: '/sonar_base'
    },
    capabilities: {
      hasCamera: true,
      hasDepthCamera: true,
      hasArm: true,
      hasLeds: false,
      hasSound: false,
      hasLaser: true,
      hasSonar: true,
      hasIMU: true
    }
  }
};

export const getDefaultRobotConfig = (): RobotConfig => ROBOT_CONFIGS.robomaster;

export const getRobotConfig = (robotName: string): RobotConfig => {
  return ROBOT_CONFIGS[robotName] || getDefaultRobotConfig();
};