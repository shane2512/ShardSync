/**
 * Tatum MCP Tool Executor — Hybrid MCP + Data API
 *
 * PRIMARY PATH:  Uses @modelcontextprotocol/sdk Client + StdioClientTransport
 *                to spawn @tatumio/blockchain-mcp as a real MCP server process
 *                and call tools via the official MCP JSON-RPC protocol.
 *
 * FALLBACK PATH: If the MCP subprocess is unavailable (spawn error, connection
 *                drop, etc.) we call DataService / GatewayService directly
 *                in-process, which is functionally identical to the MCP server's
 *                own implementation.
 */

import { Client }               from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TatumApiClient }       from "@tatumio/blockchain-mcp/dist/api-client.js";
import { DataService }          from "@tatumio/blockchain-mcp/dist/services/data.js";
import { GatewayService }       from "@tatumio/blockchain-mcp/dist/services/gateway.js";
import { getEnv }               from "../config/env.js";
import { resolve }              from "path";
import { fileURLToPath }        from "url";
import { dirname }              from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

export interface McpCallResult {
  success: boolean;
  output?: unknown;
  error?: string;
  via?: "mcp" | "api";  // which path was used — visible in execution log
}

// ── MCP Subprocess client (lazy singleton) ───────────────────────────────────

let _mcpClient: Client | null = null;
let _mcpConnecting = false;
let _mcpFailed = false;          // if spawn ever fails, skip MCP for this session

