const client = require("prom-client");

client.collectDefaultMetrics();

// Task Metrics
const appTasksCreatedTotal = new client.Counter({
  name: "app_tasks_created_total",
  help: "Number of new tasks created",
  labelNames: ["task_type_id"]
});

const appTasksStateChangedTotal = new client.Counter({
  name: "app_tasks_state_changed_total",
  help: "Number of times a task's state changes",
  labelNames: ["task_id", "previous_state", "new_state"]
});

const appTasksCurrentState = new client.Gauge({
  name: "app_tasks_current_state",
  help: "Number of tasks currently in each state",
  labelNames: ["state"]
});

const appTaskAssignmentDurationSeconds = new client.Histogram({
  name: "app_task_assignment_duration_seconds",
  help: "Time taken for auto-assign-preview and auto-assign-confirm operations",
  labelNames: ["operation_type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const appTaskStartNextAttemptsTotal = new client.Counter({
  name: "app_task_start_next_attempts_total",
  help: "Number of attempts to start the next task for a worker via PATCH /tasks/start-next",
  labelNames: ["worker_id", "status"]
});

// User & Auth Metrics
const appUserLoginsTotal = new client.Counter({
  name: "app_user_logins_total",
  help: "Total successful user logins",
  labelNames: ["role"]
});

const appUserLoginFailuresTotal = new client.Counter({
  name: "app_user_login_failures_total",
  help: "Total failed user login attempts",
  labelNames: ["reason"]
});

const appUserManagementOperationsTotal = new client.Counter({
  name: "app_user_management_operations_total",
  help: "Count of user management actions",
  labelNames: ["operation"]
});

// Machine Metrics
const appMachinesStatus = new client.Gauge({
  name: "app_machines_status",
  help: "Current number of machines by status",
  labelNames: ["status"]
});

const appMachineOperationsTotal = new client.Counter({
  name: "app_machine_operations_total",
  help: "Count of machine management actions",
  labelNames: ["operation"]
});

// Task Type Metrics
const appTaskTypeOperationsTotal = new client.Counter({
  name: "app_tasktype_operations_total",
  help: "Count of task type management actions",
  labelNames: ["operation"]
});
const httpRequestCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"]
  });
const allMetrics = {
  appTasksCreatedTotal,
  appTasksStateChangedTotal,
  appTasksCurrentState,
  appTaskAssignmentDurationSeconds,
  appTaskStartNextAttemptsTotal,
  appUserLoginsTotal,
  appUserLoginFailuresTotal,
  appUserManagementOperationsTotal,
  appMachinesStatus,
  appMachineOperationsTotal,
  appTaskTypeOperationsTotal,
  httpRequestCounter,
};

module.exports = {
  metrics: allMetrics,
  register: client.register
}; 