import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics
const errorCounter = new Counter('errors');
const loginSuccessRate = new Rate('login_success_rate');
const taskCreationRate = new Rate('task_creation_success_rate');
const autoAssignSuccessRate = new Rate('auto_assign_success_rate');
const taskCompletionRate = new Rate('task_completion_success_rate');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp-up to 10 users over 2 minutes
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 50 }, // Ramp-up to 50 users over 2 minutes
    { duration: '5m', target: 50 }, // Stay at 50 users for 5 minutes
    { duration: '2m', target: 0 },  // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    login_success_rate: ['rate>0.9'],  // Login success rate should be above 90%
    task_creation_success_rate: ['rate>0.9'], // Task creation success rate should be above 90%
    auto_assign_success_rate: ['rate>0.8'], // Auto-assign success rate should be above 80%
    task_completion_success_rate: ['rate>0.8'], // Task completion success rate should be above 80%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

let authTokens = [];
let taskTypeIds = [];
let userIds = [];
let machineIds = [];
let taskIds = [];

// Setup function - runs once before the test
export function setup() {
  console.log('Setting up test data for realistic user workflows...');
  
  // Create admin user
  const adminPayload = {
    userName: `admin_${Date.now()}`,
    password: 'testpass123',
    userRole: 'admin'
  };
  
  let response = http.post(`${BASE_URL}/users`, JSON.stringify(adminPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status !== 201) {
    console.error('Failed to create admin user:', response.body);
    return {};
  }
  
  const adminUser = JSON.parse(response.body);
  
  // Login as admin
  response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    userName: adminUser.userName,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status !== 200) {
    console.error('Failed to login as admin:', response.body);
    return {};
  }
  
  const adminAuth = JSON.parse(response.body);
  const adminToken = adminAuth.token;
  
  // Admin workflow: Create task types
  const taskTypes = [
    { taskName: 'Electric_Test', number_of_machine: 2, color: '#FF5733' },
    { taskName: 'Temperature_Test', number_of_machine: 1, color: '#33FF57' },
    { taskName: 'Pressure_Test', number_of_machine: 3, color: '#3357FF' },
    { taskName: 'Quality_Control', number_of_machine: 1, color: '#FF33F5' }
  ];
  
  const createdTaskTypes = [];
  for (const taskType of taskTypes) {
    response = http.post(`${BASE_URL}/task-types`, JSON.stringify(taskType), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });
    if (response.status === 201) {
      createdTaskTypes.push(JSON.parse(response.body));
    }
  }
  
  // Admin workflow: Create worker users and assign task types
  const createdWorkers = [];
  for (let i = 1; i <= 8; i++) {
    const userPayload = {
      userName: `worker_${Date.now()}_${i}`,
      password: 'testpass123',
      userRole: 'worker'
    };
    
    response = http.post(`${BASE_URL}/users`, JSON.stringify(userPayload), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status === 201) {
      const user = JSON.parse(response.body);
      createdWorkers.push(user);
      
      // Assign 1-3 random task types to each worker
      const numSkills = Math.ceil(Math.random() * 3);
      const shuffledTaskTypes = [...createdTaskTypes].sort(() => 0.5 - Math.random());
      
      for (let j = 0; j < numSkills && j < shuffledTaskTypes.length; j++) {
        http.post(`${BASE_URL}/users/${user._id}/add-task-type`, JSON.stringify({
          taskTypeId: shuffledTaskTypes[j]._id
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
        });
      }
    }
  }
  
  // Admin workflow: Create leader users
  const createdLeaders = [];
  for (let i = 1; i <= 3; i++) {
    const userPayload = {
      userName: `leader_${Date.now()}_${i}`,
      password: 'testpass123',
      userRole: 'leader'
    };
    
    response = http.post(`${BASE_URL}/users`, JSON.stringify(userPayload), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status === 201) {
      const user = JSON.parse(response.body);
      createdLeaders.push(user);
    }
  }
  
  // Admin workflow: Create machines and assign task types
  const createdMachines = [];
  for (let i = 1; i <= 15; i++) {
    // Each machine can handle 1-2 task types
    const numTaskTypes = Math.ceil(Math.random() * 2);
    const shuffledTaskTypes = [...createdTaskTypes].sort(() => 0.5 - Math.random());
    const machineTaskTypes = shuffledTaskTypes.slice(0, numTaskTypes).map(tt => tt._id);
    
    const machinePayload = {
      machineName: `Machine_${Date.now()}_${i}`,
      machine_task_types: machineTaskTypes
    };
    
    response = http.post(`${BASE_URL}/machines`, JSON.stringify(machinePayload), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });
    
    if (response.status === 201) {
      createdMachines.push(JSON.parse(response.body));
    }
  }
  
  console.log(`Setup complete: ${createdTaskTypes.length} task types, ${createdWorkers.length} workers, ${createdLeaders.length} leaders, ${createdMachines.length} machines`);
  
  return {
    adminToken,
    adminUser,
    taskTypes: createdTaskTypes,
    workers: createdWorkers,
    leaders: createdLeaders,
    machines: createdMachines
  };
}

