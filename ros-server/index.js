/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const rclnodejs = require('rclnodejs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let node; // Global ROS 2 node reference

// ------------------------------------------------------
// ROS 2 initialisation
// ------------------------------------------------------
(async () => {
  try {
    await rclnodejs.init();

    // Create + spin a node so DDS callbacks are processed continuously
    node = rclnodejs.createNode('move_robot_client');
    node.spin();

    console.log('ROS 2 context initialised');
  } catch (err) {
    console.error('Failed to initialise ROS 2 context:', err);
    process.exit(1); // hard‑fail if ROS 2 can’t start
  }
})();

// ------------------------------------------------------
// Generic‑action REST endpoint
// ------------------------------------------------------
/**
 * POST /generic-action
 * {
 *   "actionName": "/robomaster/move_robot_world_ref",
 *   "actionType": "robomaster_hri_msgs/action/MoveRobotWorldRef",
 *   "goal": { /* fields matching <actionType>.Goal *\/ }
 * }
 */
app.post('/generic-action', async (req, res) => {
  try {
    const { actionName, actionType, goal: goalData } = req.body || {};

    if (!actionName || !actionType || !goalData) {
      return res.status(400).json({
        error: 'Missing actionName, actionType, or goal in request body',
      });
    }

    if (!node) {
      console.error('[generic-action] ROS node not ready yet');
      return res
        .status(503)
        .json({ error: 'ROS 2 node not initialised yet, try again shortly.' });
    }

    console.log(`Received request: ${actionName} (${actionType})`);

    // Dynamically load the generated interface (throws if the package is missing)
    const ActionInterface = rclnodejs.require(actionType);

    // Create an ActionClient for this (type,name) pair
    const actionClient = new rclnodejs.ActionClient(
      node,
      actionType,
      actionName
    );

    console.log(`Waiting for server ${actionName} …`);
    const available = await actionClient.waitForServer(5000);
    if (!available) {
      return res.status(503).json({
        error: `Action server ${actionName} (${actionType}) not available`,
      });
    }
    console.log(`Server found — sending goal`);

    // Wrap the incoming goalData in a proper <Type>.Goal instance
    const goalMsg = new ActionInterface.Goal(goalData);

    const goalHandle = await actionClient.sendGoal(goalMsg);

    // ------------------------------------------------------------------
    // Await the result
    // ------------------------------------------------------------------
    let resultMsg;
    try {
      resultMsg = await goalHandle.getResult(); // rclnodejs returns only the .Result message
    } catch (err) {
      console.error('getResult() failed:', err);
      return res
        .status(504)
        .json({ error: 'Timed-out waiting for action result' });
    }

    const status = goalHandle.status; // GoalStatus code (0 = UNKNOWN, 4 = SUCCEEDED, …)

    console.log('Action finished — status:', status, 'result:', resultMsg);

    // Ensure HTTP reply is JSON‑serialisable; if the Result contains nested
    // ROS 2 message wrappers we strip the raw object via toJSON() fallback
    const safeResult = JSON.parse(JSON.stringify(resultMsg));

    return res.json({ status, result: safeResult });
  } catch (err) {
    console.error('[generic-action] fatal error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// ------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------
process.on('SIGINT', async () => {
  console.log('Shutting down …');
  try {
    if (node) node.destroy();
    await rclnodejs.shutdown();
  } finally {
    process.exit(0);
  }
});

app.listen(4000, () => console.log('ROS server running on port 4000'));
