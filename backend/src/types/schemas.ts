import { z } from "zod";

// ─── Request Schemas ──────────────────────────────────────────────────

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(1024).default(""),
  config: z.record(z.unknown()), // arbitrary JSON config
  commitMessage: z.string().max(256).default("Initial version"),
});

export const UpdateAgentSchema = z.object({
  agentId: z.string().min(1),
  registryObjectId: z.string().min(1),
  config: z.record(z.unknown()),
  commitMessage: z.string().max(256).default("Update"),
});

export const ForkAgentSchema = z.object({
  sourceVersionId: z.string().min(1),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).default(""),
  config: z.record(z.unknown()),
  commitMessage: z.string().max(256).default("Forked"),
});

export const RunAgentSchema = z.object({
  agentId: z.string().min(1),
  registryObjectId: z.string().min(1),
  versionObjectId: z.string().min(1),
});

// ─── Response Types ───────────────────────────────────────────────────

export interface AgentSummary {
  objectId: string;
  name: string;
  description: string;
  owner: string;
  versionCount: number;
  latestVersionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VersionDetail {
  objectId: string;
  agentId: string;
  versionNumber: number;
  parentVersionId: string | null;
  walrusConfigBlobId: string;
  walrusSnapshotBlobId: string | null;
  commitMessage: string;
  createdAt: number;
}

export interface ExecutionDetail {
  objectId: string;
  agentId: string;
  versionId: string;
  walrusLogBlobId: string;
  durationMs: number;
  success: boolean;
  createdAt: number;
}

export interface BlobContent {
  blobId: string;
  content: string;
  available: boolean;
}
