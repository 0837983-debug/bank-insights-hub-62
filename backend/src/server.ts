import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    <h2>Table Data Endpoints</h2>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/table-data/:tableId</span>
      <div class="description">Get table data by table ID. Supports optional grouping. Grouping options are provided via groupableFields in layout.</div>
      <div class="params">
        <div class="param"><strong>tableId</strong> (path parameter) - Table identifier (e.g., "income")</div>
        <div class="param"><strong>groupBy</strong> (query parameter, optional) - Group data by column</div>
        <div class="param"><strong>dateFrom</strong> (query parameter, optional) - Start date</div>
        <div class="param"><strong>dateTo</strong> (query parameter, optional) - End date</div>
      </div>
      <div class="example">curl "http://localhost:3001/api/table-data/income?groupBy=product_line"</div>
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

// API routes
app.use("/api", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
