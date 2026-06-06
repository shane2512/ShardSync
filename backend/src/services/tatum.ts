import axios, { type AxiosInstance } from "axios";
import { getEnv } from "../config/env.js";

/**
 * Tatum service – all Sui chain access goes through Tatum RPC gateway.
 * Supports both testnet and mainnet by accepting an explicit rpcUrl.
 */

const clientCache = new Map<string, AxiosInstance>();

function getClient(rpcUrl: string): AxiosInstance {
  if (!clientCache.has(rpcUrl)) {
    const env = getEnv();
    clientCache.set(
      rpcUrl,
      axios.create({
        baseURL: rpcUrl,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.TATUM_API_KEY,
        },
        timeout: 30_000,
      })
    );
  }
  return clientCache.get(rpcUrl)!;
}

/** Send a JSON-RPC request to the Sui node via Tatum gateway. */
export async function suiRpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  rpcUrl?: string,
  retries = 2
): Promise<T> {
  const env = getEnv();
  const url = rpcUrl ?? env.TATUM_SUI_RPC_URL;
  try {
    const response = await getClient(url).post("", {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });

    if (response.data.error) {
      throw new Error(
        `Sui RPC error [${method}]: ${JSON.stringify(response.data.error)}`
      );
    }
    return response.data.result as T;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      return suiRpc<T>(method, params, rpcUrl, retries - 1);
    }
    throw err;
  }
}

/** Get the latest checkpoint sequence number (health check). */
export async function getLatestCheckpoint(rpcUrl?: string): Promise<string> {
  return suiRpc<string>("sui_getLatestCheckpointSequenceNumber", [], rpcUrl);
}

/** Get SUI coin balance for an address. */
export async function getSuiBalance(
  address: string,
  coinType = "0x2::sui::SUI",
  rpcUrl?: string
): Promise<{ coinType: string; coinObjectCount: number; totalBalance: string }> {
  return suiRpc("suix_getBalance", [address, coinType], rpcUrl);
}

/** Get all coin balances for an address. */
export async function getSuiAllBalances(
  address: string,
  rpcUrl?: string
): Promise<Array<{ coinType: string; coinObjectCount: number; totalBalance: string }>> {
  return suiRpc("suix_getAllBalances", [address], rpcUrl);
}

/** Query transaction blocks for a given address. */
export async function querySuiTransactions(
  address: string,
  limit = 10,
  rpcUrl?: string
): Promise<{ data: unknown[]; nextCursor: string | null; hasNextPage: boolean }> {
  return suiRpc(
    "suix_queryTransactionBlocks",
    [
      {
        filter: { FromOrToAddress: { addr: address } },
        options: { showInput: false, showEffects: false, showEvents: false },
      },
      null,
      limit,
      true,
    ],
    rpcUrl
  );
}

/** Get an object by ID. */
export async function getObject(objectId: string, rpcUrl?: string): Promise<unknown> {
  return suiRpc(
    "sui_getObject",
    [objectId, { showContent: true, showType: true, showOwner: true }],
    rpcUrl
  );
}

/** Query events by module. */
export async function queryEvents(
  packageId: string,
  module: string,
  eventType: string,
  cursor?: string | null,
  limit = 50,
  rpcUrl?: string
): Promise<unknown> {
  return suiRpc(
    "suix_queryEvents",
    [{ MoveEventType: `${packageId}::${module}::${eventType}` }, cursor ?? null, limit, true],
    rpcUrl
  );
}

/** Execute a pre-signed transaction block via Tatum. */
export async function executeTransaction(
  txBytes: string,
  signatures: string[],
  rpcUrl?: string
): Promise<unknown> {
  return suiRpc(
    "sui_executeTransactionBlock",
    [
      txBytes,
      signatures,
      { showEffects: true, showEvents: true, showObjectChanges: true },
      "WaitForLocalExecution",
    ],
    rpcUrl
  );
}

/** Get objects owned by an address, optionally filtered by type. */
export async function getOwnedObjects(
  owner: string,
  structType?: string,
  cursor?: string | null,
  limit = 50,
  rpcUrl?: string
): Promise<unknown> {
  const filter = structType ? { MatchAll: [{ StructType: structType }] } : null;
  return suiRpc(
    "suix_getOwnedObjects",
    [owner, { filter, options: { showContent: true, showType: true } }, cursor ?? null, limit],
    rpcUrl
  );
}