// Main test function with realistic user distribution
export default function(data) {
  if (!data.adminToken) {
    console.error('Setup failed, skipping test iteration');
    return;
  }
  
  // Realistic user distribution based on typical system usage
  const scenario = Math.random();
  
  if (scenario < 0.15) {
    // 15% - Admin workflow (less frequent but important)
    adminWorkflow(data);
  } else if (scenario < 0.45) {
    // 30% - Leader workflow (task management and monitoring)
    leaderWorkflow(data);
  } else if (scenario < 0.85) {
    // 40% - Worker workflow (most active users)
    workerWorkflow(data);
  } else {
    // 15% - Mixed monitoring operations
    monitoringWorkflow(data);
  }
  
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

function adminWorkflow(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.adminToken}`
  };
  
  // Admin login
  let response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    userName: data.adminUser.userName,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(response, {
    'Admin login successful': (r) => r.status === 200,
    'Admin login response time < 1s': (r) => r.timings.duration < 1000,
  });
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    errorCounter.add(1);
    return;
  }
  
  // Admin workflow: Create new task type (occasionally)
  if (Math.random() < 0.3) {
    response = http.post(`${BASE_URL}/task-types`, JSON.stringify({
      taskName: `NewTaskType_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      number_of_machine: Math.ceil(Math.random() * 3),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    }), { headers });
    
    check(response, {
      'Admin task type creation': (r) => r.status === 201,
    });
  }
  
  // Admin workflow: Create new worker (occasionally)
  if (Math.random() < 0.2) {
    response = http.post(`${BASE_URL}/users`, JSON.stringify({
      userName: `new_worker_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      password: 'testpass123',
      userRole: 'worker'
    }), { headers });
    
    check(response, {
      'Admin user creation': (r) => r.status === 201,
    });
    
    // Assign 1-3 task types to new worker
    if (response.status === 201 && data.taskTypes.length > 0) {
      const newUser = JSON.parse(response.body);
      const numTaskTypes = Math.min(
        Math.ceil(Math.random() * 3), // Random number between 1-3
        data.taskTypes.length // Don't exceed available task types
      );
      
      // Shuffle task types and take first numTaskTypes
      const shuffledTaskTypes = [...data.taskTypes].sort(() => 0.5 - Math.random());
      const selectedTaskTypes = shuffledTaskTypes.slice(0, numTaskTypes);
      
      // Assign each selected task type
      for (const taskType of selectedTaskTypes) {
        http.post(`${BASE_URL}/users/${newUser._id}/add-task-type`, JSON.stringify({
          taskTypeId: taskType._id
        }), { headers });
        check(response, {
          'Admin user task type assignment': (r) => r.status === 200,
        });
      }
    }
  }
  
  // Admin workflow: Create new machine (occasionally)
  if (Math.random() < 0.25) {
    const machineTaskTypes = data.taskTypes.slice(0, Math.ceil(Math.random() * 2)).map(tt => tt._id);
    
    response = http.post(`${BASE_URL}/machines`, JSON.stringify({
      machineName: `AdminMachine_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      machine_task_types: machineTaskTypes
    }), { headers });
    
    check(response, {
      'Admin machine creation': (r) => r.status === 201,
    });
  }
  
  // Admin workflow: Monitor system status
  response = http.get(`${BASE_URL}/users/with-tasks`, { headers });
  check(response, {
    'Admin monitoring - users with tasks': (r) => r.status === 200,
  });
  
  response = http.get(`${BASE_URL}/machines`, { headers });
  check(response, {
    'Admin monitoring - machines status': (r) => r.status === 200,
  });
}

