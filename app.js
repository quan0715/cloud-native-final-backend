require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

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
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🛠️ 修復舊索引 id_1
    try {
      const col = mongoose.connection.db.collection("users");
      const indexes = await col.indexes();

      if (indexes.some(i => i.name === "id_1")) {
        await col.dropIndex("id_1");
        console.log("🗑️ Dropped legacy index id_1");
      } else {
        console.log("ℹ️ No legacy index id_1, nothing to drop");
      }
    } catch (e) {
      console.error("⚠️ Failed to check/drop id_1 index:", e.message);
    }

    // ✅ 確保連線成功、index 處理完後再啟動 server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connect failed:", err);
  });

// mount routes
app.use("/auth", require("./routes/auth"));
app.use("/task-types", require("./routes/taskType"));
app.use("/machines", require("./routes/machine"));
app.use("/users", require("./routes/user"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


module.exports = app;