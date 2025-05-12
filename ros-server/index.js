/* eslint-disable @typescript-eslint/no-require-imports */
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

app.post('/generic-action', async (req, res) => {
  try {
    const { actionName, actionType, goal: goalData } = req.body;

    if (!actionName || !actionType || !goalData) {
      return res.status(400).json({
        error: 'Missing actionName, actionType, or goal in request body',
      });
    }

    if (!node) {
      console.error('ROS 2 node is not initialized yet.');
      return res.status(503).json({
        error: 'ROS 2 node not initialized. Please try again shortly.',
      });
    }

    console.log(
      `Received request for generic action: Name: ${actionName}, Type: ${actionType}`
    );

    const actionClient = new rclnodejs.ActionClient(
      node,
      actionType, // Use actionType from request
      actionName // Use actionName from request
    );

    console.log(`Waiting for action server ${actionName} (${actionType})...`);
    const serverAvailable = await actionClient.waitForServer(2000); // Wait for 2 seconds
    if (!serverAvailable) {
      const errorMessage = `Action server ${actionName} (${actionType}) not available.`;
      console.error(errorMessage);
      return res.status(503).json({ error: errorMessage });
    }
    console.log(`Action server ${actionName} (${actionType}) found.`);

    console.log(
      `Sending goal to ${actionName} (${actionType}):`,
      JSON.stringify(goalData, null, 2)
    );

    const goalHandle = await actionClient.sendGoal(goalData);
    console.log(`Goal sent to ${actionName}, waiting for result...`);
    const result = await goalHandle.getResult();
    console.log(`Result received from ${actionName}:`, result);

    res.json({ result });
  } catch (err) {
    console.error(
      `Error in /generic-action (Name: ${req.body.actionName}, Type: ${req.body.actionType}):`,
      err
    );
    res.status(500).json({ error: err.message || err.toString() });
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