function leaderWorkflow(data) {
  if (data.leaders.length === 0) return;
  
  const randomLeader = data.leaders[Math.floor(Math.random() * data.leaders.length)];
  
  // Leader login
  let response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    userName: randomLeader.userName,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(response, {
    'Leader login successful': (r) => r.status === 200,
  });
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    errorCounter.add(1);
    return;
  }
  
  const leaderAuth = JSON.parse(response.body);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${leaderAuth.token}`
  };
  
  // Leader workflow: Create 1-10 random tasks
  if (data.taskTypes.length > 0) {
    const numTasksToCreate = Math.floor(Math.random() * 10) + 1; // Random number between 1-10
    
    for (let i = 0; i < numTasksToCreate; i++) {
      const randomTaskType = data.taskTypes[Math.floor(Math.random() * data.taskTypes.length)];
      const taskPayload = {
        taskTypeId: randomTaskType._id,
        taskName: `Leader_Task_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      };
      
      response = http.post(`${BASE_URL}/tasks`, JSON.stringify(taskPayload), { headers });
      
      const taskCreated = check(response, {
        'Leader task creation successful': (r) => r.status === 201,
        'Leader task creation response time < 2s': (r) => r.timings.duration < 2000,
      });
      taskCreationRate.add(taskCreated);
      
      if (!taskCreated) {
        errorCounter.add(1);
        return;
      }
      
      sleep(0.1); // Small delay between task creations
    }
  }
  
  // Leader workflow: Auto-assign preview
  response = http.post(`${BASE_URL}/tasks/auto-assign-preview`, '{}', { headers });
  
  const previewSuccess = check(response, {
    'Leader auto-assign preview successful': (r) => r.status === 200,
    'Leader auto-assign preview response time < 5s': (r) => r.timings.duration < 5000,
  });
  autoAssignSuccessRate.add(previewSuccess);
  
  if (!previewSuccess) {
    errorCounter.add(1);
    return;
  }
  
  // Leader workflow: Confirm auto-assignment (if preview has assignments)
  const previewData = JSON.parse(response.body);
  if (previewData.length > 0 && Math.random() < 0.8) { // 80% chance to confirm
    const assignments = previewData.map(item => ({
      taskId: item.taskId,
      assigneeId: item.previewAssignee._id
    }));
    
    response = http.patch(`${BASE_URL}/tasks/auto-assign-confirm`, JSON.stringify({
      assignerId: randomLeader._id,
      assignments: assignments
    }), { headers });
    
    const confirmSuccess = check(response, {
      'Leader auto-assign confirm successful': (r) => r.status === 200,
    });
    autoAssignSuccessRate.add(confirmSuccess);
  }
  
  // Leader workflow: View status of machines, workers, and tasks
  const statusEndpoints = [
    { url: `${BASE_URL}/machines`, name: 'machines status' },
    { url: `${BASE_URL}/tasks/load`, name: 'workers load' },
    { url: `${BASE_URL}/tasks`, name: 'all tasks' }
  ];
  
  for (const endpoint of statusEndpoints) {
    response = http.get(endpoint.url, { headers });
    check(response, {
      [`Leader monitoring - ${endpoint.name}`]: (r) => r.status === 200,
      [`Leader monitoring - ${endpoint.name} response time`]: (r) => r.timings.duration < 3000,
    });
    
    sleep(0.1); // Small delay between monitoring requests
  }
}

