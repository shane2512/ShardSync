import express from "express";
import cors from "cors";
import { getEnv } from "./config/env.js";
import { agentRouter } from "./routes/agents.js";

const env = getEnv();
const app = express();

// CORS — allow the deployed Vercel frontend and local dev
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Allow all Vercel preview URLs for this project
  /\.vercel\.app$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api", agentRouter);

// Root
app.get("/", (_req, res) => {
  res.json({
    name: "ShardSync API",
    version: "0.1.0",
    description: "Git for autonomous agents on Sui",
    endpoints: {
      health: "GET /api/health",
      createAgent: "POST /api/agents",
      listAgents: "GET /api/agents?owner=<address>",
      getAgent: "GET /api/agents/:objectId",
      createVersion: "POST /api/agents/version",
      forkAgent: "POST /api/agents/fork",
      runAgent: "POST /api/agents/run",
      listVersions: "GET /api/versions?owner=<address>",
      listExecutions: "GET /api/executions",
      readBlob: "GET /api/blobs/:blobId",
    },
  });
});

app.listen(env.PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │         ShardSync Backend v0.1.0        │
  │   Git for Autonomous Agents on Sui      │
  ├─────────────────────────────────────────┤
  │   Server:   http://localhost:${env.PORT}      │
  │   Network:  Sui ${env.SUI_NETWORK}              │
  │   Tatum:    ✓ configured                │
  │   Walrus:   ✓ configured                │
  └─────────────────────────────────────────┘
  `);
});
