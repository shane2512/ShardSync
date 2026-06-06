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
 * Thrown when all mainnet publishers are unreachable.
 * Routes should catch this and return HTTP 503 with a user-friendly message.
 */
export class WalrusPublisherUnavailableError extends Error {
  readonly code = "WALRUS_PUBLISHER_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "WalrusPublisherUnavailableError";
  }
}

/**
 * Known community Walrus Mainnet publishers, tried in order.
 * Walrus Mainnet has NO unconditional free public publisher.
 *
 * DNS-verified (June 2025):
 *   ✅ walrus-mainnet-publisher-1.staketab.org  (real, intermittently 502)
 *
 * ❌ DO NOT ADD — confirmed non-existent in DNS:
 *   publisher.staketab.com / walrus-publisher.staketab.com
 *   publisher.walrus.space / aggregator.walrus.space
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

  // Detect mainnet context by URL pattern
  const isMainnet =
    primaryUrl.includes("mainnet") ||
    primaryUrl.includes("staketab") ||
    primaryUrl.includes("nami");

  // Build ordered publisher list: primary first, then fallbacks (deduped)
  const publishers = [primaryUrl];
  if (isMainnet) {
    for (const fb of MAINNET_PUBLISHER_FALLBACKS) {
      if (!publishers.includes(fb)) publishers.push(fb);
    }
  }

  let lastError: unknown;
  for (const pub of publishers) {
    try {
      const url = `${pub}/v1/blobs`;
      const response = await axios.put(url, data, {
        headers: { "Content-Type": "application/octet-stream" },
        timeout: 15_000,
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
          `Walrus store failed: no blobId in response: ${JSON.stringify(body)}`
        );
      }

      return { blobId, raw: body };
    } catch (err) {
      lastError = err;
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.warn(
        `[Walrus] Publisher ${pub} failed (HTTP ${status ?? "network error"}) — trying next...`
      );
    }
  }

  // All publishers exhausted
  if (isMainnet) {
    throw new WalrusPublisherUnavailableError(
      "Walrus Mainnet storage is currently unavailable — community publishers are down or at capacity. " +
        "Options: (1) Switch to Testnet — all features work there, " +
        "(2) Retry later — Staketab's publisher comes back online periodically, " +
        "(3) For production, deploy your own publisher or use Nami Cloud (https://nami.cloud)."
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
