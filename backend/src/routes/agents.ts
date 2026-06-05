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

// ─── Tool Registry ─────────────────────────────────────────────────────
// Tatum MCP tool name: check_malicous_address (official typo — missing 'i').
// We normalise both spellings so user configs work regardless of which they typed.
// Sui is NOT in Tatum Data API supported chains — Sui calls go to JSON-RPC gateway.

/** Normalise tool name: collapse the known Tatum typo and trim whitespace. */
function normaliseTool(name: string): string {
  return name.trim().replace("check_malicous_address", "check_malicious_address");
}

/** Extract the first blockchain address mentioned in a prompt.
 *  Supports EVM (0x + 40 hex), Sui (0x + 64 hex), Bitcoin (legacy/bech32), Solana base58.
 */
function extractAddressFromPrompt(prompt: string): string | null {
  // Sui 0x64-hex or EVM 0x40-hex
  const hexMatch = prompt.match(/0x[0-9a-fA-F]{40,64}/);
  if (hexMatch) return hexMatch[0];
  // Bitcoin bech32 bc1...
  const btcBech32 = prompt.match(/\bbc1[a-zA-HJ-NP-Z0-9]{25,62}\b/);
  if (btcBech32) return btcBech32[0];
  // Legacy Bitcoin/Litecoin/Dogecoin
  const legacyBtc = prompt.match(/\b[13LMD][a-km-zA-HJ-NP-Z1-9]{25,34}\b/);
  if (legacyBtc) return legacyBtc[0];
  // Solana base58 (32-44 chars, starts with non-0x)
  const solana = prompt.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  if (solana) return solana[0];
  return null;
}

