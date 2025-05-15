require("dotenv").config();
const express = require("express");
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
//app.use("/tasks", require("./routes/task"));

app.use("/api-docs", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

module.exports = app;