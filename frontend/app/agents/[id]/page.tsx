"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { getAgent, listVersions, listExecutions, readBlob, runAgent, createVersion, forkAgent, shortenId, timeAgo } from "../../lib/api";
import { useWalletAddress, useIsWalletConnected } from "../../hooks/useWalletAddress";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

interface VersionFields {
  agent_id: string;
  version_number: string;
  walrus_config_blob_id: string;
  commit_message: string;
  created_at: string;
}
interface VersionItem { objectId: string; fields: VersionFields; }

// ─── Modal: New Version ────────────────────────────────────────────────
function NewVersionModal({ agentId, registryObjectId, latestConfig, onClose, onSuccess }: {
  agentId: string; registryObjectId: string; latestConfig: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [config, setConfig] = useState(latestConfig);
  const [commitMsg, setCommitMsg] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "signing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const validate = (v: string) => {
    setConfig(v);
    try { JSON.parse(v); setConfigError(null); } catch (e) { setConfigError(e instanceof Error ? e.message : "Invalid JSON"); }
  };

  const handleSubmit = async () => {
    if (!commitMsg.trim() || configError) return;
    setPhase("uploading");
    try {
      const parsed = JSON.parse(config);
      const res = await createVersion({ agentId, registryObjectId, config: parsed, commitMessage: commitMsg });

      setPhase("signing");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::agent_registry::create_version`,
        arguments: [
          tx.object(registryObjectId),           // &mut AgentRegistry
          tx.pure.string(res.walrusConfigBlobId), // walrus_config_blob_id
          tx.pure.string(commitMsg),              // commit_message
          tx.object("0x6"),                       // &Clock
        ],
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setPhase("done"); setTimeout(onSuccess, 1200); },
        onError: (e) => { setPhase("error"); setErrorMsg(e.message); },
      });
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "640px", padding: "32px", cursor: "default", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>New Version</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "22px" }}>×</button>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>Config JSON</span>
              {configError && <span style={{ color: "var(--accent-rose)", textTransform: "none", fontWeight: 400 }}>{configError}</span>}
            </label>
            <textarea value={config} onChange={(e) => validate(e.target.value)} rows={10}
              style={{ width: "100%", padding: "14px", background: "#0d0e14", border: `1px solid ${configError ? "rgba(251,113,133,0.4)" : "var(--border-subtle)"}`, borderRadius: "12px", color: "var(--accent-cyan)", fontSize: "12px", fontFamily: "var(--font-mono)", outline: "none", resize: "vertical", lineHeight: "1.6" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Commit Message</label>
            <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} placeholder="e.g. Added SUI/USDC pair support"
              style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
          </div>

          {phase === "done" && <div className="badge badge-success" style={{ justifyContent: "center", padding: "12px" }}>✓ Version created on-chain!</div>}
          {phase === "error" && <div style={{ color: "var(--accent-rose)", fontSize: "13px", padding: "12px", background: "rgba(251,113,133,0.08)", borderRadius: "8px" }}>✕ {errorMsg}</div>}

          <button onClick={handleSubmit} disabled={!commitMsg.trim() || !!configError || phase !== "idle"} className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "14px", opacity: (!commitMsg.trim() || !!configError || phase !== "idle") ? 0.5 : 1 }}>
            {phase === "idle" && "△ Upload & Sign New Version"}
            {phase === "uploading" && "Uploading to Walrus..."}
            {phase === "signing" && "Waiting for wallet signature..."}
            {phase === "done" && "✓ Done!"}
            {phase === "error" && "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Fork Agent ─────────────────────────────────────────────────
function ForkModal({ sourceVersion, onClose, onSuccess }: {
  sourceVersion: VersionItem; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [commitMsg, setCommitMsg] = useState(`Forked from v${sourceVersion.fields.version_number}`);
  const [phase, setPhase] = useState<"idle" | "uploading" | "signing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return;
    setPhase("uploading");
    try {
      const res = await forkAgent({
        sourceVersionId: sourceVersion.objectId,
        name: name.trim(), description: description.trim(),
        config: {}, commitMessage: commitMsg,
      });

      setPhase("signing");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::agent_registry::fork_agent`,
        arguments: [
          tx.object(sourceVersion.objectId),      // &AgentVersion
          tx.pure.string(name.trim()),
          tx.pure.string(description.trim()),
          tx.pure.string(res.walrusConfigBlobId), // walrus_config_blob_id
          tx.pure.string(commitMsg),
          tx.object("0x6"),                       // &Clock
        ],
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setPhase("done"); setTimeout(onSuccess, 1200); },
        onError: (e) => { setPhase("error"); setErrorMsg(e.message); },
      });
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "520px", padding: "32px", cursor: "default" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Fork Agent</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "22px" }}>×</button>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          Forking from <span className="mono" style={{ color: "var(--accent-cyan)" }}>v{sourceVersion.fields.version_number}</span> — "{sourceVersion.fields.commit_message}"
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>New Agent Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-forked-agent"
              style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-mono)", outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's different about this fork?"
              style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Commit Message</label>
            <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
          </div>

          {phase === "done" && <div className="badge badge-success" style={{ justifyContent: "center", padding: "12px" }}>✓ Fork created on-chain!</div>}
          {phase === "error" && <div style={{ color: "var(--accent-rose)", fontSize: "13px", padding: "12px", background: "rgba(251,113,133,0.08)", borderRadius: "8px" }}>✕ {errorMsg}</div>}

          <button onClick={handleSubmit} disabled={!name.trim() || !description.trim() || phase !== "idle"} className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "14px", opacity: (!name.trim() || !description.trim() || phase !== "idle") ? 0.5 : 1 }}>
            {phase === "idle" && "⑂ Upload & Sign Fork"}
            {phase === "uploading" && "Uploading config to Walrus..."}
            {phase === "signing" && "Waiting for wallet signature..."}
            {phase === "done" && "✓ Done!"}
            {phase === "error" && "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
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
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [forkVersion, setForkVersion] = useState<VersionItem | null>(null);

  const owner = useWalletAddress();
  const isConnected = useIsWalletConnected();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const loadData = async () => {
    try {
      const [agentRes, versionsRes, execRes] = await Promise.all([
        getAgent(id),
        owner ? listVersions(owner) : Promise.resolve({ data: [] }),
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id, owner]);

  const handleRun = async () => {
    if (!agent || versions.length === 0) return;
    setRunning(true); setRunResult(null);
    try {
      const res = await runAgent({ agentId: id, registryObjectId: id, versionObjectId: versions[0].objectId });
      
      if (!isConnected) {
        setRunResult(`✓ Simulation logged to Walrus (connect wallet to record on-chain)`);
        setRunning(false);
        return;
      }

      setRunResult("Waiting for wallet signature...");
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::agent_registry::log_execution`,
        arguments: [
          tx.object(id),
          tx.object(versions[0].objectId),
          tx.pure.string(res.walrusLogBlobId),
          tx.pure.u64(res.durationMs),
          tx.pure.bool(true), // Assuming success
          tx.object("0x6"), // Clock
        ],
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: () => {
          setRunResult(`✓ Execution logged on-chain & Walrus: ${shortenId(res.walrusLogBlobId, 8)}`);
          setRunning(false);
          loadData();
        },
        onError: (e) => {
          setRunResult(`✕ Error: ${e.message}`);
          setRunning(false);
        }
      });
    } catch (e) {
      setRunResult(`✕ Error: ${e instanceof Error ? e.message : String(e)}`);
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
    const left = versions[leftIdx], right = versions[rightIdx];
    setDiffBlobs({ left: left.fields.walrus_config_blob_id, right: right.fields.walrus_config_blob_id, leftVer: `v${left.fields.version_number}`, rightVer: `v${right.fields.version_number}` });
    try {
      const [l, r] = await Promise.all([readBlob(left.fields.walrus_config_blob_id), readBlob(right.fields.walrus_config_blob_id)]);
      setDiffContent({ left: l.content || "(unavailable)", right: r.content || "(unavailable)" });
    } catch { setDiffContent({ left: "(error)", right: "(error)" }); }
  };

  const name = agent ? String(agent.name || "") : "";
  const desc = agent ? String(agent.description || "") : "";
  const versionCount = agent ? String(agent.version_count || "0") : "0";
  const latestBlobId = versions[0]?.fields.walrus_config_blob_id || "";

  if (loading) return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      <div className="skeleton" style={{ height: "32px", width: "200px", marginBottom: "16px" }} />
      <div className="skeleton" style={{ height: "16px", width: "400px", marginBottom: "32px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "16px" }} />)}
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      {/* Modals */}
      {showNewVersion && (
        <NewVersionModal
          agentId={id} registryObjectId={id} latestConfig={latestBlobId ? "" : "{}"}
          onClose={() => setShowNewVersion(false)}
          onSuccess={() => { setShowNewVersion(false); setLoading(true); loadData(); }}
        />
      )}
      {forkVersion && (
        <ForkModal
          sourceVersion={forkVersion}
          onClose={() => setForkVersion(null)}
          onSuccess={() => { setForkVersion(null); }}
        />
      )}

      <Link href="/agents" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>← Back to Agents</Link>

      {/* Header */}
      <div className="animate-fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>
            <span className="mono" style={{ color: "var(--accent-cyan)" }}>{name}</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{desc}</p>
          <p className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ID: {shortenId(id)}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isConnected && (
            <>
              <button className="btn-secondary" onClick={() => setShowNewVersion(true)} style={{ fontSize: "13px" }}>
                △ New Version
              </button>
              {versions.length > 0 && (
                <button className="btn-secondary" onClick={() => setForkVersion(versions[0])} style={{ fontSize: "13px" }}>
                  ⑂ Fork
                </button>
              )}
            </>
          )}
          <button className="btn-primary" onClick={handleRun} disabled={running} style={{ opacity: running ? 0.5 : 1 }}>
            {running ? "Running..." : "▶ Run Agent"}
          </button>
        </div>
      </div>

      {!isConnected && (
        <div style={{ padding: "12px 16px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", fontSize: "13px", color: "var(--accent-amber)", marginBottom: "24px" }}>
          ⚡ Connect your wallet to add versions or fork this agent
        </div>
      )}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Version History</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {versions.length > 1 && (
            <button className="btn-secondary" onClick={() => handleDiff(0, 1)} style={{ fontSize: "12px", padding: "6px 12px" }}>
              ⇄ Diff v{versions[0]?.fields.version_number} vs v{versions[1]?.fields.version_number}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "32px" }}>
        {versions.map((v, i) => (
          <div key={v.objectId} className="card animate-slide-up"
            style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "60px 1fr auto auto", alignItems: "center", gap: "16px", cursor: "default", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
            <span className="badge badge-info" style={{ justifyContent: "center" }}>v{v.fields.version_number}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{v.fields.commit_message}</div>
              <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border-subtle)" }}
                onClick={() => handleViewBlob(v.fields.walrus_config_blob_id)}>
                blob: {shortenId(v.fields.walrus_config_blob_id, 8)}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{timeAgo(v.fields.created_at)}</span>
            {/* Fork from this version */}
            {isConnected && (
              <button onClick={() => setForkVersion(v)} className="btn-secondary"
                style={{ fontSize: "11px", padding: "4px 10px" }}>
                ⑂ Fork
              </button>
            )}
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
            <div className="section-title" style={{ marginBottom: 0 }}>Config Diff: {diffBlobs.rightVer} → {diffBlobs.leftVer}</div>
            <button onClick={() => { setDiffContent(null); setDiffBlobs(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div className="badge badge-warning" style={{ marginBottom: "8px" }}>{diffBlobs.rightVer} (previous)</div>
              <div className="code-block"><pre style={{ whiteSpace: "pre-wrap" }}>{diffContent.right}</pre></div>
            </div>
            <div>
              <div className="badge badge-info" style={{ marginBottom: "8px" }}>{diffBlobs.leftVer} (latest)</div>
              <div className="code-block"><pre style={{ whiteSpace: "pre-wrap" }}>{diffContent.left}</pre></div>
            </div>
          </div>
        </div>
      )}

      {/* Executions */}
      <div className="section-title">Executions</div>
      <div style={{ display: "grid", gap: "8px" }}>
        {executions.map((e, i) => (
          <div key={i} className="card" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: "16px", cursor: "default" }}>
            <span className={`badge ${e.success ? "badge-success" : "badge-error"}`}>{e.success ? "✓ Pass" : "✕ Fail"}</span>
            <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>log: {shortenId(String(e.walrus_log_blob_id || ""), 8)}</div>
            <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>ver: {shortenId(String(e.version_id || ""))}</span>
          </div>
        ))}
        {executions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No executions yet. Click "Run Agent" to simulate one.</p>}
      </div>
    </div>
  );
}
