/**
 * Tatum MCP Tool Executor
 *
 * Rather than spawning @tatumio/blockchain-mcp as a subprocess and communicating
 * over stdio JSON-RPC (which is fragile and process-lifecycle-dependent), we import
 * the package's internal TatumApiClient and DataService classes directly and call
 * them in-process. This is functionally identical to what the MCP server does
 * internally, and is far more reliable.
 */

import { TatumApiClient } from "@tatumio/blockchain-mcp/dist/api-client.js";
import { DataService } from "@tatumio/blockchain-mcp/dist/services/data.js";
import { getEnv } from "../config/env.js";

export interface McpCallResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

/** Lazily initialised shared client/service — reused across requests */
let _dataService: InstanceType<typeof DataService> | null = null;

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

/**
 * Calls a Tatum MCP data tool directly in-process using the DataService.
 * Tool names and argument shapes match what @tatumio/blockchain-mcp exposes.
 *
 * Supported tools:
 *   get_transaction_history, get_wallet_portfolio, check_malicious_address,
 *   get_exchange_rate, get_wallet_balance_by_time, get_block_by_time,
 *   get_metadata, get_owners, check_owner, get_tokens
 */
export async function callTatumMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  console.log(`[MCP Client] Calling Tatum tool "${toolName}" in-process with args:`, args);

  const ds = getDataService();

  try {
    let result: unknown;

    switch (toolName) {
      case "get_transaction_history":
        result = await ds.getTransactionHistory(args as any);
        break;

      case "get_wallet_portfolio":
        result = await ds.getWalletPortfolio(args as any);
        break;

      case "check_malicious_address":
      // typo-tolerant alias used in older configs
      case "check_malicous_address":
        result = await ds.checkMaliciousAddress(args as any);
        break;

      case "get_exchange_rate":
        result = await ds.getExchangeRate(args as any);
        break;

      case "get_wallet_balance_by_time":
        result = await ds.getWalletBalanceByTime(args as any);
        break;

      case "get_block_by_time":
        result = await ds.getBlockByTime(args as any);
        break;

      case "get_metadata":
        result = await ds.getMetadata(args as any);
        break;

      case "get_owners":
        result = await ds.getOwners(args as any);
        break;

      case "check_owner":
        result = await ds.checkOwner(args as any);
        break;

      case "get_tokens":
        result = await ds.getTokens(args as any);
        break;

      default:
        return {
          success: false,
          error: `Unsupported MCP tool: "${toolName}". Supported tools: get_transaction_history, get_wallet_portfolio, check_malicious_address, get_exchange_rate, and more.`,
        };
    }

    // DataService returns { data, status, statusText } or { error, status, statusText }
    const res = result as any;
    if (res?.error) {
      return {
        success: false,
        error: `Tatum API error (${res.status}): ${res.error}`,
        output: res,
      };
    }

    return {
      success: true,
      output: res,
    };
  } catch (err: any) {
    console.error(`[MCP Client] Error calling tool "${toolName}":`, err);
    return {
      success: false,
      error: err?.message ?? String(err),
    };
  }
}
