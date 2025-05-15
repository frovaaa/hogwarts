# Run the server

`npm run dev`

# NOTES

Open the scene

Run in command line of coppeliaSim

simRobomaster = require('simRobomaster')

I also had to download the models from the branch 4.4 of
https://github.com/jeguzzi/robomaster_sim/tree/main

ros2 bridge server run with:
`ros2 launch rosbridge_server rosbridge_websocket_launch.xml`

Start ssh server to connect vscode if in hyper-v:
`sudo systemctl start ssh`

navigation server
`ros2 run navigation_world_ref_action_server navigation_world_ref_action_server_node`

# STARTUP

Open coppeliaSim and run the simulation

`ros2 launch robomaster_ros ep.launch name:=robomaster conn_type:=ap`

`ros2 launch rosbridge_server rosbridge_websocket_launch.xml`

`ros2 run navigation_world_ref_action_server navigation_world_ref_action_server_node`

`ros2 launch move_arm_action_server move_arm_action_server_node.launch.xml`

## Arm motion action

`ros2 action send_goal /robomaster/move_arm_motion robomaster_hri_msgs/action/MoveArmMotion "{motion_type: 1}" --feedback`

## Close and open box (move arm up and down with gripper closed)

### Close box (Arm up)

`ros2 action send_goal /robomaster/move_arm_pose robomaster_hri_msgs/action/MoveArmPose "{pose_type: 2}" --feedback`

### Open box (Arm down)

`ros2 action send_goal /robomaster/move_arm_pose robomaster_hri_msgs/action/MoveArmPose "{pose_type: 4}" --feedback`

## Gripper actions

### Close

`ros2 action send_goal /robomaster/gripper robomaster_msgs/action/GripperControl "{target_state: 2, power: 0.5}" --feedback`

### Open

`ros2 action send_goal /robomaster/gripper robomaster_msgs/action/GripperControl "{target_state: 1, power: 0.5}" --feedback`

## Audio

### Play sound

Change the sound_id to play different sounds.

`ros2 topic pub /robomaster/cmd_sound robomaster_msgs/msg/SpeakerCommand "{control: 1, sound_id: 263, times: 1}" --once`

## Optitrack rotation of world

`ros2 run tf2_ros static_transform_publisher 0 0 0 -1.5707963 0 -1.5707963 world_enu world`

`ros2 launch optitrack_ros_py all.launch`
