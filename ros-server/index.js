const express = require('express');
const rclnodejs = require('rclnodejs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let node; // Declare the node globally

// Initialize rclnodejs and create the node once
(async () => {
  try {
    await rclnodejs.init();
    node = new rclnodejs.Node('move_robot_client');
    console.log('ROS 2 context initialized');
  } catch (err) {
    console.error('Failed to initialize ROS 2 context:', err);
    process.exit(1); // Exit if initialization fails
  }
})();

app.post('/move', async (req, res) => {
  try {
    const {
      x,
      y,
      theta,
      linear_speed,
      angular_speed,
      robot_world_ref_frame_name,
    } = req.body;

    const actionClient = new rclnodejs.ActionClient(
      node,
      'robomaster_hri_msgs/action/MoveRobotWorldRef',
      '/robomaster/move_robot_world_ref'
    );

    await actionClient.waitForServer(1000);

    // print the goal to the console
    console.log('Sending goal:', {
      x,
      y,
      theta,
      linear_speed,
      angular_speed,
      robot_world_ref_frame_name,
    });

    const goal = {
      x: parseFloat(x) || 0.0,
      y: parseFloat(y) || 0.0,
      theta: parseFloat(theta) || 0.0,
      linear_speed: parseFloat(linear_speed) || 0.0,
      angular_speed: parseFloat(angular_speed) || 0.0,
      robot_world_ref_frame_name: robot_world_ref_frame_name || '',
    };

    const goalHandle = await actionClient.sendGoal(goal);
    const result = await goalHandle.getResult();

    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Gracefully shut down the node when the process exits
process.on('SIGINT', async () => {
  console.log('Shutting down ROS 2 context...');
  if (node) {
    node.destroy();
  }
  await rclnodejs.shutdown();
  process.exit(0);
});

app.listen(4000, () => console.log('ROS server running on port 4000'));
