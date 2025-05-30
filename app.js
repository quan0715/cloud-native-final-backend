require("dotenv").config();
const express = require("express");
const { metrics, register } = require("./metrics");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const swaggerOptions = {
  swaggerOptions: {
    docExpansion: "none",
    persistAuthorization: true,
  },
  cacheControl: false,
};

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const allowedOrigins = [
  "http://localhost:5173", // 您的前端開發環境 (例如 Vue, React, Angular)
  "http://localhost:8080",
  "http://localhost:3000",
  "https://beta.quan.wtf",
  "https://dev.quan.wtf",
  "https://app.quan.wtf",
  "https://api-beta.quan.wtf",
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // 允許的 HTTP 方法
  allowedHeaders: ["Content-Type", "Authorization"], // 允許的請求標頭
  credentials: true, // 如果您需要傳送 cookies 或 authorization headers
};

app.enable("trust proxy");
app.use(express.json());
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.on("finish", () => {

    metrics.httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  next();
});

app.get("/metrics", async (req, res) => {
  // Update machine status gauge before sending metrics
  try {
    const Machine = require("./models/Machine");
    const Task = require("./models/Task");

    const machines = await Machine.find().lean();
    const inProgressTasks = await Task.find({ "taskData.state": "in-progress" }).select("taskData.machine").lean();
    
    const usedMachineIds = new Set();
    for (const task of inProgressTasks) {
      for (const m of task.taskData.machine) {
        usedMachineIds.add(m.toString());
      }
    }

    let idleCount = 0;
    let inUseCount = 0;

    for (const machine of machines) {
      if (usedMachineIds.has(machine._id.toString())) {
        inUseCount++;
      } else {
        idleCount++;
      }
    }
    metrics.appMachinesStatus.set({ status: 'in-use' }, inUseCount);
    metrics.appMachinesStatus.set({ status: 'idle' }, idleCount);

    // Initialize appTasksCurrentState gauge (example, can be expanded)
    const taskStates = await Task.aggregate([
      { $group: { _id: "$taskData.state", count: { $sum: 1 } } }
    ]);
    // Reset existing labels for appTasksCurrentState before setting new ones
    // This prevents old states that no longer exist from lingering in the metrics if not explicitly set to 0
    metrics.appTasksCurrentState.reset(); 
    taskStates.forEach(stateInfo => {
      if (stateInfo._id) { // Ensure state is not null/undefined
        metrics.appTasksCurrentState.set({ state: stateInfo._id }, stateInfo.count);
      }
    });

  } catch (error) {
    console.error("Error updating dynamic metrics:", error);
  }

  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connect failed:", err);
  });

// mount routes
app.use("/auth", require("./routes/auth"));
app.use("/task-types", require("./routes/taskType"));
app.use("/machines", require("./routes/machine"));
app.use("/users", require("./routes/user"));
app.use("/tasks", require("./routes/task"));

app.use("/api-docs", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

module.exports = app;