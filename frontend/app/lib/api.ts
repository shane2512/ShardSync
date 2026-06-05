/**
 * ShardSync API client — typed functions for all backend endpoints.
 * All chain access goes through Tatum via the backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function apiFetch<T>(path: string, options?: RequestInit, retries = 2): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));
    return apiFetch<T>(path, options, retries - 1);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface ContractCall {
  packageId: string;
  module: string;
  function: string;
  arguments: string[];
}

export interface SuiObjectData {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  content: {
    dataType: string;
    type: string;
    fields: Record<string, unknown>;
  };
  owner: { AddressOwner: string } | string;
}

export interface OwnedObjectsResponse {
  data: Array<{ data: SuiObjectData }>;
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface EventData {
  id: { txDigest: string; eventSeq: string };
  packageId: string;
  transactionModule: string;
  sender: string;
  type: string;
  parsedJson: Record<string, unknown>;
  timestampMs: string;
}

export interface EventsResponse {
  data: EventData[];
  hasNextPage: boolean;
  nextCursor: { txDigest: string; eventSeq: string } | null;
}

// ─── Health ───────────────────────────────────────────────────────────

export async function checkHealth() {
  return apiFetch<{ status: string; suiCheckpoint: string }>("/health");
}

// ─── Agents ───────────────────────────────────────────────────────────

export interface CreateAgentResponse {
  walrusConfigBlobId: string;
  contractCall: ContractCall;
}

export async function createAgent(data: {
  name: string;
  description: string;
  config: Record<string, unknown>;
  commitMessage: string;
}) {
  return apiFetch<CreateAgentResponse>("/agents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listAgents(owner: string) {
  return apiFetch<OwnedObjectsResponse>(`/agents?owner=${encodeURIComponent(owner)}`);
}

export async function getAgent(objectId: string) {
  return apiFetch<{ data: SuiObjectData }>(`/agents/${objectId}`);
}

// ─── Versions ─────────────────────────────────────────────────────────

export async function createVersion(data: {
  agentId: string;
  registryObjectId: string;
  config: Record<string, unknown>;
  commitMessage: string;
}) {
  return apiFetch<CreateAgentResponse>("/agents/version", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listVersions(owner: string) {
  return apiFetch<OwnedObjectsResponse>(`/versions?owner=${encodeURIComponent(owner)}`);
}

// ─── Fork ─────────────────────────────────────────────────────────────

export async function forkAgent(data: {
  sourceVersionId: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  commitMessage: string;
}) {
  return apiFetch<CreateAgentResponse>("/agents/fork", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Execution ────────────────────────────────────────────────────────

export interface RunAgentResponse {
  walrusLogBlobId: string;
  executionLog: Record<string, unknown>;
  durationMs: number;
  contractCall: ContractCall;
}

export async function runAgent(data: {
  agentId: string;
  registryObjectId: string;
  versionObjectId: string;
  walletAddress?: string;
}) {
  return apiFetch<RunAgentResponse>("/agents/run", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface RunPromptResponse {
  walrusLogBlobId: string;
  executionLog: Record<string, unknown>;
  durationMs: number;
  toolSelected: string | null;
}

export async function runAgentWithPrompt(data: {
  registryObjectId: string;
  versionObjectId: string;
  walletAddress?: string;
  prompt: string;
}) {
  return apiFetch<RunPromptResponse>("/agents/run-prompt", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listExecutions(cursor?: string, limit = 50) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  return apiFetch<EventsResponse>(`/executions?${params}`);
}

// ─── Blobs ────────────────────────────────────────────────────────────

export interface BlobResponse {
  blobId: string;
  content: string | null;
  available: boolean;
}

export async function readBlob(blobId: string) {
  return apiFetch<BlobResponse>(`/blobs/${blobId}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────

export function shortenId(id: string, chars = 6): string {
  if (!id || id.length < chars * 2 + 2) return id;
  return `${id.slice(0, chars + 2)}...${id.slice(-chars)}`;
}

export function timeAgo(timestampMs: string | number): string {
  const ms = typeof timestampMs === "string" ? parseInt(timestampMs) : timestampMs;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
