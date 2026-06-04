"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { getAgent, listVersions, listExecutions, readBlob, runAgent, shortenId, timeAgo } from "../../lib/api";

interface VersionFields {
  agent_id: string;
  version_number: string;
  parent_version_id: string | null;
  walrus_config_blob_id: string;
  commit_message: string;
  created_at: string;
}

interface VersionItem {
  objectId: string;
  fields: VersionFields;
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [executions, setExecutions] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [diffBlobs, setDiffBlobs] = useState<{ left: string; right: string; leftVer: string; rightVer: string } | null>(null);
  const [diffContent, setDiffContent] = useState<{ left: string; right: string } | null>(null);
  const [blobView, setBlobView] = useState<{ id: string; content: string } | null>(null);
  const owner = process.env.NEXT_PUBLIC_DEFAULT_ADDRESS || "";

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, versionsRes, execRes] = await Promise.all([
          getAgent(id),
          listVersions(owner),
          listExecutions(),
        ]);
        setAgent(agentRes.data.content.fields as Record<string, unknown>);

        const allVersions = versionsRes.data.map((d) => ({
          objectId: d.data.objectId,
          fields: d.data.content.fields as unknown as VersionFields,
        }));
        const agentVersions = allVersions
          .filter((v) => v.fields.agent_id === id)
          .sort((a, b) => parseInt(b.fields.version_number) - parseInt(a.fields.version_number));
        setVersions(agentVersions);

        const agentExecs = execRes.data.filter(
          (e) => (e.parsedJson as Record<string, unknown>).agent_id === id
        );
        setExecutions(agentExecs.map((e) => e.parsedJson as Record<string, unknown>));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, owner]);

  const handleRun = async () => {
    if (!agent || versions.length === 0) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await runAgent({
        agentId: id,
        registryObjectId: id,
        versionObjectId: versions[0].objectId,
      });
      setRunResult(`✓ Execution logged to Walrus: ${shortenId(res.walrusLogBlobId, 8)}`);
    } catch (e) {
      setRunResult(`✕ Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const handleViewBlob = async (blobId: string) => {
    try {
      const res = await readBlob(blobId);
      setBlobView({ id: blobId, content: res.content || "(blob not available)" });
    } catch { setBlobView({ id: blobId, content: "(error reading blob)" }); }
  };

  const handleDiff = async (leftIdx: number, rightIdx: number) => {
    const left = versions[leftIdx];
    const right = versions[rightIdx];
    setDiffBlobs({ left: left.fields.walrus_config_blob_id, right: right.fields.walrus_config_blob_id, leftVer: `v${left.fields.version_number}`, rightVer: `v${right.fields.version_number}` });
    try {
      const [l, r] = await Promise.all([readBlob(left.fields.walrus_config_blob_id), readBlob(right.fields.walrus_config_blob_id)]);
      setDiffContent({ left: l.content || "(unavailable)", right: r.content || "(unavailable)" });
    } catch { setDiffContent({ left: "(error)", right: "(error)" }); }
  };

  const name = agent ? String(agent.name || "") : "";
  const desc = agent ? String(agent.description || "") : "";
  const versionCount = agent ? String(agent.version_count || "0") : "0";

  if (loading) return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      <div className="skeleton" style={{ height: "32px", width: "200px", marginBottom: "16px" }} />
      <div className="skeleton" style={{ height: "16px", width: "400px", marginBottom: "32px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "32px" }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "16px" }} />)}
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      <Link href="/agents" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>← Back to Agents</Link>

      <div className="animate-fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>
            <span className="mono" style={{ color: "var(--accent-cyan)" }}>{name}</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{desc}</p>
          <p className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ID: {shortenId(id)}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-primary" onClick={handleRun} disabled={running} style={{ opacity: running ? 0.5 : 1 }}>
            {running ? "Running..." : "▶ Run Agent"}
          </button>
        </div>
      </div>

      {runResult && (
        <div className="card" style={{ padding: "14px 20px", marginBottom: "24px", cursor: "default", borderColor: runResult.startsWith("✓") ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.3)" }}>
          <span style={{ fontSize: "14px", color: runResult.startsWith("✓") ? "var(--accent-emerald)" : "var(--accent-rose)" }}>{runResult}</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "32px" }}>
        {[
          { label: "Versions", value: versionCount, color: "var(--accent-indigo)" },
          { label: "Executions", value: String(executions.length), color: "var(--accent-cyan)" },
          { label: "Success Rate", value: executions.length ? `${Math.round((executions.filter(e => e.success).length / executions.length) * 100)}%` : "—", color: "var(--accent-emerald)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "20px", cursor: "default", borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Version History */}
      <div className="section-title">Version History</div>
      {versions.length > 1 && (
        <div style={{ marginBottom: "12px" }}>
          <button className="btn-secondary" onClick={() => handleDiff(0, 1)} style={{ fontSize: "13px" }}>
            ⇄ Diff latest two versions
          </button>
        </div>
      )}
      <div style={{ display: "grid", gap: "8px", marginBottom: "32px" }}>
        {versions.map((v, i) => (
          <div key={v.objectId} className="card animate-slide-up" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "60px 1fr auto", alignItems: "center", gap: "16px", cursor: "default", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
            <span className="badge badge-info" style={{ justifyContent: "center" }}>v{v.fields.version_number}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{v.fields.commit_message}</div>
              <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border-subtle)" }}
                onClick={() => handleViewBlob(v.fields.walrus_config_blob_id)}>
                blob: {shortenId(v.fields.walrus_config_blob_id, 8)}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{timeAgo(v.fields.created_at)}</span>
          </div>
        ))}
        {versions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No versions found</p>}
      </div>

      {/* Blob Viewer */}
      {blobView && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Blob Content</div>
            <button onClick={() => setBlobView(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
          <div className="code-block">
            <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>blob: {blobView.id}</div>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{blobView.content}</pre>
          </div>
        </div>
      )}

      {/* Diff Viewer */}
      {diffContent && diffBlobs && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Config Diff: {diffBlobs.leftVer} → {diffBlobs.rightVer}</div>
            <button onClick={() => { setDiffContent(null); setDiffBlobs(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div className="badge badge-info" style={{ marginBottom: "8px" }}>{diffBlobs.leftVer} (latest)</div>
              <div className="code-block"><pre style={{ whiteSpace: "pre-wrap" }}>{diffContent.left}</pre></div>
            </div>
            <div>
              <div className="badge badge-warning" style={{ marginBottom: "8px" }}>{diffBlobs.rightVer} (previous)</div>
              <div className="code-block"><pre style={{ whiteSpace: "pre-wrap" }}>{diffContent.right}</pre></div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Executions */}
      <div className="section-title">Executions</div>
      <div style={{ display: "grid", gap: "8px" }}>
        {executions.map((e, i) => (
          <div key={i} className="card" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: "16px", cursor: "default" }}>
            <span className={`badge ${e.success ? "badge-success" : "badge-error"}`}>{e.success ? "✓ Pass" : "✕ Fail"}</span>
            <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              log: {shortenId(String(e.walrus_log_blob_id || ""), 8)}
            </div>
            <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              ver: {shortenId(String(e.version_id || ""))}
            </span>
          </div>
        ))}
        {executions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No executions yet. Click "Run Agent" to create one.</p>}
      </div>
    </div>
  );
}