async function getMcpClient(): Promise<Client | null> {
  if (_mcpFailed) return null;
  if (_mcpClient) return _mcpClient;
  if (_mcpConnecting) return null;

  _mcpConnecting = true;
  try {
    const env = getEnv();

    // Resolve the CLI entry-point of @tatumio/blockchain-mcp
    const cliPath = resolve(
      __dirname,
      "../../../node_modules/@tatumio/blockchain-mcp/dist/cli.js"
    );

    const transport = new StdioClientTransport({
      command: "node",
      args: [cliPath],
      env: {
        ...process.env as Record<string, string>,
        TATUM_API_KEY: env.TATUM_API_KEY,
      },
      stderr: "pipe",
    });

    const client = new Client(
      { name: "shardsync-backend", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);

    // Verify the server is alive
    await client.listTools();

    _mcpClient = client;
    console.log("[MCP] Connected to @tatumio/blockchain-mcp server via stdio ✓");

    // Handle unexpected disconnection
    transport.onclose = () => {
      console.warn("[MCP] Server disconnected — falling back to Data API");
      _mcpClient = null;
      _mcpFailed = false;   // allow reconnect on next request
    };

    return _mcpClient;
  } catch (err) {
    console.warn("[MCP] Could not start MCP subprocess, falling back to Data API:", err);
    _mcpFailed = true;
    return null;
  } finally {
    _mcpConnecting = false;
  }
}

// ── In-process fallback singletons ──────────────────────────────────────────

let _dataService: InstanceType<typeof DataService> | null = null;
let _gatewayService: InstanceType<typeof GatewayService> | null = null;

function getDataService(): InstanceType<typeof DataService> {
  if (!_dataService) {
    const env = getEnv();
    const apiClient = new TatumApiClient({
      apiKey:         env.TATUM_API_KEY,
      baseUrl:        "https://api.tatum.io",
      timeout:        30_000,
      retryAttempts:  3,
    });
    _dataService = new DataService(apiClient);
  }
  return _dataService;
}

async function getGatewayService(): Promise<InstanceType<typeof GatewayService>> {
  if (!_gatewayService) {
    const env = getEnv();
    _gatewayService = new GatewayService(env.TATUM_API_KEY);
    await _gatewayService.initialize();
  }
  return _gatewayService;
}

// ── MCP call (primary path) ──────────────────────────────────────────────────

async function callViaMcp(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult | null> {
  try {
    const client = await getMcpClient();
    if (!client) return null;

    console.log(`[MCP] → callTool "${toolName}"`);
    const response = await client.callTool({ name: toolName, arguments: args });

    // MCP tool response: { content: [{ type: "text", text: "..." }] }
    const content = response.content;
    if (!Array.isArray(content) || content.length === 0) {
      return { success: false, error: "Empty MCP tool response", via: "mcp" };
    }

    const textBlock = content.find((c: any) => c.type === "text");
    if (!textBlock) {
      return { success: false, error: "No text block in MCP response", via: "mcp" };
    }

    // Parse the JSON text returned by the MCP tool
    let parsed: unknown;
    try {
      parsed = JSON.parse((textBlock as any).text);
    } catch {
      parsed = (textBlock as any).text;
    }

    const res = parsed as any;
    if (res?.error || res?.isError) {
      return { success: false, error: res.error || res.message, output: res, via: "mcp" };
    }

    return { success: true, output: parsed, via: "mcp" };
  } catch (err: any) {
    console.warn(`[MCP] callTool "${toolName}" failed:`, err?.message);
    // Reset client so next call tries to reconnect
    _mcpClient = null;
    return null;
  }
}

// ── Data API fallback ────────────────────────────────────────────────────────

async function callViaDataApi(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  try {
    let result: unknown;

    switch (toolName) {
      // ── Blockchain Data tools ──────────────────────────────────────────
      case "get_transaction_history":
        result = await getDataService().getTransactionHistory(args as any); break;
      case "get_wallet_portfolio":
        result = await getDataService().getWalletPortfolio(args as any); break;
      case "check_malicious_address":
      case "check_malicous_address":
        result = await getDataService().checkMaliciousAddress(args as any); break;
      case "get_exchange_rate":
        result = await getDataService().getExchangeRate(args as any); break;
      case "get_wallet_balance_by_time":
        result = await getDataService().getWalletBalanceByTime(args as any); break;
      case "get_block_by_time":
        result = await getDataService().getBlockByTime(args as any); break;
      case "get_metadata":
        result = await getDataService().getMetadata(args as any); break;
      case "get_owners":
        result = await getDataService().getOwners(args as any); break;
      case "check_owner":
        result = await getDataService().checkOwner(args as any); break;
      case "get_tokens":
        result = await getDataService().getTokens(args as any); break;

      // ── RPC Gateway tools ──────────────────────────────────────────────
      case "gateway_get_supported_chains": {
        const gw = await getGatewayService();
        const chains = await gw.getSupportedChains();
        result = { chains, total: chains.length }; break;
      }
      case "gateway_get_supported_methods": {
        const gw    = await getGatewayService();
        const chain = String(args.chain || "ethereum");
        const url   = await gw.getGatewayUrl(chain);
        if (!url) return { success: false, error: `Chain "${chain}" not found in gateway`, via: "api" };
        result = { chain, gateway_url: url, methods: await gw.getAvailableMethods(url) }; break;
      }
      case "gateway_execute_rpc": {
        const gw     = await getGatewayService();
        const chain  = String(args.chain  || "ethereum");
        const method = String(args.method || "eth_blockNumber");
        const params = (args.params as any[]) || [];
        result = await gw.executeChainRequest({ chainName: chain, method, params }); break;
      }

      default:
        return {
          success: false,
          error: `Unsupported tool: "${toolName}"`,
          via: "api",
        };
    }

    const res = result as any;
    if (res?.error) {
      return { success: false, error: `Tatum API error (${res.status}): ${res.error}`, output: res, via: "api" };
    }
    return { success: true, output: res, via: "api" };

  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err), via: "api" };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Calls a Tatum MCP tool.
 *
 * 1. Tries the real MCP server subprocess (JSON-RPC over stdio).
 * 2. Falls back to the in-process Data API / Gateway API if MCP is unavailable.
 *
 * The `via` field in the result tells you which path was used: "mcp" or "api".
 *
 * Supported tools (13 total):
 *   Blockchain Data: get_transaction_history, get_wallet_portfolio,
 *     check_malicious_address, get_exchange_rate, get_wallet_balance_by_time,
 *     get_block_by_time, get_metadata, get_owners, check_owner, get_tokens
 *   RPC Gateway:     gateway_get_supported_chains, gateway_get_supported_methods,
 *     gateway_execute_rpc
 */
export async function callTatumMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  console.log(`[MCP Client] "${toolName}"`, args);

  // 1. Try real MCP server
  const mcpResult = await callViaMcp(toolName, args);
  if (mcpResult !== null) return mcpResult;

  // 2. Fallback to in-process Data API
  console.log(`[MCP Client] Using Data API fallback for "${toolName}"`);
  return callViaDataApi(toolName, args);
}
