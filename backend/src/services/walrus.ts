import axios from "axios";
import { getEnv } from "../config/env.js";

/**
 * Walrus service – blob upload/download via HTTP publisher/aggregator.
 * Accepts optional publisherUrl / aggregatorUrl so routes can pass
 * the correct network-specific endpoint.
 */

export interface WalrusStoreResult {
  blobId: string;
  raw: unknown;
}

/**
 * Mainnet public publishers to try in order.
 * NOTE: Walrus Mainnet has no unconditional free publisher.
 * We try known community publishers; if all fail we throw a descriptive error.
 */
const MAINNET_PUBLISHER_FALLBACKS = [
  "https://walrus-mainnet-publisher-1.staketab.org",
];

/** Upload data to Walrus as a blob. Returns blobId on success. */
export async function storeBlob(
  data: string | Buffer,
  publisherUrl?: string
): Promise<WalrusStoreResult> {
  const env = getEnv();
  const primaryUrl = publisherUrl ?? env.WALRUS_PUBLISHER_URL;

  // Build the list of publishers to attempt
  const publishers = [primaryUrl];

  // If the primary is a mainnet publisher that failed, also try fallbacks
  const isMainnet =
    primaryUrl.includes("mainnet") ||
    primaryUrl.includes("staketab") ||
    primaryUrl.includes("nami");

  if (isMainnet) {
    for (const fb of MAINNET_PUBLISHER_FALLBACKS) {
      if (fb !== primaryUrl) publishers.push(fb);
    }
  }

  let lastError: unknown;
  for (const pub of publishers) {
    try {
      const url = `${pub}/v1/blobs`;
      const response = await axios.put(url, data, {
        headers: { "Content-Type": "application/octet-stream" },
        timeout: 30_000,
      });

      const body = response.data;
      let blobId: string;

      if (body.newlyCreated) {
        blobId = body.newlyCreated.blobObject?.blobId ?? body.newlyCreated.blobId;
      } else if (body.alreadyCertified) {
        blobId = body.alreadyCertified.blobId;
      } else {
        blobId = body.blobId ?? body.blob_id ?? "";
      }

      if (!blobId) {
        throw new Error(
          `Walrus store failed: could not extract blobId from response: ${JSON.stringify(body)}`
        );
      }

      return { blobId, raw: body };
    } catch (err) {
      lastError = err;
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.warn(`[Walrus] Publisher ${pub} failed (status ${status ?? "network error"}), trying next...`);
    }
  }

  // All publishers failed
  if (isMainnet) {
    throw new Error(
      "Walrus Mainnet storage unavailable: all public publishers are down or require authentication. " +
      "To use ShardSync on Mainnet, run your own Walrus publisher node or use an authenticated provider (e.g. Nami Cloud). " +
      "Testnet is fully functional — switch to Testnet to continue."
    );
  }
  throw lastError;
}

/** Retrieve a blob from Walrus by its blob ID. */
export async function readBlob(
  blobId: string,
  aggregatorUrl?: string
): Promise<string> {
  const env = getEnv();
  const url = `${aggregatorUrl ?? env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;

  const response = await axios.get(url, {
    timeout: 30_000,
    responseType: "text",
  });

  return response.data as string;
}

/** Check if a blob exists on Walrus. */
export async function blobExists(
  blobId: string,
  aggregatorUrl?: string
): Promise<boolean> {
  try {
    const env = getEnv();
    const url = `${aggregatorUrl ?? env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
    await axios.head(url, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
