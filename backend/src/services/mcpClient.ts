/**
 * Tatum MCP Tool Executor
 *
 * Rather than spawning @tatumio/blockchain-mcp as a subprocess and communicating
 * over stdio JSON-RPC (which is fragile and process-lifecycle-dependent), we import
 * the package's internal TatumApiClient, DataService and GatewayService classes
 * directly and call them in-process.
 */

import { TatumApiClient } from "@tatumio/blockchain-mcp/dist/api-client.js";
import { DataService } from "@tatumio/blockchain-mcp/dist/services/data.js";
import { GatewayService } from "@tatumio/blockchain-mcp/dist/services/gateway.js";
import { getEnv } from "../config/env.js";

export interface McpCallResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// ── Lazy singletons ──────────────────────────────────────────────────────────

let _dataService: InstanceType<typeof DataService> | null = null;
let _gatewayService: InstanceType<typeof GatewayService> | null = null;

function getDataService(): InstanceType<typeof DataService> {
  if (!_dataService) {
    const env = getEnv();
    const apiClient = new TatumApiClient({
      apiKey: env.TATUM_API_KEY,
      baseUrl: "https://api.tatum.io",
      timeout: 30_000,
      retryAttempts: 3,
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

/**
 * Calls a Tatum MCP tool directly in-process.
 *
 * Supported tools (Blockchain Data — DataService):
 *   get_transaction_history, get_wallet_portfolio, check_malicious_address,
 *   get_exchange_rate, get_wallet_balance_by_time, get_block_by_time,
 *   get_metadata, get_owners, check_owner, get_tokens
 *
 * Supported tools (RPC Gateway — GatewayService):
 *   gateway_get_supported_chains, gateway_get_supported_methods, gateway_execute_rpc
 */
export async function callTatumMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  console.log(`[MCP Client] Calling Tatum tool "${toolName}" with args:`, args);

  try {
    let result: unknown;

    switch (toolName) {
      // ── Blockchain Data tools ──────────────────────────────────────────
      case "get_transaction_history":
        result = await getDataService().getTransactionHistory(args as any);
        break;

      case "get_wallet_portfolio":
        result = await getDataService().getWalletPortfolio(args as any);
        break;

      case "check_malicious_address":
      case "check_malicous_address":    // Tatum official typo alias
        result = await getDataService().checkMaliciousAddress(args as any);
        break;

      case "get_exchange_rate":
        result = await getDataService().getExchangeRate(args as any);
        break;

      case "get_wallet_balance_by_time":
        result = await getDataService().getWalletBalanceByTime(args as any);
        break;

      case "get_block_by_time":
        result = await getDataService().getBlockByTime(args as any);
        break;

      case "get_metadata":
        result = await getDataService().getMetadata(args as any);
        break;

      case "get_owners":
        result = await getDataService().getOwners(args as any);
        break;

      case "check_owner":
        result = await getDataService().checkOwner(args as any);
        break;

      case "get_tokens":
        result = await getDataService().getTokens(args as any);
        break;

      // ── RPC Gateway tools ──────────────────────────────────────────────
      case "gateway_get_supported_chains": {
        const gw = await getGatewayService();
        const chains = await gw.getSupportedChains();
        result = { chains, total: chains.length };
        break;
      }

      case "gateway_get_supported_methods": {
        const gw = await getGatewayService();
        const chainName = String(args.chain || "ethereum");
        const gatewayUrl = await gw.getGatewayUrl(chainName);
        if (!gatewayUrl) {
          return { success: false, error: `Chain "${chainName}" not found in Tatum RPC gateway.` };
        }
        const methods = await gw.getAvailableMethods(gatewayUrl);
        result = { chain: chainName, gateway_url: gatewayUrl, methods };
        break;
      }

      case "gateway_execute_rpc": {
        const gw = await getGatewayService();
        const chainName = String(args.chain || "ethereum");
        const method    = String(args.method || "eth_blockNumber");
        const params    = (args.params as any[]) || [];
        const rpcResult = await gw.executeChainRequest({ chainName, method, params });
        result = rpcResult;
        break;
      }

      default:
        return {
          success: false,
          error: `Unsupported MCP tool: "${toolName}". Supported: get_transaction_history, get_wallet_portfolio, check_malicious_address, get_exchange_rate, get_wallet_balance_by_time, get_block_by_time, get_metadata, get_owners, check_owner, get_tokens, gateway_get_supported_chains, gateway_get_supported_methods, gateway_execute_rpc`,
        };
    }

    // DataService/GatewayService returns { data, status } or { error, status }
    const res = result as any;
    if (res?.error) {
      return { success: false, error: `Tatum API error (${res.status}): ${res.error}`, output: res };
    }

    return { success: true, output: res };

  } catch (err: any) {
    console.error(`[MCP Client] Error calling tool "${toolName}":`, err);
    return { success: false, error: err?.message ?? String(err) };
  }
}
