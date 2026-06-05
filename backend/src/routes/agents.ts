import { Router, type Request, type Response } from "express";
import { storeBlob, readBlob } from "../services/walrus.js";
import {
  getOwnedObjects,
  getObject,
  queryEvents,
  getLatestCheckpoint,
  suiRpc,
  getSuiBalance,
  getSuiAllBalances,
  querySuiTransactions,
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

// ─── Tool Registry: chain support + NLP keywords ─────────────────────
// Based on official Tatum MCP docs — Data API tools only support EVM/BTC/LTC/etc.
// Sui chains are routed through the JSON-RPC gateway (suix_* methods).

const TOOL_REGISTRY = [
  {
    name: "get_transaction_history",
    description: "Get transaction history for a wallet address",
    keywords: ["transaction", "history", "tx", "transfers", "sent", "received", "past", "recent", "activity"],
    suiSupported: true,   // via suix_queryTransactionBlocks
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_wallet_portfolio",
    description: "Get comprehensive wallet portfolio and all coin/token balances",
    keywords: ["portfolio", "balance", "holdings", "assets", "tokens", "coins", "wallet", "funds", "how much"],
    suiSupported: true,   // via suix_getAllBalances
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_wallet_balance_by_time",
    description: "Get wallet balance at a specific point in time",
    keywords: ["balance at", "time", "historical balance", "past balance", "snapshot", "timestamp", "at date"],
    suiSupported: false,  // Data API only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_exchange_rate",
    description: "Get real-time exchange rate for a token pair",
    keywords: ["exchange rate", "price", "rate", "usd", "value", "convert", "worth", "cost", "market"],
    suiSupported: true,   // cross-chain Data API
    evmSupported: true,
    requiresAddress: false,
    requiresChain: false,
  },
  {
    name: "check_malicious_address",
    description: "Check if a wallet or contract address is flagged as malicious",
    keywords: ["malicious", "scam", "fraud", "safe", "dangerous", "risk", "flagged", "blacklist", "suspicious", "check address", "security"],
    suiSupported: true,   // cross-chain Data API
    evmSupported: true,
    requiresAddress: true,
    requiresChain: false,
  },
  {
    name: "get_tokens",
    description: "Get all tokens held by a wallet",
    keywords: ["tokens", "erc20", "nft", "collectibles", "list tokens", "all tokens", "owned tokens"],
    suiSupported: false,  // Data API EVM-only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_metadata",
    description: "Fetch NFT or multi-token metadata by contract address and token IDs",
    keywords: ["metadata", "nft", "token info", "collection", "details", "attributes", "properties", "image"],
    suiSupported: false,  // Data API EVM-only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_owners",
    description: "Get owners of an NFT or token",
    keywords: ["owners", "who owns", "holder", "ownership"],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "check_owner",
    description: "Check if a specific address owns a particular token",
    keywords: ["owns", "owner check", "verify ownership"],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_block_by_time",
    description: "Get block information at a specific timestamp",
    keywords: ["block", "block number", "block at time", "block height"],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: false,
    requiresChain: true,
  },
];

/**
 * NLP tool selector — keyword-based scoring of user prompt against tool registry.
 * Returns the best matching tool from the tools enabled in the agent config.
 */
function selectToolFromPrompt(
  prompt: string,
  enabledTools: string[],
  isSuiChain: boolean
): { tool: typeof TOOL_REGISTRY[0] | null; score: number; reason: string } {
  const lower = prompt.toLowerCase();
  let bestTool: typeof TOOL_REGISTRY[0] | null = null;
  let bestScore = 0;
  let bestReason = "";

  for (const tool of TOOL_REGISTRY) {
    // Only consider tools enabled in the agent config
    if (!enabledTools.includes(tool.name)) continue;

    // Check chain compatibility
    if (isSuiChain && !tool.suiSupported && !tool.evmSupported) continue;
    if (isSuiChain && !tool.suiSupported) {
      // Tool doesn't support Sui — will note in log but skip
      continue;
    }

    // Score by keyword matches
    let score = 0;
    const matchedKeywords: string[] = [];
    for (const kw of tool.keywords) {
      if (lower.includes(kw)) {
        score += kw.length; // longer keyword = more specific = higher score
        matchedKeywords.push(kw);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTool = tool;
      bestReason = `Matched keywords: [${matchedKeywords.join(", ")}]`;
    }
  }

  return { tool: bestTool, score: bestScore, reason: bestReason };
}

// ─── Run Agent with NLP Prompt ────────────────────────────────────────

agentRouter.post("/agents/run-prompt", async (req: Request, res: Response) => {
  try {
    const { registryObjectId, versionObjectId, walletAddress, prompt } = req.body as {
      registryObjectId: string;
      versionObjectId: string;
      walletAddress?: string;
      prompt: string;
    };

    if (!prompt || !versionObjectId) {
      res.status(400).json({ error: "prompt and versionObjectId are required" });
      return;
    }

    const startTime = Date.now();
    const targetWallet = walletAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";

    // 1. Fetch config from Walrus via the version object
    let config: Record<string, unknown> = {};
    let configBlobId = "";
    try {
      if (versionObjectId?.startsWith("0x")) {
        const versionObj = await getObject(versionObjectId) as any;
        configBlobId = versionObj?.data?.content?.fields?.walrus_config_blob_id || "";
      }
      if (configBlobId) {
        const configJson = await readBlob(configBlobId);
        config = JSON.parse(configJson);
      }
    } catch (e) {
      console.warn("[run-prompt] Could not load config from Walrus:", e);
    }

    const enabledTools = (config.mcp_tools_enabled as string[]) || [];
    const targetChain = (config.parameters as any)?.target_chain || "sui-testnet";
    const configWallet = (config.parameters as any)?.target_wallet;
    const queryAddress = configWallet && configWallet !== "0xYourWalletAddressHere"
      ? configWallet
      : targetWallet;
    const isSuiChain = targetChain.toLowerCase().includes("sui");

    // 2. NLP: Find the best matching tool for the prompt
    const { tool: selectedTool, reason: nlpReason } = selectToolFromPrompt(prompt, enabledTools, isSuiChain);

    let executionLog: Record<string, unknown>;

    if (!selectedTool) {
      // Check if the issue is chain incompatibility vs no match at all
      const anyToolMatch = TOOL_REGISTRY.find(t =>
        enabledTools.includes(t.name) &&
        t.keywords.some(kw => prompt.toLowerCase().includes(kw))
      );

      const noToolReason = enabledTools.length === 0
        ? "No MCP tools are enabled in this agent's configuration. Add tools to mcp_tools_enabled in the config."
        : anyToolMatch && isSuiChain && !anyToolMatch.suiSupported
        ? `The tool "${anyToolMatch.name}" does not support Sui chains. It only works with EVM/BTC chains (Ethereum, Polygon, etc.). Consider changing target_chain in the agent config.`
        : `No tool in this agent's configuration matches your request: "${prompt}". Enabled tools: [${enabledTools.join(", ")}]. Try rephrasing or update the agent config to include relevant tools.`;

      executionLog = {
        timestamp: new Date().toISOString(),
        versionId: versionObjectId,
        prompt,
        mcp_server: "@tatumio/blockchain-mcp",
        tool_selection: { selected: null, reason: noToolReason },
        tool_calls: [],
        output: { status: "no_tool_found", message: noToolReason },
        success: false,
        duration_ms: Date.now() - startTime,
      };
    } else {
      // 3. Execute the selected tool
      let mcpResult: { success: boolean; output: unknown; error?: string };

      if (isSuiChain) {
        // Route through Tatum Sui RPC Gateway
        try {
          if (selectedTool.name === "get_transaction_history") {
            const txResult = await querySuiTransactions(queryAddress, 10);
            mcpResult = { success: true, output: { rpc_method: "suix_queryTransactionBlocks", address: queryAddress, data: txResult } };
          } else if (selectedTool.name === "get_wallet_portfolio") {
            const [balances, suiBalance] = await Promise.all([getSuiAllBalances(queryAddress), getSuiBalance(queryAddress)]);
            mcpResult = { success: true, output: { rpc_method: "suix_getAllBalances", address: queryAddress, sui_native: suiBalance, all_balances: balances } };
          } else if (selectedTool.name === "check_malicious_address" || selectedTool.name === "check_malicous_address") {
            const r = await callTatumMcpTool("check_malicious_address", { address: queryAddress });
            mcpResult = { success: r.success, output: r.output, error: r.error };
          } else if (selectedTool.name === "get_exchange_rate") {
            const r = await callTatumMcpTool("get_exchange_rate", { symbol: "SUI", basePair: "USD" });
            mcpResult = { success: r.success, output: r.output, error: r.error };
          } else {
            const suiBal = await getSuiBalance(queryAddress);
            mcpResult = { success: true, output: { rpc_method: "suix_getBalance", address: queryAddress, data: suiBal } };
          }
        } catch (e: any) {
          mcpResult = { success: false, output: null, error: e.message || String(e) };
        }
      } else {
        // Route through Tatum Data API
        const toolArgs: Record<string, unknown> = {};
        if (selectedTool.requiresAddress) { toolArgs.addresses = queryAddress; toolArgs.address = queryAddress; }
        if (selectedTool.requiresChain) toolArgs.chain = targetChain;
        if (selectedTool.name === "get_wallet_portfolio") toolArgs.tokenTypes = "native";
        if (selectedTool.name === "get_exchange_rate") { toolArgs.symbol = "SUI"; toolArgs.basePair = "USD"; }

        const r = await callTatumMcpTool(selectedTool.name, toolArgs);
        mcpResult = { success: r.success, output: r.output, error: r.error };
      }

      executionLog = {
        timestamp: new Date().toISOString(),
        versionId: versionObjectId,
        prompt,
        mcp_server: "@tatumio/blockchain-mcp",
        tool_selection: {
          selected: selectedTool.name,
          description: selectedTool.description,
          nlp_reason: nlpReason,
          chain: targetChain,
          sui_chain: isSuiChain,
        },
        tool_calls: [{ tool: selectedTool.name, args: { address: queryAddress, chain: targetChain } }],
        output: mcpResult.success ? mcpResult.output : { status: 500, error: mcpResult.error },
        success: mcpResult.success,
        duration_ms: Date.now() - startTime,
      };
    }

    // 4. Persist log to Walrus
    const logJson = JSON.stringify(executionLog, null, 2);
    const { blobId: logBlobId } = await storeBlob(logJson);

    res.json({
      walrusLogBlobId: logBlobId,
      executionLog,
      durationMs: executionLog.duration_ms,
      toolSelected: selectedTool?.name || null,
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

    // 4. Route tool calls based on chain type.
    // The Tatum Data API (/v4/data/) is EVM/Bitcoin-only — it does NOT support Sui.
    // For Sui chains, we use suiRpc() (Tatum JSON-RPC Gateway) directly.
    const isSuiChain = targetChain.toLowerCase().includes("sui");
    const toolArgs: Record<string, any> = {};
    let mcpResult = { success: false, output: null as any, error: undefined as string | undefined };

    if (isSuiChain) {
      // ── Sui path: Tatum JSON-RPC Gateway (sui-testnet.gateway.tatum.io) ─────
      // The Tatum Data API (/v4/data/) is EVM/BTC-only. For Sui we call the
      // correct suix_* JSON-RPC methods via the gateway helper functions.
      try {
        if (toolToRun === "get_transaction_history") {
          // suix_queryTransactionBlocks — filter by FromOrToAddress
          const txResult = await querySuiTransactions(queryAddress, 10);
          mcpResult.success = true;
          mcpResult.output = {
            rpc_method: "suix_queryTransactionBlocks",
            address: queryAddress,
            data: txResult,
          };
          toolArgs.address = queryAddress;
          toolArgs.rpc_method = "suix_queryTransactionBlocks";

        } else if (toolToRun === "get_wallet_portfolio" || toolToRun === "get_wallet_balance_by_time") {
          // suix_getAllBalances — returns all coin types held by the address
          const balances = await getSuiAllBalances(queryAddress);
          // Also fetch native SUI balance for a clean summary
          const suiBalance = await getSuiBalance(queryAddress);
          mcpResult.success = true;
          mcpResult.output = {
            rpc_method: "suix_getAllBalances + suix_getBalance",
            address: queryAddress,
            sui_native: suiBalance,
            all_balances: balances,
          };
          toolArgs.address = queryAddress;
          toolArgs.rpc_method = "suix_getAllBalances";

        } else if (toolToRun === "check_malicous_address" || toolToRun === "check_malicious_address") {
          // Tatum Data API security endpoint works cross-chain — no Sui restriction
          const callRes = await callTatumMcpTool("check_malicious_address", { address: queryAddress });
          mcpResult = { success: callRes.success, output: callRes.output, error: callRes.error };
          toolArgs.address = queryAddress;
          toolArgs.tool = "check_malicious_address";

        } else if (toolToRun === "get_exchange_rate") {
          // Exchange rate also works cross-chain via Tatum Data API
          const callRes = await callTatumMcpTool("get_exchange_rate", { symbol: "SUI", basePair: "USD" });
          mcpResult = { success: callRes.success, output: callRes.output, error: callRes.error };
          toolArgs.symbol = "SUI";
          toolArgs.basePair = "USD";

        } else {
          // Fallback: return SUI native balance for any unrecognised tool
          const suiBalance = await getSuiBalance(queryAddress);
          mcpResult.success = true;
          mcpResult.output = { rpc_method: "suix_getBalance", address: queryAddress, data: suiBalance };
          toolArgs.address = queryAddress;
          toolArgs.rpc_method = "suix_getBalance";
        }
      } catch (e: any) {
        mcpResult.success = false;
        mcpResult.error = e.message || String(e);
      }
    } else {
      // ── EVM / other chains: use Tatum Data API via mcpClient ───────────────
      if (toolToRun === "get_transaction_history") {
        toolArgs.addresses = queryAddress;
        toolArgs.chain = targetChain;
      } else if (toolToRun === "get_wallet_portfolio") {
        toolArgs.addresses = queryAddress;
        toolArgs.chain = targetChain;
        toolArgs.tokenTypes = "native";
      } else if (toolToRun === "check_malicous_address" || toolToRun === "check_malicious_address") {
        toolArgs.address = queryAddress;
      } else if (toolToRun === "get_exchange_rate") {
        toolArgs.symbol = "SUI";
        toolArgs.basePair = "USD";
      } else {
        toolArgs.addresses = queryAddress;
        toolArgs.address = queryAddress;
        toolArgs.chain = targetChain;
      }

      try {
        const callRes = await callTatumMcpTool(toolToRun, toolArgs);
        mcpResult.success = callRes.success;
        mcpResult.output = callRes.output;
        mcpResult.error = callRes.error;
      } catch (e: any) {
        mcpResult.success = false;
        mcpResult.error = e.message || String(e);
      }
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
