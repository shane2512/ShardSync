import axios from "axios";
import { getEnv } from "../config/env.js";

/**
 * Walrus service – blob upload/download via HTTP publisher/aggregator.
 * Per rules: configs, logs, and snapshots are always Walrus blobs.
 */

export interface WalrusStoreResult {
  blobId: string;
  /** Raw response from publisher for future proof/certificate handling */
  raw: unknown;
}

/**
 * Upload data to Walrus as a blob.
 * Uses the publisher HTTP API: PUT /v1/blobs
 */
export async function storeBlob(data: string | Buffer): Promise<WalrusStoreResult> {
  const env = getEnv();
  const url = `${env.WALRUS_PUBLISHER_URL}/v1/blobs`;

  const response = await axios.put(url, data, {
    headers: {
      "Content-Type": "application/octet-stream",
    },
    timeout: 60_000,
  });

  // The publisher returns different shapes depending on whether the blob
  // was newly created or already existed.
  const body = response.data;

  let blobId: string;

  if (body.newlyCreated) {
    blobId = body.newlyCreated.blobObject?.blobId ?? body.newlyCreated.blobId;
  } else if (body.alreadyCertified) {
    blobId = body.alreadyCertified.blobId;
  } else {
    // Fallback – try to extract from any shape
    blobId = body.blobId ?? body.blob_id ?? "";
  }

  if (!blobId) {
    throw new Error(
      `Walrus store failed: could not extract blobId from response: ${JSON.stringify(body)}`
    );
  }

  return { blobId, raw: body };
}

/**
 * Retrieve a blob from Walrus by its blob ID.
 * Uses the aggregator HTTP API: GET /v1/blobs/<BLOB_ID>
 */
export async function readBlob(blobId: string): Promise<string> {
  const env = getEnv();
  const url = `${env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;

  const response = await axios.get(url, {
    timeout: 30_000,
    responseType: "text",
  });

  return response.data as string;
}

/**
 * Check if a blob exists / is available on Walrus.
 * Returns true if the aggregator responds successfully.
 */
export async function blobExists(blobId: string): Promise<boolean> {
  try {
    const env = getEnv();
    const url = `${env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
    await axios.head(url, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
