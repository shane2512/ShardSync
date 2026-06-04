"use client";

import { useState } from "react";
import Link from "next/link";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { createAgent } from "../../lib/api";
import { useIsWalletConnected } from "../../hooks/useWalletAddress";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

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
  const [phase, setPhase] = useState<"idle" | "uploading" | "signing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ success: boolean; message: string; txDigest?: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const account = useCurrentAccount();
  const isConnected = useIsWalletConnected();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

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
    if (!name.trim() || !description.trim() || configError || !account) return;
    setSubmitting(true);
    setPhase("uploading");
    setResult(null);

    try {
      // Step 1: Upload config to Walrus, get back blob ID + tx params
      const parsed = JSON.parse(config);
      const res = await createAgent({
        name: name.trim(),
        description: description.trim(),
        config: parsed,
        commitMessage,
      });

      // Step 2: Build the Move transaction using the on-chain package
      setPhase("signing");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::agent_registry::create_agent`,
        arguments: [
          tx.pure.string(name.trim()),
          tx.pure.string(description.trim()),
          tx.pure.string(res.walrusConfigBlobId),
          tx.pure.string(commitMessage),
          tx.object("0x6"), // Sui Clock shared object — required by the contract
        ],
      });

      // Step 3: Sign + execute via connected wallet (Slush / any Sui wallet)
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (data) => {
            setPhase("done");
            setResult({
              success: true,
              message: `Agent created on-chain! Config blob: ${res.walrusConfigBlobId}`,
              txDigest: data.digest,
            });
          },
          onError: (err) => {
            setPhase("error");
            setResult({ success: false, message: err.message || "Transaction rejected" });
          },
        }
      );
    } catch (e) {
      setPhase("error");
      setResult({ success: false, message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const phaseLabel = {
    idle: "◆ Upload Config & Sign Transaction",
    uploading: "Uploading config to Walrus...",
    signing: "Waiting for wallet signature...",
    done: "Done!",
    error: "Failed",
  };

  return (
    <div className="page-container" style={{ paddingTop: "24px", maxWidth: "720px" }}>
      <Link href="/agents" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>← Back to Agents</Link>

      <div className="animate-fade-in" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Create Agent</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Config uploads to Walrus → signed on-chain via your connected wallet
        </p>
      </div>

      {/* Wallet not connected warning */}
      {!isConnected && (
        <div className="card" style={{ padding: "20px 24px", cursor: "default", borderColor: "rgba(251,191,36,0.3)", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🔗</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Wallet Required</div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Connect your Slush or Sui wallet using the button in the nav to sign the on-chain transaction.</p>
          </div>
        </div>
      )}

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
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Stored as an immutable Walrus blob. Every version is cryptographically verifiable.</p>
        </div>

        {/* Commit Message */}
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Commit Message</label>
          <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
        </div>

        {/* Flow: 1 → 2 → 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
          {[
            { n: "1", label: "Upload to Walrus", active: phase === "uploading" },
            { n: "2", label: "Sign in Wallet", active: phase === "signing" },
            { n: "3", label: "On-chain", active: phase === "done" },
          ].map(s => (
            <div key={s.n} style={{ padding: "8px 12px", borderRadius: "8px", background: s.active ? "rgba(99,102,241,0.1)" : "var(--bg-card)", border: `1px solid ${s.active ? "rgba(99,102,241,0.3)" : "var(--border-subtle)"}`, textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: s.active ? "var(--accent-indigo)" : "var(--text-muted)" }}>{s.n}</div>
              <div>{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !description.trim() || !!configError || !isConnected}
          className="btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: "15px", opacity: (submitting || !name.trim() || !description.trim() || configError || !isConnected) ? 0.5 : 1 }}
        >
          {submitting ? phaseLabel[phase] : phaseLabel.idle}
        </button>
      </div>

      {result && (
        <div className="card animate-fade-in" style={{ padding: "24px", marginTop: "24px", cursor: "default", borderColor: result.success ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.3)" }}>
          <span className={`badge ${result.success ? "badge-success" : "badge-error"}`} style={{ marginBottom: "12px" }}>
            {result.success ? "✓ Agent Created On-chain" : "✕ Error"}
          </span>
          <pre className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: "1.6" }}>{result.message}</pre>
          {result.txDigest && (
            <a href={`https://suiscan.xyz/testnet/tx/${result.txDigest}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "12px", fontSize: "13px", color: "var(--accent-indigo)", textDecoration: "none" }}>
              View on SuiScan ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
