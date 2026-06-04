"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { checkHealth, listAgents, listExecutions, shortenId } from "./lib/api";
import { useWalletAddress, useIsWalletConnected } from "./hooks/useWalletAddress";

export default function Home() {
  const [health, setHealth] = useState<{ status: string; checkpoint: string } | null>(null);
  const [stats, setStats] = useState({ agents: 0, executions: 0 });
  const [loading, setLoading] = useState(true);
  const owner = useWalletAddress();
  const isConnected = useIsWalletConnected();
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

  useEffect(() => {
    async function load() {
      try {
        const [h, agents, execs] = await Promise.all([
          checkHealth(),
          owner ? listAgents(owner).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          listExecutions().catch(() => ({ data: [] })),
        ]);
        setHealth({ status: h.status, checkpoint: h.suiCheckpoint });
        setStats({ agents: agents.data.length, executions: execs.data.length });
      } catch {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [owner]);

  return (
    <div className="page-container" style={{ paddingTop: "48px", textAlign: "center" }}>
      {/* Hero */}
      <div className="animate-fade-in">
        <div className="badge badge-info" style={{ marginBottom: "24px", fontSize: "13px" }}>◈ Powered by Sui × Walrus × Tatum</div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: "16px" }}>
          Git for <span className="gradient-text">Autonomous Agents</span>
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.6 }}>
          Version, inspect, fork, and roll back AI agents with cryptographic guarantees.
          Every config and execution log is a verifiable Walrus blob.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "48px" }}>
          <Link href="/agents" className="btn-primary">◆ Explore Agents</Link>
          <Link href="/agents/create" className="btn-secondary">+ Create Agent</Link>
        </div>
      </div>

      {/* Architecture Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "48px", textAlign: "left" }}>
        {[
          { label: "ARCHITECTURE", title: "Sui Objects", desc: "Agents, versions & executions as first-class chain objects", color: "var(--accent-indigo)", icon: "◆" },
          { label: "STORAGE", title: "Walrus Blobs", desc: "Configs, logs & snapshots with verifiable availability", color: "var(--accent-cyan)", icon: "△" },
          { label: "INFRASTRUCTURE", title: "Tatum RPC", desc: "All chain access through Tatum's indexed gateway", color: "var(--accent-purple)", icon: "○" },
        ].map((c) => (
          <div key={c.title} className="card" style={{ padding: "24px", cursor: "default", borderTop: `2px solid ${c.color}` }}>
            <div style={{ fontSize: "11px", color: c.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>{c.title}</div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Live System Status */}
      <div className="section-title" style={{ textAlign: "left" }}>System Status</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "48px", textAlign: "left" }}>
        <div className="card" style={{ padding: "20px", cursor: "default" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Tatum Gateway</div>
          {loading ? <div className="skeleton" style={{ height: "24px", width: "100px" }} /> : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: health?.status === "ok" ? "var(--accent-emerald)" : "var(--accent-rose)", boxShadow: `0 0 6px ${health?.status === "ok" ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />
              <span style={{ fontSize: "15px", fontWeight: 600 }}>{health?.status === "ok" ? "Connected" : "Offline"}</span>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: "20px", cursor: "default" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Sui Checkpoint</div>
          {loading ? <div className="skeleton" style={{ height: "24px", width: "120px" }} /> : (
            <span className="mono" style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-cyan)" }}>{health?.checkpoint ? parseInt(health.checkpoint).toLocaleString() : "—"}</span>
          )}
        </div>
        <div className="card" style={{ padding: "20px", cursor: "default" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>On-chain Agents</div>
          {loading ? <div className="skeleton" style={{ height: "24px", width: "40px" }} /> : (
            <span style={{ fontSize: "24px", fontWeight: 700 }}>{stats.agents}</span>
          )}
        </div>
        <div className="card" style={{ padding: "20px", cursor: "default" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Executions</div>
          {loading ? <div className="skeleton" style={{ height: "24px", width: "40px" }} /> : (
            <span style={{ fontSize: "24px", fontWeight: 700 }}>{stats.executions}</span>
          )}
        </div>
      </div>

      {/* Package Info */}
      {packageId && packageId !== "0x0" && (
        <div style={{ textAlign: "left", marginBottom: "48px" }}>
          <div className="section-title">Contract</div>
          <div className="code-block" style={{ display: "inline-block", textAlign: "left" }}>
            <span style={{ color: "var(--text-muted)" }}>package: </span>
            <span style={{ color: "var(--accent-cyan)" }}>{shortenId(packageId, 10)}</span>
            <br />
            <span style={{ color: "var(--text-muted)" }}>module:  </span>
            <span style={{ color: "var(--accent-emerald)" }}>agent_registry</span>
            <br />
            <span style={{ color: "var(--text-muted)" }}>network: </span>
            <span style={{ color: "var(--accent-purple)" }}>Sui Testnet</span>
          </div>
        </div>
      )}
    </div>
  );
}
