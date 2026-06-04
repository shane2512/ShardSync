"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { listAgents, shortenId, timeAgo } from "../lib/api";

interface AgentFields {
  name: string;
  description: string;
  owner: string;
  version_count: string;
  updated_at: string;
  latest_version_id: string | null;
  id: { id: string };
}

interface AgentItem {
  objectId: string;
  fields: AgentFields;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const owner = process.env.NEXT_PUBLIC_DEFAULT_ADDRESS || "";

  useEffect(() => {
    if (!owner) return;
    setLoading(true);
    listAgents(owner)
      .then((res) => {
        const items = res.data.map((d) => ({
          objectId: d.data.objectId,
          fields: d.data.content.fields as unknown as AgentFields,
        }));
        setAgents(items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [owner]);

  const filtered = agents.filter(
    (a) =>
      a.fields.name.toLowerCase().includes(search.toLowerCase()) ||
      a.fields.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingTop: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Agents</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            On-chain agents owned by <code className="mono" style={{ color: "var(--accent-cyan)", fontSize: "12px" }}>{shortenId(owner)}</code>
          </p>
        </div>
        <Link href="/agents/create" className="btn-primary">+ New Agent</Link>
      </div>

      <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none", marginBottom: "24px" }} />

      {loading && (
        <div style={{ display: "grid", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "88px", borderRadius: "16px" }} />
          ))}
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: "24px", cursor: "default", borderColor: "rgba(251,113,133,0.3)" }}>
          <span className="badge badge-error" style={{ marginBottom: "8px" }}>Error</span>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{error}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
            Make sure the backend is running: <code className="mono" style={{ color: "var(--accent-cyan)" }}>cd backend && npm run dev</code>
          </p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gap: "12px" }}>
          {filtered.map((agent, i) => (
            <Link key={agent.objectId} href={`/agents/${agent.objectId}`} className="card animate-slide-up"
              style={{ padding: "24px", textDecoration: "none", color: "inherit", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "16px", animationDelay: `${i * 0.08}s`, opacity: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span className="mono" style={{ fontSize: "16px", fontWeight: 600, color: "var(--accent-cyan)" }}>{agent.fields.name}</span>
                  <span className="badge badge-success">● On-chain</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{agent.fields.description}</p>
                <p className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ID: {shortenId(agent.objectId)}</p>
              </div>
              <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>{agent.fields.version_count}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Versions</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{timeAgo(agent.fields.updated_at)}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Updated</div>
                </div>
                <span style={{ fontSize: "20px", color: "var(--text-muted)" }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card" style={{ padding: "48px", textAlign: "center", cursor: "default" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>◈</div>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No agents found</div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
            {search ? "Try a different search term" : "Create your first autonomous agent"}
          </p>
          <Link href="/agents/create" className="btn-primary">+ Create Agent</Link>
        </div>
      )}
    </div>
  );
}
