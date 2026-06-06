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

/** Upload data to Walrus as a blob. */
export async function storeBlob(
  data: string | Buffer,
  publisherUrl?: string
): Promise<WalrusStoreResult> {
  const env = getEnv();
  const url = `${publisherUrl ?? env.WALRUS_PUBLISHER_URL}/v1/blobs`;

  const response = await axios.put(url, data, {
    headers: { "Content-Type": "application/octet-stream" },
    timeout: 60_000,
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
): Promise < string > {
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
