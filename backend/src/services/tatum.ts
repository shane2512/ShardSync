import axios, { type AxiosInstance } from "axios";
import { getEnv } from "../config/env.js";

/**
 * Tatum service – all Sui chain access goes through Tatum RPC gateway.
 * Per rules: never use direct Sui RPC; always proxy via Tatum.
 */

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!client) {
    const env = getEnv();
    client = axios.create({
      baseURL: env.TATUM_SUI_RPC_URL,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.TATUM_API_KEY,
      },
      timeout: 30_000,
    });
  }
  return client;
}

/** Send a JSON-RPC request to the Sui node via Tatum gateway. */
export async function suiRpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  retries = 2
): Promise<T> {
  try {
    const response = await getClient().post("", {
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
    // Retry on 429 rate limit
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      return suiRpc<T>(method, params, retries - 1);
    }
    throw err;
  }
}

/** Get the latest checkpoint sequence number (health check). */
export async function getLatestCheckpoint(): Promise<string> {
  return suiRpc<string>("sui_getLatestCheckpointSequenceNumber");
}

/** Get an object by ID. */
export async function getObject(objectId: string): Promise<unknown> {
  return suiRpc("sui_getObject", [
    objectId,
    { showContent: true, showType: true, showOwner: true },
  ]);
}

/** Query events by module. */
export async function queryEvents(
  packageId: string,
  module: string,
  eventType: string,
  cursor?: string | null,
  limit = 50
): Promise<unknown> {
  return suiRpc("suix_queryEvents", [
    {
      MoveEventType: `${packageId}::${module}::${eventType}`,
    },
    cursor ?? null,
    limit,
    true, // descending
  ]);
}

/** Execute a pre-signed transaction block via Tatum. */
export async function executeTransaction(
  txBytes: string,
  signatures: string[]
): Promise<unknown> {
  return suiRpc("sui_executeTransactionBlock", [
    txBytes,
    signatures,
    { showEffects: true, showEvents: true, showObjectChanges: true },
    "WaitForLocalExecution",
  ]);
}

/** Get objects owned by an address, optionally filtered by type. */
export async function getOwnedObjects(
  owner: string,
  structType?: string,
  cursor?: string | null,
  limit = 50
): Promise<unknown> {
  const filter = structType
    ? { MatchAll: [{ StructType: structType }] }
    : null;

  return suiRpc("suix_getOwnedObjects", [
    owner,
    { filter, options: { showContent: true, showType: true } },
    cursor ?? null,
    limit,
  ]);
}
