// Create necessary directories
const express = require('express');
const rclnodejs = require('rclnodejs');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');

let node; // Global ROS 2 node reference
let bagProcess = null;
let currentBagPath = null; 

const logsDir = './experiment_logs';
const bagsDir = './experiment_bags';

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created experiment_logs directory');
}

if (!fs.existsSync(bagsDir)) {
  fs.mkdirSync(bagsDir, { recursive: true });
  console.log('Created experiment_bags directory');
}


const app = express();
app.use(cors());
app.use(express.json());


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
// ROS2 Bag Recording Endpoints
// ------------------------------------------------------

// Start bag recording
app.post('/bag/start', (req, res) => {
  try {
    if (bagProcess) {
      return res.status(400).json({ error: 'Bag recording already in progress' });
    }

    const { topics, outputPath, sessionName } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bagPath = outputPath || `./experiment_bags/${sessionName || 'session'}_${timestamp}`;
    
    // Default topics to record
    const topicsList = topics || [
      '/robomaster/cmd_vel',
      '/robomaster/cmd_wheels',
      '/robomaster/cmd_arm',
      '/robomaster/mov_arm_pose',
      '/robomaster/gripper',
      '/robomaster/leds/color',
      '/robomaster/leds/effect',
      '/robomaster/cmd_sound',
      '/robomaster/panic',
      '/robomaster/state',
      '/robomaster/odom',
      '/robomaster/joint_states',
      '/robomaster/imu',
      '/robomaster/battery',
      '/robomaster/pose_world_ref',
      '/tf',
      '/tf_static',
      '/rosout',
      '/experiment/event'
    ];
    
    console.log(`Starting bag recording to: ${bagPath}`);
    console.log(`Recording topics: ${topicsList.join(', ')}`);
    
    // ros2 bag record -o output_path topic1 topic2 topic3
    bagProcess = spawn('ros2', ['bag', 'record', '-o', bagPath, ...topicsList], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    currentBagPath = bagPath;

    bagProcess.stdout.on('data', (data) => {
      console.log(`[ros2 bag] ${data.toString().trim()}`);
    });

    bagProcess.stderr.on('data', (data) => {
      console.error(`[ros2 bag error] ${data.toString().trim()}`);
    });

    bagProcess.on('error', (error) => {
      console.error('Bag recording error:', error);
      bagProcess = null;
      currentBagPath = null;
    });

    bagProcess.on('close', (code) => {
      console.log(`Bag recording process exited with code ${code}`);
      bagProcess = null;
      currentBagPath = null;
    });

    res.json({ 
      success: true,
      message: 'Bag recording started', 
      path: bagPath,
      topics: topicsList 
    });
  } catch (error) {
    console.error('Error starting bag recording:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop bag recording
app.post('/bag/stop', (req, res) => {
  try {
    if (!bagProcess) {
      return res.status(400).json({ error: 'No bag recording in progress' });
    }

    console.log('Stopping bag recording...');
    bagProcess.kill('SIGINT'); // Graceful shutdown
    
    setTimeout(() => {
      const stoppedPath = currentBagPath;
      bagProcess = null;
      currentBagPath = null;
      
      res.json({ 
        success: true,
        message: 'Bag recording stopped', 
        path: stoppedPath 
      });
    }, 2000); // Give it time to save properly
  } catch (error) {
    console.error('Error stopping bag recording:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bag recording status
app.get('/bag/status', (req, res) => {
  res.json({
    recording: !!bagProcess,
    path: currentBagPath,
    pid: bagProcess ? bagProcess.pid : null
  });
});

// ------------------------------------------------------
// Experiment Log Management Endpoints
// ------------------------------------------------------

// Download experiment logs as JSONL
app.get('/experiment/logs/download/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const filePath = `./experiment_logs/${sessionId}.jsonl`;
  
  res.download(filePath, `experiment_${sessionId}.jsonl`, (err) => {
    if (err) {
      console.error('Error downloading log file:', err);
      res.status(404).json({ error: 'Log file not found' });
    }
  });
});

// Save experiment logs as JSONL
app.post('/experiment/logs/save', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { sessionId, logs } = req.body;
    
    if (!sessionId || !logs) {
      return res.status(400).json({ error: 'Missing sessionId or logs' });
    }
    
    const logsDir = './experiment_logs';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const filePath = path.join(logsDir, `${sessionId}.jsonl`);
    fs.writeFileSync(filePath, logs);
    
    res.json({ 
      success: true, 
      message: 'Logs saved successfully',
      path: filePath 
    });
  } catch (error) {
    console.error('Error saving log file:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available experiment log files
app.get('/experiment/logs/list', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const logsDir = './experiment_logs';
    if (!fs.existsSync(logsDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          sessionId: file.replace('.jsonl', ''),
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing log files:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------
process.on('SIGINT', async () => {
  console.log('Shutting down …');
  try {
    // Stop bag recording if running
    if (bagProcess) {
      console.log('Stopping bag recording before shutdown...');
      bagProcess.kill('SIGINT');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (node) node.destroy();
    await rclnodejs.shutdown();
  } finally {
    process.exit(0);
  }
});

app.listen(4000, () => console.log('ROS server running on port 4000'));