function workerWorkflow(data) {
  if (data.workers.length === 0) return;
  
  const randomWorker = data.workers[Math.floor(Math.random() * data.workers.length)];
  
  // Worker login
  let response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    userName: randomWorker.userName,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(response, {
    'Worker login successful': (r) => r.status === 200,
  });
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    errorCounter.add(1);
    return;
  }
  
  const workerAuth = JSON.parse(response.body);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${workerAuth.token}`
  };
  
  // Worker workflow: get current tasks status
  response = http.get(`${BASE_URL}/users/with-tasks/${randomWorker._id}`, { headers });
  check(response, {
    'Worker with tasks check successful': (r) => r.status === 200,
  });

  const workerData = JSON.parse(response.body);
  if (workerData.inProgressTasks.length > 0) {
    // Simulate task execution time
    sleep(Math.random() * 2 + 1); // 1-3 seconds of work

    // Worker workflow: Complete or fail the task (80% success rate)
    const taskSuccess = Math.random() < 0.8;
    const endpoint = taskSuccess ? 'complete' : 'fail';
    const message = taskSuccess ? 'Task completed successfully' : 'Task failed due to technical issue';

    response = http.patch(`${BASE_URL}/tasks/${workerData.inProgressTasks[0]._id}/${endpoint}`, JSON.stringify({
      message: message
    }), { headers });

    check(response, {
      [`Worker task ${endpoint} successful`]: (r) => r.status === 200,
    });
  }

  if (workerData.assignedTasks.length > 0) {
    response = http.patch(`${BASE_URL}/tasks/start-next`, JSON.stringify({
      workerId: randomWorker._id
    }), { headers });

    check(response, {
      'Worker start next task response valid': (r) => r.status === 200 || r.status === 400, // 400 is acceptable (no tasks available)
    });

    if (response.status === 200) {
      const startedTask = JSON.parse(response.body);
      // Simulate task execution time
      sleep(Math.random() * 2 + 1); // 1-3 seconds of work
      // Worker workflow: Complete or fail the task (80% success rate)
      const taskSuccess = Math.random() < 0.8;
      const endpoint = taskSuccess ? 'complete' : 'fail';
      const message = taskSuccess ? 'Task completed successfully' : 'Task failed due to technical issue';

      response = http.patch(`${BASE_URL}/tasks/${startedTask.task._id}/${endpoint}`, JSON.stringify({
        message: message
      }), { headers });

      const completionSuccess = check(response, {
        [`Worker task ${endpoint} successful`]: (r) => r.status === 200,
        [`Worker task ${endpoint} response time < 2s`]: (r) => r.timings.duration < 2000,
      });
      taskCompletionRate.add(completionSuccess);
      
      if (!completionSuccess) {
        errorCounter.add(1);
      }
      
    }
  }
  
  // Worker workflow: Check weekly load (occasionally)
  if (Math.random() < 0.3) {
    response = http.get(`${BASE_URL}/tasks/week-load/${randomWorker._id}`, { headers });
    check(response, {
      'Worker weekly load check successful': (r) => r.status === 200,
    });
  }
}

function monitoringWorkflow(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.adminToken}`
  };
  
  // General monitoring operations (can be done by any role)
  const monitoringEndpoints = [
    `${BASE_URL}/tasks`,
    `${BASE_URL}/users/with-tasks`,
    `${BASE_URL}/machines`,
    `${BASE_URL}/tasks/load`,
    `${BASE_URL}/task-types`,
    `${BASE_URL}/users`,
    `${BASE_URL}/tasks/draft`
  ];
  
  for (const endpoint of monitoringEndpoints) {
    const response = http.get(endpoint, { headers });
    check(response, {
      [`Monitoring - ${endpoint} successful`]: (r) => r.status === 200,
      [`Monitoring - ${endpoint} response time acceptable`]: (r) => r.timings.duration < 4000,
    });
    
    sleep(0.1); // Small delay between requests
  }
}

// Teardown function - runs once after the test
export function teardown(data) {
  if (!data.adminToken) {
    console.log('No teardown needed - setup failed');
    return;
  }
  
  console.log('Load test completed with realistic user workflows.');
  console.log('Check results for:');
  console.log('- Admin workflow performance (user/machine/task type creation)');
  console.log('- Leader workflow performance (task creation, auto-assignment, monitoring)');
  console.log('- Worker workflow performance (task execution, completion)');
  console.log('- Overall system monitoring capabilities');
}


