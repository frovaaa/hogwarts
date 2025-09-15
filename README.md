# STARTUP

Notice that this setup can be used also in simulation, e.g. CoppeliaSim

These are the various packages to be run in the environment with ROS2 installed. The version of ROS2 used in our experiments is `humble`

These are the commands to run the various packages.

Refer to the original documentations of the packages for how-to instructions.

`ros2 launch robomaster_ros ep.launch name:=robomaster conn_type:=ap`

`ros2 launch rosbridge_server rosbridge_websocket_launch.xml`

`ros2 run navigation_world_ref_action_server navigation_world_ref_action_server_node`

`ros2 launch move_arm_action_server move_arm_action_server_node.launch.xml`

`ros2 run safety panic_handler_node`

## Safety Panic Stop

By publishing any message to the topic `/robomaster/panic` the robot will stop all its movements and actions.

`ros2 topic pub /robomaster/panic std_msgs/msg/Empty "{}"`

## Arm motion action

`ros2 action send_goal /robomaster/move_arm_motion robomaster_hri_msgs/action/MoveArmMotion "{motion_type: 1}" --feedback`

## Close and open box (move arm up and down with gripper closed)

### Close box (Arm up)

`ros2 action send_goal /robomaster/move_arm_pose robomaster_hri_msgs/action/MoveArmPose "{pose_type: 2}" --feedback`

### Open box (Arm down)

`ros2 action send_goal /robomaster/move_arm_pose robomaster_hri_msgs/action/MoveArmPose "{pose_type: 4}" --feedback`

## Running the Dashboard

First we need to run the dashboard with the command

`npm run dev`

After that, we need to run the middleware.

Go to the folder `ros-server` and run

`node index.js`

to startup the middleware which will connect to the `rosbridge` package.