const TOOL_REGISTRY = [
  // ── Blockchain Data tools ──────────────────────────────────────────────
  {
    name: "get_transaction_history",
    aliases: [] as string[],
    description: "Get transaction history and transfers for a wallet address",
    keywords: [
      "transaction", "transactions", "history", "tx", "txs", "transfer", "transfers",
      "sent", "received", "past", "recent", "activity", "payment", "payments",
      "show transactions", "list transactions", "get transactions", "transaction list",
      "on-chain activity", "on chain activity",
    ],
    suiSupported: true,   // via suix_queryTransactionBlocks
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_wallet_portfolio",
    aliases: [] as string[],
    description: "Get comprehensive wallet portfolio, all coin and token balances",
    keywords: [
      "portfolio", "balance", "balances", "holdings", "assets", "tokens", "coins",
      "wallet", "funds", "how much", "what is in", "what do i have", "total value",
      "show portfolio", "get portfolio", "show balance", "get balance",
      "coin balance", "asset list", "all assets", "my assets",
    ],
    suiSupported: true,   // via suix_getAllBalances
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_wallet_balance_by_time",
    aliases: [] as string[],
    description: "Get wallet balance at a specific point in time (historical snapshot)",
    keywords: [
      "balance at", "balance at time", "historical balance", "past balance",
      "snapshot", "timestamp", "at date", "at time", "historical", "history balance",
      "what was balance", "balance on date", "balance on",
    ],
    suiSupported: false,  // Data API EVM/BTC only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_exchange_rate",
    aliases: [] as string[],
    description: "Get real-time exchange rates for any crypto/fiat pair",
    keywords: [
      "exchange rate", "exchange rates", "price", "rate", "usd", "usd price",
      "dollar", "value", "convert", "worth", "cost", "market price", "market",
      "how much is", "current price", "token price", "coin price", "fiat",
      "what is the price", "what is price", "get price", "show price",
    ],
    suiSupported: true,   // cross-chain Data API
    evmSupported: true,
    requiresAddress: false,
    requiresChain: false,
  },
  {
    name: "check_malicious_address",
    aliases: ["check_malicous_address"],  // Tatum official typo
    description: "Check if a wallet or contract address is flagged as malicious or a scam",
    keywords: [
      "malicious", "malicous", "scam", "fraud", "fraudulent", "safe", "unsafe",
      "dangerous", "risk", "risky", "flagged", "blacklist", "blacklisted",
      "suspicious", "check address", "security", "is it safe", "is safe",
      "verify address", "check if malicious", "check whether", "is this address",
      "legitimate", "legit", "hack", "phishing", "rug pull", "rugpull",
      "check wallet", "validate address", "address check",
    ],
    suiSupported: true,   // cross-chain Data API — works for any address type
    evmSupported: true,
    requiresAddress: true,
    requiresChain: false,
  },
  {
    name: "get_tokens",
    aliases: [] as string[],
    description: "Get all ERC-20/token holdings for a wallet",
    keywords: [
      "tokens", "erc20", "erc-20", "nft", "nfts", "collectibles",
      "list tokens", "all tokens", "owned tokens", "token list",
      "show tokens", "get tokens", "token holdings", "what tokens",
    ],
    suiSupported: false,  // Data API EVM-only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_metadata",
    aliases: [] as string[],
    description: "Fetch NFT or multi-token metadata by contract address and token IDs",
    keywords: [
      "metadata", "nft metadata", "token info", "token metadata", "collection",
      "details", "attributes", "properties", "image", "nft details",
      "token details", "get metadata", "fetch metadata", "show metadata",
      "describe nft", "what is this nft",
    ],
    suiSupported: false,  // Data API EVM-only
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_owners",
    aliases: [] as string[],
    description: "Get list of owners of an NFT or token by contract address",
    keywords: [
      "owners", "who owns", "holder", "holders", "ownership", "who holds",
      "get owners", "list owners", "show owners", "token owners",
      "nft owners", "nft holders",
    ],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "check_owner",
    aliases: [] as string[],
    description: "Check if a specific address owns a particular token or NFT",
    keywords: [
      "owns", "owner check", "verify ownership", "does own", "do i own",
      "does address own", "is owner", "check ownership", "owns this",
      "check if owner",
    ],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: true,
    requiresChain: true,
  },
  {
    name: "get_block_by_time",
    aliases: [] as string[],
    description: "Get block information at a specific timestamp",
    keywords: [
      "block", "block number", "block at time", "block height", "block info",
      "get block", "find block", "block timestamp", "what block",
      "block by time", "block by timestamp",
    ],
    suiSupported: false,
    evmSupported: true,
    requiresAddress: false,
    requiresChain: true,
  },
  // ── RPC Gateway tools ──────────────────────────────────────────────────
  {
    name: "gateway_get_supported_chains",
    aliases: [] as string[],
    description: "Get all blockchain networks supported by the Tatum RPC gateway",
    keywords: [
      "supported chains", "supported networks", "which chains", "available chains",
      "list chains", "list networks", "all chains", "all networks",
      "what chains", "what networks", "gateway chains",
    ],
    suiSupported: true,
    evmSupported: true,
    requiresAddress: false,
    requiresChain: false,
  },
  {
    name: "gateway_get_supported_methods",
    aliases: [] as string[],
    description: "Get all RPC methods supported for a specific blockchain network",
    keywords: [
      "supported methods", "rpc methods", "available methods", "what methods",
      "which methods", "list methods", "gateway methods", "rpc calls",
    ],
    suiSupported: true,
    evmSupported: true,
    requiresAddress: false,
    requiresChain: true,
  },
  {
    name: "gateway_execute_rpc",
    aliases: [] as string[],
    description: "Execute a raw RPC call on any supported blockchain via the Tatum gateway",
    keywords: [
      "execute rpc", "run rpc", "rpc call", "raw rpc", "custom rpc", "gateway rpc",
      "call rpc", "rpc execute", "invoke rpc",
    ],
    suiSupported: true,
    evmSupported: true,
    requiresAddress: false,
    requiresChain: true,
  },
];

type ToolEntry = typeof TOOL_REGISTRY[0];

/**
 * NLP tool selector — keyword-based scoring.
 * - Normalises tool names to handle Tatum typos (check_malicous_address).
 * - Extracts blockchain addresses inline from the prompt.
 * - Returns best matching tool from the agent's enabled tools list.
 */
