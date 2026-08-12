import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { whitelistAuth } from "./middleware/whitelistAuth.js";
import { ensureSuperAdmin } from "./services/auth/authService.js";
import { AppError, AppErrorCode, ERROR_CATALOG } from "./types/errors.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ограничение частоты запросов на вход (защита от перебора паролей)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  // Максимум попыток входа. Значение переопределяется через env (для E2E/отладки
  // можно увеличить, чтобы тесты не упирались в лимит). По умолчанию — 20.
  max: Number(process.env.AUTH_LOGIN_MAX ?? "20"),
  standardHeaders: true,
  legacyHeaders: false,
  // Сообщение из карты ошибок (код RATE_LIMITED)
  message: { code: AppErrorCode.AUTH_RATE_LIMITED, ...ERROR_CATALOG[AppErrorCode.AUTH_RATE_LIMITED] },
});
app.use("/api/auth/login", authLimiter);

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const healthStatus = {
    backend: {
      status: "ok",
      message: "Backend is running",
    },
    frontend: {
      status: "unknown",
      message: "Not checked",
    },
  };

  // Check frontend status
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const frontendResponse = await fetch(frontendUrl, {
      signal: controller.signal,
      method: "HEAD",
    });
    
    clearTimeout(timeoutId);
    
    healthStatus.frontend = {
      status: frontendResponse.ok ? "ok" : "error",
      message: frontendResponse.ok 
        ? "Frontend is running" 
        : `Frontend returned status ${frontendResponse.status}`,
    };
  } catch (error) {
    healthStatus.frontend = {
      status: "error",
      message: error instanceof Error ? error.message : "Frontend is unavailable",
    };
  }

  const allOk = healthStatus.backend.status === "ok" && healthStatus.frontend.status === "ok";
  
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    message: allOk 
      ? "All services are running" 
      : "Some services are unavailable",
    services: healthStatus,
  });
});

// API Documentation endpoint
app.get("/api-docs", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #34495e;
      margin-top: 40px;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #3498db;
    }
    .endpoint {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .method {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.85em;
      margin-right: 10px;
    }
    .get { background: #28a745; color: white; }
    .post { background: #007bff; color: white; }
    .path {
      font-family: 'Courier New', monospace;
      font-size: 1.1em;
      color: #2c3e50;
      font-weight: bold;
    }
    .description {
      margin-top: 10px;
      color: #666;
    }
    .params {
      margin-top: 10px;
      padding-left: 20px;
    }
    .param {
      margin: 5px 0;
      font-family: 'Courier New', monospace;
      color: #555;
    }
    .example {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .base-url {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 30px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 API Documentation</h1>
    
    <div class="base-url">
      <strong>Base URL:</strong> http://localhost:3001/api
    </div>

    <h2>Health Check</h2>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/health</span>
      <div class="description">Check the health status of backend and frontend services</div>
      <div class="example">curl http://localhost:3001/api/health</div>
    </div>

    <h2>KPI Endpoints</h2>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/data?query_id=kpis</span>
      <div class="description">Get all KPI metrics</div>
      <div class="example">curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%2C%22p1%22%3A%222025-12-31%22%2C%22p2%22%3A%222025-11-30%22%2C%22p3%22%3A%222024-12-31%22%7D"</div>
    </div>

    <h2>Layout Endpoint</h2>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/data?query_id=layout</span>
      <div class="description">Get dashboard layout structure from database</div>
      <div class="params">
        <div class="param"><strong>query_id</strong> (query parameter, required) - Must be "layout"</div>
        <div class="param"><strong>component_Id</strong> (query parameter, required) - Component ID</div>
        <div class="param"><strong>parametrs</strong> (query parameter, optional) - JSON string with layout_id</div>
      </div>
      <div class="example">curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"</div>
    </div>

    <h2>Response Format</h2>
    <div class="endpoint">
      <div class="description">
        All endpoints return JSON responses. Error responses follow this format:
      </div>
      <div class="example">{
  "error": "Error message description"
}</div>
    </div>
  </div>
</body>
</html>`;
  res.send(html);
});

// API routes — всё закрыто по белому списку, кроме явно разрешённых путей
app.use("/api", whitelistAuth);
app.use("/api", routes);

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError(AppErrorCode.NOT_FOUND_ROUTE));
});

// Error handler
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Гарантируем наличие супер-админа при первом запуске
  try {
    await ensureSuperAdmin();
    console.log("Super admin ensured");
  } catch (error) {
    console.error("Failed to ensure super admin:", error);
  }
});
