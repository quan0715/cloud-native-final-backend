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
  "https://beta.quan.wtf",
  "https://app.quan.wtf",
];

const corsOptions = {
  origin: function (origin, callback) {
    // origin 參數是請求的來源 (例如 'http://localhost:8080')
    // 如果請求沒有 origin (例如來自 Postman 或 curl 的同源請求)，origin 會是 undefined
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // 允許此來源
    } else {
      callback(new Error("Not allowed by CORS")); // 拒絕此來源
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // 允許的 HTTP 方法
  allowedHeaders: ["Content-Type", "Authorization"], // 允許的請求標頭
  credentials: true, // 如果您需要傳送 cookies 或 authorization headers
};

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
app.use("/worker", require("./routes/worker"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
