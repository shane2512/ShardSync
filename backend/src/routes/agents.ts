import { Router, type Request, type Response } from "express";
import { storeBlob, readBlob } from "../services/walrus.js";
import {
  getOwnedObjects,
  getObject,
  queryEvents,
  getLatestCheckpoint,
  suiRpc,
} from "../services/tatum.js";
import { getEnv } from "../config/env.js";
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  ForkAgentSchema,
  RunAgentSchema,
} from "../types/schemas.js";
import { callTatumMcpTool } from "../services/mcpClient.js";

export const agentRouter = Router();

// ─── Health ───────────────────────────────────────────────────────────

agentRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    const checkpoint = await getLatestCheckpoint();
    res.json({ status: "ok", suiCheckpoint: checkpoint });
  } catch (err) {
    res.status(503).json({ status: "error", error: String(err) });
  }
});

// ─── Create Agent ─────────────────────────────────────────────────────
// Step 1: Upload config JSON to Walrus
// Step 2: Return blob ID + transaction data for client-side signing
// (Client signs and submits the transaction via Tatum)

agentRouter.post("/agents", async (req: Request, res: Response) => {
  try {
    const parsed = CreateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { name, description, config, commitMessage } = parsed.data;

    // Upload config to Walrus
    const configJson = JSON.stringify(config, null, 2);
    const { blobId } = await storeBlob(configJson);

    // Return the blob ID and contract call parameters.
    // The frontend will build and sign the transaction client-side.
    const env = getEnv();
    res.json({
      walrusConfigBlobId: blobId,
      contractCall: {
        packageId: env.SHARDSYNC_PACKAGE_ID,
        module: "agent_registry",
        function: "create_agent",
        arguments: [name, description, blobId, commitMessage],
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Create Version ───────────────────────────────────────────────────

agentRouter.post("/agents/version", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { registryObjectId, config, commitMessage } = parsed.data;

    const configJson = JSON.stringify(config, null, 2);
    const { blobId } = await storeBlob(configJson);

    const env = getEnv();
    res.json({
      walrusConfigBlobId: blobId,
      contractCall: {
        packageId: env.SHARDSYNC_PACKAGE_ID,
        module: "agent_registry",
        function: "create_version",
        arguments: [registryObjectId, blobId, commitMessage],
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Fork Agent ───────────────────────────────────────────────────────

agentRouter.post("/agents/fork", async (req: Request, res: Response) => {
  try {
    const parsed = ForkAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { sourceVersionId, name, description, config, commitMessage } =
      parsed.data;

    const configJson = JSON.stringify(config, null, 2);
    const { blobId } = await storeBlob(configJson);

    const env = getEnv();
    res.json({
      walrusConfigBlobId: blobId,
      contractCall: {
        packageId: env.SHARDSYNC_PACKAGE_ID,
        module: "agent_registry",
        function: "fork_agent",
        arguments: [sourceVersionId, name, description, blobId, commitMessage],
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Run Agent (simulate execution) ──────────────────────────────────

agentRouter.post("/agents/run", async (req: Request, res: Response) => {
  try {
    const parsed = RunAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { registryObjectId, versionObjectId, walletAddress } = parsed.data;
    const targetWallet = walletAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";

    const startTime = Date.now();
    let configBlobId = "";
    let config: any = {};

    // 1. Fetch the version object from Sui to locate the Walrus config blob ID
    try {
      if (versionObjectId && versionObjectId.startsWith("0x")) {
        const versionObj = await getObject(versionObjectId) as any;
        configBlobId = versionObj?.data?.content?.fields?.walrus_config_blob_id || "";
      }
    } catch (e) {
      console.warn(`[Run Agent] Could not fetch version object ${versionObjectId} fields:`, e);
    }

    // 2. Fetch the configuration JSON from Walrus
    if (configBlobId) {
      try {
        const configJson = await readBlob(configBlobId);
        config = JSON.parse(configJson);
      } catch (e) {
        console.warn(`[Run Agent] Could not read config blob ${configBlobId} from Walrus:`, e);
      }
    }

    // 3. Extract the target tool and parameters from the configuration
    const enabledTools = config.mcp_tools_enabled || [];
    const toolToRun = enabledTools[0] || "get_wallet_portfolio"; // Default fallback tool
    const targetChain = config.parameters?.target_chain || "sui-testnet";
    const configWallet = config.parameters?.target_wallet;
    
    // Resolve wallet address to query
    const queryAddress = configWallet && configWallet !== "0xYourWalletAddressHere"
      ? configWallet
      : targetWallet;

    // 4. Map configuration values to correct Tatum Data API field names
    // NOTE: Tatum Data API uses "addresses" (plural) for portfolio and tx history tools.
    // "get_wallet_portfolio" also requires tokenTypes.
    // Chain identifiers: "sui-testnet" is not supported by the Data API — use gateway_execute_rpc for Sui specifics.
    const toolArgs: Record<string, any> = {};
    if (toolToRun === "get_transaction_history") {
      toolArgs.addresses = queryAddress;  // plural — Tatum Data API requirement
      toolArgs.chain = targetChain;
    } else if (toolToRun === "get_wallet_portfolio") {
      toolArgs.addresses = queryAddress;  // plural — Tatum Data API requirement
      toolArgs.chain = targetChain;
      toolArgs.tokenTypes = "native";     // required field
    } else if (toolToRun === "check_malicous_address" || toolToRun === "check_malicious_address") {
      toolArgs.address = queryAddress;
    } else if (toolToRun === "get_exchange_rate") {
      toolArgs.symbol = "SUI";
      toolArgs.basePair = "USD";
    } else if (toolToRun === "gateway_execute_rpc") {
      toolArgs.chain = targetChain;
      toolArgs.method = "suix_getBalance";
      toolArgs.params = [queryAddress];
    } else {
      // Generic fallback for other Data API tools
      toolArgs.addresses = queryAddress;
      toolArgs.address = queryAddress;
      toolArgs.chain = targetChain;
    }

    // 5. Call Tatum MCP programmatically
    let mcpResult = { success: false, output: null as any, error: undefined as string | undefined };
    try {
      const callRes = await callTatumMcpTool(toolToRun, toolArgs);
      mcpResult.success = callRes.success;
      mcpResult.output = callRes.output;
      mcpResult.error = callRes.error;
    } catch (e: any) {
      mcpResult.success = false;
      mcpResult.error = e.message || String(e);
    }

    // 6. Build the execution log structured around the MCP call output
    const executionLog = {
      timestamp: new Date().toISOString(),
      versionId: versionObjectId,
      mcp_server: "@tatumio/blockchain-mcp",
      tool_calls: [
        { tool: toolToRun, args: toolArgs }
      ],
      output: mcpResult.success 
        ? mcpResult.output 
        : { status: 500, error: mcpResult.error || "Tatum MCP tool call failed." },
      success: mcpResult.success,
    };
    
    const durationMs = Date.now() - startTime;

    // 7. Persist execution log onto Walrus
    const logJson = JSON.stringify(executionLog, null, 2);
    const { blobId: logBlobId } = await storeBlob(logJson);

    const env = getEnv();
    res.json({
      walrusLogBlobId: logBlobId,
      executionLog,
      durationMs,
      contractCall: {
        packageId: env.SHARDSYNC_PACKAGE_ID,
        module: "agent_registry",
        function: "log_execution",
        arguments: [
          registryObjectId,
          versionObjectId,
          logBlobId,
          durationMs.toString(),
          executionLog.success.toString(),
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── List Agents (by owner) ──────────────────────────────────────────

agentRouter.get("/agents", async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string;
    if (!owner) {
      res.status(400).json({ error: "owner query param required" });
      return;
    }

    const env = getEnv();
    const structType = `${env.SHARDSYNC_PACKAGE_ID}::agent_registry::AgentRegistry`;
    const data = await getOwnedObjects(owner, structType);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Get Agent Detail ─────────────────────────────────────────────────

agentRouter.get("/agents/:objectId", async (req: Request, res: Response) => {
  try {
    const objectId = req.params.objectId as string;
    const data = await getObject(objectId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── List Versions (by owner, filtered) ──────────────────────────────

agentRouter.get("/versions", async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string;
    if (!owner) {
      res.status(400).json({ error: "owner query param required" });
      return;
    }

    const env = getEnv();
    const structType = `${env.SHARDSYNC_PACKAGE_ID}::agent_registry::AgentVersion`;
    const data = await getOwnedObjects(owner, structType);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── List Executions (events) ─────────────────────────────────────────

agentRouter.get("/executions", async (req: Request, res: Response) => {
  try {
    const env = getEnv();
    const cursor = (req.query.cursor as string) || null;
    const limit = parseInt(req.query.limit as string) || 50;

    const data = await queryEvents(
      env.SHARDSYNC_PACKAGE_ID,
      "agent_registry",
      "ExecutionLogged",
      cursor,
      limit
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Read Blob from Walrus ────────────────────────────────────────────

agentRouter.get("/blobs/:blobId", async (req: Request, res: Response) => {
  try {
    const blobId = req.params.blobId as string;
    try {
      const content = await readBlob(blobId);
      res.json({ blobId, content, available: true });
    } catch {
      res.json({ blobId, content: null, available: false });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
