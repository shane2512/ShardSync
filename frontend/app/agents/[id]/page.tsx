"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { getAgent, listVersions, listExecutions, readBlob, runAgentWithPrompt, createVersion, forkAgent, shortenId, timeAgo } from "../../lib/api";
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
function NewVersionModal({ agentId, registryObjectId, latestBlobId, onClose, onSuccess }: {
  agentId: string; registryObjectId: string; latestBlobId: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [config, setConfig] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "signing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  useEffect(() => {
    const loadLatestConfig = async () => {
      const defaultTemplate = {
        name: "ShardSync Agent Config",
        version: "1.0.0",
        description: "Strategy configuration for the autonomous agent",
        settings: {
          pairs: ["SUI/USDC"],
          minConfidence: 0.85,
          maxSlippage: 0.01,
          autoCompound: true
        }
      };

      if (!latestBlobId) {
        setConfig(JSON.stringify(defaultTemplate, null, 2));
        return;
      }

      setLoadingConfig(true);
      setConfig("// Fetching previous version configuration from Walrus...");
      try {
        const res = await readBlob(latestBlobId);
        if (res && res.content) {
          try {
            const parsed = JSON.parse(res.content);
            setConfig(JSON.stringify(parsed, null, 2));
          } catch {
            setConfig(res.content);
          }
        } else {
          setConfig(JSON.stringify(defaultTemplate, null, 2));
        }
      } catch (err) {
        console.error("Failed to load previous config:", err);
        setConfig(JSON.stringify(defaultTemplate, null, 2));
      } finally {
        setLoadingConfig(false);
      }
    };

    loadLatestConfig();
  }, [latestBlobId]);

  const validate = (v: string) => {
    setConfig(v);
    try { JSON.parse(v); setConfigError(null); } catch (e) { setConfigError(e instanceof Error ? e.message : "Invalid JSON"); }
  };

  const handleSubmit = async () => {
    if (!commitMsg.trim() || configError || loadingConfig) return;
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
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="clay-card w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline-md text-headline-md">New Version</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-2xl">close</button>
        </div>

        <div className="grid gap-6">
          <div>
            <label className="flex justify-between font-label-mono text-label-mono text-on-surface-variant mb-2 tracking-wider uppercase">
              <span>Config JSON</span>
              {configError && <span className="text-error normal-case tracking-normal">{configError}</span>}
            </label>
            <div className="bg-[#1b1b1b] rounded-2xl p-4 shadow-[inset_0_8px_16px_rgba(0,0,0,0.2),0_4px_8px_rgba(255,255,255,0.8)]">
              <textarea 
                value={config} onChange={(e) => validate(e.target.value)} rows={10}
                className="w-full bg-transparent text-secondary-fixed font-label-mono text-[13px] leading-relaxed resize-y outline-none border-none"
                spellCheck="false"
                disabled={loadingConfig}
              />
            </div>
          </div>
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2 tracking-wider uppercase">Commit Message</label>
            <input 
              value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} 
              placeholder="e.g. Added SUI/USDC pair support"
              className="w-full clay-inset px-4 py-3 font-body-md outline-none"
            />
          </div>

          {phase === "done" && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex gap-2"><span className="material-symbols-outlined">check_circle</span> Version created on-chain!</div>}
          {phase === "error" && <div className="p-4 bg-error/10 text-error rounded-xl flex gap-2"><span className="material-symbols-outlined">error</span> {errorMsg}</div>}

          <button 
            onClick={handleSubmit} 
            disabled={!commitMsg.trim() || !!configError || phase !== "idle"} 
            className="w-full py-4 clay-button-primary text-white flex items-center justify-center gap-2 font-headline-sm disabled:opacity-50"
          >
            {phase === "idle" && <><span className="material-symbols-outlined">upload</span> Upload & Sign New Version</>}
            {phase === "uploading" && "Uploading to Walrus..."}
            {phase === "signing" && "Waiting for wallet signature..."}
            {phase === "done" && "Done!"}
            {phase === "error" && "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Run Agent (NLP-powered) ────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "What is the transaction history for this wallet?",
  "Show me the portfolio and balance",
  "Is this address safe or malicious?",
  "What is the current SUI price in USD?",
  "Get the recent transfers and activity",
];

function RunAgentModal({ versionObjectId, registryObjectId, walletAddress, onClose, onSuccess }: {
  versionObjectId: string;
  registryObjectId: string;
  walletAddress: string;
  onClose: () => void;
  onSuccess: (result: { blobId: string; log: Record<string, unknown> }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const toolSelection = log?.tool_selection as Record<string, unknown> | undefined;
  const selectedTool = toolSelection?.selected as string | null;
  const nlpReason = toolSelection?.nlp_reason as string | undefined;
  const noToolMsg = toolSelection?.reason as string | undefined;

  const handleRun = async () => {
    if (!prompt.trim() || phase !== "idle") return;
    setPhase("running"); setLog(null);
    try {
      const res = await runAgentWithPrompt({
        registryObjectId,
        versionObjectId,
        walletAddress: walletAddress || undefined,
        prompt: prompt.trim(),
      });
      setLog(res.executionLog);
      setPhase(res.executionLog.success ? "done" : "error");
      if (res.executionLog.success) onSuccess({ blobId: res.walrusLogBlobId, log: res.executionLog });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="clay-card w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="font-headline-md text-headline-md">Run Agent</h2>
              <p className="text-on-surface-variant text-sm mt-1">Describe what you want the agent to do in natural language. The agent will select the right Tatum MCP tool automatically.</p>
            </div>
            <button onClick={onClose} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-2xl shrink-0 ml-4">close</button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="block font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">Your Request</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. What are the recent transactions for this wallet?"
              rows={3}
              className="w-full clay-inset px-4 py-3 font-body-md outline-none resize-none rounded-2xl"
              disabled={phase === "running"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
            />
          </div>

          {/* Example prompts */}
          {phase === "idle" && !log && (
            <div>
              <p className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">Try these</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="text-xs px-3 py-1.5 clay-inset rounded-full text-secondary hover:bg-secondary/5 transition-colors font-label-mono"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tool Selection Preview (shown after run) */}
          {log && (
            <div className="space-y-4">
              {/* Tool badge */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl ${
                selectedTool ? "bg-secondary/8 border border-secondary/20" : "bg-error/5 border border-error/20"
              }`}>
                <span className={`material-symbols-outlined ${
                  selectedTool ? "text-secondary" : "text-error"
                }`}>
                  {selectedTool ? "smart_toy" : "warning"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-headline-sm text-[14px] text-primary">
                    {selectedTool ? `Tool selected: ${selectedTool}` : "No matching tool found"}
                  </p>
                  <p className="font-label-mono text-[11px] text-on-surface-variant truncate">
                    {selectedTool ? nlpReason : noToolMsg}
                  </p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  log.success ? "bg-green-500" : "bg-error"
                }`} />
              </div>

              {/* Execution Log */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant">Execution Log</p>
                  <span className={`font-label-mono text-[11px] px-2 py-0.5 rounded-full ${
                    log.success ? "bg-green-50 text-green-700" : "bg-error/10 text-error"
                  }`}>
                    {log.success ? "SUCCESS" : "FAILED"} · {String(log.duration_ms)}ms
                  </span>
                </div>
                <div className="bg-[#1b1b1b] rounded-2xl p-4 overflow-auto max-h-64">
                  <pre className="text-secondary-fixed font-label-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error from fetch */}
          {phase === "error" && errorMsg && (
            <div className="p-4 bg-error/10 text-error rounded-xl flex gap-2 text-sm">
              <span className="material-symbols-outlined shrink-0">error</span>
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRun}
              disabled={!prompt.trim() || phase === "running"}
              className="flex-1 py-4 clay-button-primary text-white flex items-center justify-center gap-2 font-headline-sm disabled:opacity-50 rounded-2xl"
            >
              {phase === "running" ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Running...</>
              ) : phase === "done" ? (
                <><span className="material-symbols-outlined">check_circle</span>Run Again</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>Execute Agent</>
              )}
            </button>
            {(phase === "done" || phase === "error") && (
              <button onClick={() => { setPhase("idle"); setLog(null); setErrorMsg(""); setPrompt(""); }} className="px-6 py-4 clay-button-secondary rounded-2xl font-headline-sm">
                Reset
              </button>
            )}
          </div>
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
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="clay-card w-full max-w-xl p-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-headline-md text-headline-md">Fork Agent</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-2xl">close</button>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Forking from <span className="font-label-mono font-bold text-secondary">v{sourceVersion.fields.version_number}</span> — "{sourceVersion.fields.commit_message}"
        </p>

        <div className="grid gap-6">
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2 tracking-wider uppercase">New Agent Name</label>
            <input 
              value={name} onChange={(e) => setName(e.target.value)} placeholder="my-forked-agent"
              className="w-full clay-inset px-4 py-3 font-body-md outline-none" 
            />
          </div>
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2 tracking-wider uppercase">Description</label>
            <input 
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's different about this fork?"
              className="w-full clay-inset px-4 py-3 font-body-md outline-none" 
            />
          </div>
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2 tracking-wider uppercase">Commit Message</label>
            <input 
              value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full clay-inset px-4 py-3 font-body-md outline-none" 
            />
          </div>

          {phase === "done" && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex gap-2"><span className="material-symbols-outlined">check_circle</span> Fork created on-chain!</div>}
          {phase === "error" && <div className="p-4 bg-error/10 text-error rounded-xl flex gap-2"><span className="material-symbols-outlined">error</span> {errorMsg}</div>}

          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || !description.trim() || phase !== "idle"} 
            className="w-full py-4 clay-button-primary text-white flex items-center justify-center gap-2 font-headline-sm disabled:opacity-50"
          >
            {phase === "idle" && <><span className="material-symbols-outlined">fork_right</span> Upload & Sign Fork</>}
            {phase === "uploading" && "Uploading config to Walrus..."}
            {phase === "signing" && "Waiting for wallet signature..."}
            {phase === "done" && "Done!"}
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
  const [runResult, setRunResult] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
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

  const handleRunSuccess = ({ blobId }: { blobId: string; log: Record<string, unknown> }) => {
    setRunResult(`✓ Execution logged to Walrus: ${shortenId(blobId, 8)}`);
    loadData();
  };

  const handleViewBlob = async (blobId: string) => {
    setBlobView({ id: blobId, content: "Loading..." });
    try {
      const res = await readBlob(blobId);
      setBlobView({ id: blobId, content: res.content || "(blob not available)" });
    } catch { setBlobView({ id: blobId, content: "(error reading blob)" }); }
  };

  const handleDiff = async (leftIdx: number, rightIdx: number) => {
    const left = versions[leftIdx], right = versions[rightIdx];
    setDiffBlobs({ left: left.fields.walrus_config_blob_id, right: right.fields.walrus_config_blob_id, leftVer: `v${left.fields.version_number}`, rightVer: `v${right.fields.version_number}` });
    setDiffContent(null);
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
    <div className="max-w-container-max mx-auto px-margin-desktop py-12">
      <div className="w-48 h-8 bg-surface-container-high animate-pulse rounded-lg mb-4"></div>
      <div className="w-96 h-4 bg-surface-container-high animate-pulse rounded-lg mb-12"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-card h-48 animate-pulse"></div>
        <div className="clay-card h-48 animate-pulse"></div>
        <div className="clay-card h-48 animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop py-12">
      {/* Modals */}
      {showNewVersion && (
        <NewVersionModal
          agentId={id} registryObjectId={id} latestBlobId={latestBlobId}
          onClose={() => setShowNewVersion(false)}
          onSuccess={() => { setShowNewVersion(false); setLoading(true); loadData(); }}
        />
      )}
      {showRunModal && versions.length > 0 && (
        <RunAgentModal
          versionObjectId={versions[0].objectId}
          registryObjectId={id}
          walletAddress={owner}
          onClose={() => setShowRunModal(false)}
          onSuccess={(r) => { handleRunSuccess(r); setShowRunModal(false); }}
        />
      )}
      {forkVersion && (
        <ForkModal
          sourceVersion={forkVersion}
          onClose={() => setForkVersion(null)}
          onSuccess={() => { setForkVersion(null); }}
        />
      )}
      {blobView && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setBlobView(null)}>
          <div className="clay-card w-full max-w-4xl p-8 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-md text-headline-md font-label-mono text-[16px]">Blob: {blobView.id}</h2>
              <button onClick={() => setBlobView(null)} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-2xl">close</button>
            </div>
            <div className="bg-[#1b1b1b] rounded-2xl p-6 shadow-[inset_0_8px_16px_rgba(0,0,0,0.2),0_4px_8px_rgba(255,255,255,0.8)] overflow-auto flex-1">
              <pre className="text-secondary-fixed font-label-mono text-[13px] leading-relaxed whitespace-pre-wrap">{blobView.content}</pre>
            </div>
          </div>
        </div>
      )}
      {diffBlobs && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setDiffBlobs(null)}>
          <div className="clay-card w-full max-w-[90vw] p-8 h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-md text-headline-md flex items-center gap-4">
                <span className="px-3 py-1 bg-surface-container rounded-md font-label-mono text-sm">{diffBlobs.leftVer}</span>
                <span className="material-symbols-outlined">arrow_right_alt</span>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-md font-label-mono text-sm">{diffBlobs.rightVer}</span>
              </h2>
              <button onClick={() => setDiffBlobs(null)} className="text-on-surface-variant hover:text-primary material-symbols-outlined text-2xl">close</button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
              <div className="bg-[#1b1b1b] rounded-2xl p-6 shadow-[inset_0_8px_16px_rgba(0,0,0,0.2),0_4px_8px_rgba(255,255,255,0.8)] overflow-auto">
                <div className="text-on-tertiary-fixed-variant font-label-mono text-[11px] mb-4 uppercase tracking-widest text-center border-b border-on-tertiary-fixed-variant/20 pb-2">{diffBlobs.left}</div>
                <pre className="text-secondary-fixed font-label-mono text-[13px] leading-relaxed whitespace-pre-wrap">{diffContent ? diffContent.left : "Loading..."}</pre>
              </div>
              <div className="bg-[#1b1b1b] rounded-2xl p-6 shadow-[inset_0_8px_16px_rgba(0,0,0,0.2),0_4px_8px_rgba(255,255,255,0.8)] overflow-auto">
                <div className="text-on-tertiary-fixed-variant font-label-mono text-[11px] mb-4 uppercase tracking-widest text-center border-b border-on-tertiary-fixed-variant/20 pb-2">{diffBlobs.right}</div>
                <pre className="text-secondary-fixed font-label-mono text-[13px] leading-relaxed whitespace-pre-wrap">{diffContent ? diffContent.right : "Loading..."}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Back Action */}
      <Link href="/agents" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-secondary mb-8 transition-colors cursor-pointer group no-underline">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        <span className="font-label-mono text-label-mono">Back to Agents</span>
      </Link>

      {/* Header Section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">{name}</h1>
          <p className="text-on-surface-variant font-body-lg max-w-2xl mb-4">{desc}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px] text-secondary">fingerprint</span>
              <span className="font-label-mono text-label-mono opacity-60">ID: {shortenId(id, 6)}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-label-mono text-label-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Status: Active
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {isConnected && (
            <>
              <button onClick={() => setShowNewVersion(true)} className="flex items-center gap-2 px-6 py-3 clay-button-secondary rounded-xl font-headline-sm text-headline-sm active:scale-95 transition-transform">
                <span className="material-symbols-outlined">add_circle</span>
                New Version
              </button>
              {versions.length > 0 && (
                <button onClick={() => setForkVersion(versions[0])} className="flex items-center gap-2 px-6 py-3 clay-button-secondary rounded-xl font-headline-sm text-headline-sm active:scale-95 transition-transform">
                  <span className="material-symbols-outlined">fork_right</span>
                  Fork
                </button>
              )}
            </>
          )}
          <button onClick={() => { setShowRunModal(true); setRunResult(null); }} disabled={versions.length === 0} className={`flex items-center gap-2 px-8 py-3 clay-button-primary rounded-xl font-headline-sm text-headline-sm active:scale-95 transition-transform ${versions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            Run Agent
          </button>
        </div>
      </section>

      {!isConnected && (
        <div className="clay-card p-4 mb-8 bg-orange-50/50 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">link_off</span>
          <span className="text-sm font-medium">Connect your wallet to add versions or fork this agent</span>
        </div>
      )}

      {runResult && (
        <div className={`clay-card p-4 mb-8 border ${runResult.startsWith("✓") ? "bg-emerald-50/50 border-emerald-200 text-emerald-700" : "bg-error/5 border-error/20 text-error"} flex items-center gap-3`}>
          <span className="material-symbols-outlined">{runResult.startsWith("✓") ? "check_circle" : "error"}</span>
          <span className="text-sm font-medium">{runResult}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
        <div className="clay-card p-8 rounded-[32px] flex flex-col justify-between h-48">
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Versions</span>
          <div className="flex items-end justify-between">
            <span className="font-headline-lg text-headline-lg">{versionCount}</span>
            <span className="material-symbols-outlined text-surface-variant text-[48px]">history</span>
          </div>
        </div>
        <div className="clay-card p-8 rounded-[32px] flex flex-col justify-between h-48">
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Executions</span>
          <div className="flex items-end justify-between">
            <span className="font-headline-lg text-headline-lg">{executions.length}</span>
            <span className="material-symbols-outlined text-surface-variant text-[48px]">terminal</span>
          </div>
        </div>
        <div className="clay-card p-8 rounded-[32px] flex flex-col justify-between h-48">
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Success Rate</span>
          <div className="flex items-end justify-between">
            <span className="font-headline-lg text-headline-lg">
              {executions.length ? `${Math.round((executions.filter(e => e.success).length / executions.length) * 100)}%` : "—"}
            </span>
            <span className="material-symbols-outlined text-secondary text-[48px]">verified</span>
          </div>
        </div>
      </section>

      {/* Lists Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Version History (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface-variant">Version History</h2>
            {versions.length >= 2 && (
              <button onClick={() => handleDiff(1, 0)} className="flex items-center gap-2 px-4 py-1.5 clay-button-secondary rounded-full font-label-mono text-label-mono">
                <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                Diff v{versions[1].fields.version_number} vs v{versions[0].fields.version_number}
              </button>
            )}
          </div>
          
          {versions.length === 0 ? (
            <div className="clay-card p-12 rounded-[24px] text-center text-on-surface-variant italic">No versions found.</div>
          ) : (
            versions.map((v, i) => (
              <div key={v.objectId} className="clay-card p-6 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between hover:translate-x-2 transition-transform duration-200 gap-4">
                <div className="flex items-center gap-6 w-full sm:w-auto overflow-hidden">
                  <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-label-mono text-headline-sm ${i === 0 ? "bg-secondary-container text-on-secondary-container" : "clay-inset text-on-surface"}`}>
                    v{v.fields.version_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline-sm text-headline-sm mb-1 truncate">{v.fields.commit_message || "No commit message"}</h3>
                    <div className="flex items-center gap-2 opacity-50 font-label-mono text-label-mono truncate">
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      <span onClick={() => handleViewBlob(v.fields.walrus_config_blob_id)} className="cursor-pointer hover:underline hover:text-secondary truncate">
                        blob: {shortenId(v.fields.walrus_config_blob_id, 10)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <span className="text-on-surface-variant text-label-mono">{timeAgo(v.fields.created_at)}</span>
                  {isConnected && (
                    <button onClick={() => setForkVersion(v)} className="flex items-center gap-1 px-3 py-1 clay-inset rounded-full text-label-mono hover:bg-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-[16px]">fork_right</span> Fork
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Executions (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface-variant">Recent Executions</h2>
          </div>
          
          {executions.length === 0 ? (
            <div className="clay-card p-12 rounded-[24px] text-center text-on-surface-variant italic">No executions recorded.</div>
          ) : (
            executions.map((e, i) => (
              <div key={i} className="clay-card p-6 rounded-[24px] space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-3 px-4 py-1 rounded-full font-label-mono text-label-mono ${e.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {e.success ? "check_circle" : "error"}
                    </span>
                    {e.success ? "Pass" : "Fail"}
                  </div>
                  <span className="text-on-surface-variant text-label-mono text-[11px] uppercase tracking-widest">{String(e.duration_ms)}ms</span>
                </div>
                <div 
                  onClick={() => handleViewBlob(String(e.walrus_log_blob_id))}
                  className="clay-inset p-4 rounded-xl font-label-mono text-label-mono text-on-surface-variant overflow-x-auto whitespace-nowrap cursor-pointer hover:bg-surface-container-highest transition-colors"
                >
                  log: {shortenId(String(e.walrus_log_blob_id), 12)}
                </div>
                <div className="flex justify-between text-label-mono text-[11px] uppercase tracking-widest opacity-40">
                  <span>Cluster: Sui-Testnet</span>
                  <span>v: {shortenId(String(e.version_id), 6)}</span>
                </div>
              </div>
            ))
          )}
          
          {/* Atmospheric Design Element */}
          <div className="relative clay-card p-8 rounded-[32px] overflow-hidden group mt-4">
            <div className="relative z-10">
              <h4 className="font-headline-sm text-headline-sm text-primary mb-2">Network Health</h4>
              <p className="text-body-md text-on-surface-variant mb-4">Cluster performance is nominal across 48 global nodes.</p>
              <div className="w-full h-2 clay-inset rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[92%] rounded-full"></div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <span className="material-symbols-outlined text-[200px]">language</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Visualization */}
      <section className="mt-16">
        <h2 className="font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface-variant mb-6 text-center">
          Global Agent Distribution
        </h2>
        <div className="w-full h-[400px] clay-card rounded-[48px] overflow-hidden relative">
          <div className="absolute inset-0 bg-[#f0f0f0] flex items-center justify-center">
            <img 
              alt="Network Map" 
              className="w-full h-full object-cover mix-blend-multiply opacity-20 grayscale" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuPOasLh_ceJ2qNP-mnJn7Aa39NrOelGojAmyXbNLaFD3uHG9STzharhZTWmHDEg7YfV0zrioZXjw8U7u8jqFzgjq6vPEjlkt2fsRrVbJxOiUJzUHbjGUQ6Ky1VwYuBuWN7JC9bhaqDE4E8A3GPNB4YlrdWioz1vu0_66rdZH0V6jgz_YxOPEySlcvidA9ZaI_Vy7Pu6SJ_0ckXsVl_FuK8M9J6J7RzRCOKIGdO4nnfBzicpj6pvfmgyMGlxtLIbF9TkTqfSk9Cis"
            />
            {/* Interactive Hotspots */}
            <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-secondary rounded-full shadow-[0_0_20px_rgba(70,72,212,0.6)] animate-ping"></div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4 bg-secondary rounded-full shadow-[0_0_20px_rgba(70,72,212,0.6)] animate-ping" style={{ animationDelay: "0.5s" }}></div>
            <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-secondary rounded-full shadow-[0_0_20px_rgba(70,72,212,0.6)] animate-ping" style={{ animationDelay: "1.2s" }}></div>
          </div>
          <div className="absolute bottom-8 right-8 p-6 clay-card rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="font-label-mono text-label-mono">Sui Testnet Cluster</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-surface-container-highest"></div>
              <span className="font-label-mono text-label-mono">Mainnet Nodes</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
