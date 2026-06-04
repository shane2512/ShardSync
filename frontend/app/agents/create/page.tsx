"use client";

import { useState } from "react";
import Link from "next/link";
import { createAgent } from "../../lib/api";

const DEFAULT_CONFIG = `{
  "model": "gpt-4",
  "schedule": "*/5 * * * *",
  "endpoints": {
    "data_source": "https://api.coingecko.com/api/v3",
    "publish_target": "sui://oracle-feed"
  },
  "parameters": {
    "temperature": 0.1,
    "max_tokens": 512
  }
}`;

export default function CreateAgentPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [commitMessage, setCommitMessage] = useState("Initial version");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; blobId?: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const validateConfig = (value: string) => {
    setConfig(value);
    try {
      JSON.parse(value);
      setConfigError(null);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || configError) return;
    setSubmitting(true);
    setResult(null);
    try {
      const parsed = JSON.parse(config);
      const res = await createAgent({ name: name.trim(), description: description.trim(), config: parsed, commitMessage });
      setResult({
        success: true,
        message: `Agent config uploaded to Walrus! Blob ID: ${res.walrusConfigBlobId}\n\nTo complete creation, sign and submit the transaction with:\n  Package: ${res.contractCall.packageId}\n  Function: ${res.contractCall.function}\n  Args: ${JSON.stringify(res.contractCall.arguments, null, 2)}`,
        blobId: res.walrusConfigBlobId,
      });
    } catch (e) {
      setResult({ success: false, message: e instanceof Error ? e.message : "Failed to create agent" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingTop: "24px", maxWidth: "720px" }}>
      <Link href="/agents" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>← Back to Agents</Link>

      <div className="animate-fade-in" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Create Agent</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Config uploads to Walrus, then you sign the on-chain transaction
        </p>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Agent Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-oracle-bot"
            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-mono)", outline: "none" }} />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fetches DEX prices and publishes oracle updates"
            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
        </div>

        {/* Config JSON */}
        <div>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span>Config JSON</span>
            {configError && <span style={{ color: "var(--accent-rose)", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>{configError}</span>}
          </label>
          <textarea value={config} onChange={(e) => validateConfig(e.target.value)} rows={14}
            style={{ width: "100%", padding: "16px", background: "var(--bg-card)", border: `1px solid ${configError ? "rgba(251,113,133,0.4)" : "var(--border-subtle)"}`, borderRadius: "12px", color: "var(--accent-cyan)", fontSize: "13px", fontFamily: "var(--font-mono)", outline: "none", resize: "vertical", lineHeight: "1.6" }} />
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>This JSON will be stored as a Walrus blob. Every version is immutable & verifiable.</p>
        </div>

        {/* Commit Message */}
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Commit Message</label>
          <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
        </div>

        <button onClick={handleSubmit} disabled={submitting || !name.trim() || !description.trim() || !!configError} className="btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: "15px", opacity: submitting || !name.trim() || !description.trim() || configError ? 0.5 : 1 }}>
          {submitting ? "Uploading to Walrus..." : "◆ Upload Config & Prepare Transaction"}
        </button>
      </div>

      {result && (
        <div className="card animate-fade-in" style={{ padding: "24px", marginTop: "24px", cursor: "default", borderColor: result.success ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.3)" }}>
          <span className={`badge ${result.success ? "badge-success" : "badge-error"}`} style={{ marginBottom: "12px" }}>
            {result.success ? "✓ Config Stored" : "✕ Error"}
          </span>
          <pre className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: "1.6" }}>{result.message}</pre>
        </div>
      )}
    </div>
  );
}