function selectToolFromPrompt(
  prompt: string,
  enabledToolsRaw: string[],
  isSuiChain: boolean
): { tool: ToolEntry | null; score: number; reason: string; extractedAddress: string | null } {
  const lower = prompt.toLowerCase();
  const enabledTools = enabledToolsRaw.map(normaliseTool);
  const extractedAddress = extractAddressFromPrompt(prompt);

  let bestTool: ToolEntry | null = null;
  let bestScore = 0;
  let bestReason = "";

  for (const tool of TOOL_REGISTRY) {
    const normName = normaliseTool(tool.name);

    // Match against normalised name AND any aliases
    const isEnabled =
      enabledTools.includes(normName) ||
      (tool.aliases || []).some((a) => enabledTools.includes(normaliseTool(a)));
    if (!isEnabled) continue;

    // Chain compatibility
    if (isSuiChain && !tool.suiSupported) continue;

    // Score by keyword matches (longer keyword phrase = more specific = higher weight)
    let score = 0;
    const matchedKeywords: string[] = [];
    for (const kw of tool.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length;
        matchedKeywords.push(kw);
      }
    }

    // Bonus: if an address was found in the prompt and the tool requires one
    if (extractedAddress && tool.requiresAddress) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestTool = tool;
      bestReason = matchedKeywords.length > 0
        ? `Matched keywords: [${matchedKeywords.join(", ")}]`
        : "Selected as best available tool";
    }
  }

  return { tool: bestTool, score: bestScore, reason: bestReason, extractedAddress };
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

    // 2. NLP: Find the best matching tool for the prompt + extract any inline address
    const { tool: selectedTool, reason: nlpReason, extractedAddress } = selectToolFromPrompt(prompt, enabledTools, isSuiChain);

    // Address priority: address found in prompt → config wallet → connected wallet
    const resolvedAddress = extractedAddress || queryAddress;

    let executionLog: Record<string, unknown>;

    if (!selectedTool) {
      // Use normalised names for the fallback check too
      const normEnabled = enabledTools.map(normaliseTool);
      const anyToolMatch = TOOL_REGISTRY.find(t =>
        normEnabled.includes(normaliseTool(t.name)) &&
        t.keywords.some(kw => prompt.toLowerCase().includes(kw.toLowerCase()))
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
            const txResult = await querySuiTransactions(resolvedAddress, 10);
            mcpResult = { success: true, output: { rpc_method: "suix_queryTransactionBlocks", address: resolvedAddress, data: txResult } };
          } else if (selectedTool.name === "get_wallet_portfolio") {
            const [balances, suiBalance] = await Promise.all([getSuiAllBalances(resolvedAddress), getSuiBalance(resolvedAddress)]);
            mcpResult = { success: true, output: { rpc_method: "suix_getAllBalances", address: resolvedAddress, sui_native: suiBalance, all_balances: balances } };
          } else if (selectedTool.name === "check_malicious_address" || selectedTool.name === "check_malicous_address") {
            const r = await callTatumMcpTool("check_malicious_address", { address: resolvedAddress });
            mcpResult = { success: r.success, output: r.output, error: r.error };
          } else if (selectedTool.name === "get_exchange_rate") {
            const r = await callTatumMcpTool("get_exchange_rate", { symbol: "SUI", basePair: "USD" });
            mcpResult = { success: r.success, output: r.output, error: r.error };
          } else {
            const suiBal = await getSuiBalance(resolvedAddress);
            mcpResult = { success: true, output: { rpc_method: "suix_getBalance", address: resolvedAddress, data: suiBal } };
          }
        } catch (e: any) {
          mcpResult = { success: false, output: null, error: e.message || String(e) };
        }
      } else {
        // Route through Tatum Data API
        const toolArgs: Record<string, unknown> = {};
        if (selectedTool.requiresAddress) { toolArgs.addresses = resolvedAddress; toolArgs.address = resolvedAddress; }
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
        tool_calls: [{ tool: selectedTool.name, args: { address: resolvedAddress, chain: targetChain, address_source: extractedAddress ? "extracted_from_prompt" : "agent_config" } }],
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
