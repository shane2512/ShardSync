"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listExecutions, listAgents, shortenId, timeAgo } from "../lib/api";
import { useWalletAddress } from "../hooks/useWalletAddress";

interface ExecutionEvent {
  agent_id: string;
  execution_id: string;
  version_id: string;
  walrus_log_blob_id: string;
  success: boolean;
}

interface TimelineEntry {
  event: ExecutionEvent;
  timestampMs: string;
  txDigest: string;
  agentName?: string;
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const owner = useWalletAddress();

  useEffect(() => {
    async function load() {
      try {
        const [execRes, agentsRes] = await Promise.all([
          listExecutions(),
          owner ? listAgents(owner) : Promise.resolve({ data: [] }),
        ]);

        const agentMap = new Map<string, string>();
        for (const a of agentsRes.data) {
          const fields = a.data.content.fields as Record<string, unknown>;
          agentMap.set(a.data.objectId, String(fields.name || ""));
        }

        const items: TimelineEntry[] = execRes.data.map((e) => {
          const parsed = e.parsedJson as unknown as ExecutionEvent;
          return {
            event: parsed,
            timestampMs: e.timestampMs,
            txDigest: e.id.txDigest,
            agentName: agentMap.get(parsed.agent_id),
          };
        });

        items.sort((a, b) => parseInt(b.timestampMs) - parseInt(a.timestampMs));
        setEntries(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [owner]);

  return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      <div className="animate-fade-in" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Execution Timeline</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Live agent executions indexed via Tatum Data API</p>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: "12px" }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "16px" }} />)}
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: "24px", cursor: "default", borderColor: "rgba(251,113,133,0.3)" }}>
          <span className="badge badge-error" style={{ marginBottom: "8px" }}>Error</span>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{error}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
            Backend must be running: <code className="mono" style={{ color: "var(--accent-cyan)" }}>cd backend && npm run dev</code>
          </p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ position: "relative", paddingLeft: "28px" }}>
          {/* Timeline line */}
          <div style={{ position: "absolute", left: "8px", top: "4px", bottom: "4px", width: "2px", background: "linear-gradient(to bottom, var(--accent-indigo), var(--accent-cyan), var(--accent-emerald))", borderRadius: "1px" }} />

          <div style={{ display: "grid", gap: "12px" }}>
            {entries.map((entry, i) => (
              <div key={`${entry.txDigest}-${i}`} className="card animate-slide-up" style={{ padding: "20px 24px", cursor: "default", animationDelay: `${i * 0.06}s`, opacity: 0, position: "relative" }}>
                {/* Dot */}
                <div style={{ position: "absolute", left: "-24px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", borderRadius: "50%", background: entry.event.success ? "var(--accent-emerald)" : "var(--accent-rose)", boxShadow: `0 0 8px ${entry.event.success ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <Link href={`/agents/${entry.event.agent_id}`} className="mono" style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-cyan)", textDecoration: "none" }}>
                        {entry.agentName || shortenId(entry.event.agent_id)}
                      </Link>
                      <span className={`badge ${entry.event.success ? "badge-success" : "badge-error"}`}>
                        {entry.event.success ? "✓" : "✕"}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      log: {shortenId(entry.event.walrus_log_blob_id, 8)} · ver: {shortenId(entry.event.version_id)}
                    </div>
                    <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      tx: {shortenId(entry.txDigest)}
                    </div>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(entry.timestampMs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="card" style={{ padding: "48px", textAlign: "center", cursor: "default" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>⏱</div>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No executions yet</div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Run an agent to see its execution history here
          </p>
        </div>
      )}
    </div>
  );
}
