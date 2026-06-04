"use client";

import { useState } from "react";
import Link from "next/link";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { createAgent } from "../../lib/api";
import { useIsWalletConnected } from "../../hooks/useWalletAddress";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

const DEFAULT_CONFIG = `{
  "mcp_server": "@tatumio/blockchain-mcp",
  "schedule": "*/15 * * * *",
  "mcp_tools_enabled": [
    "get_wallet_portfolio",
    "get_transaction_history",
    "check_malicous_address",
    "gateway_execute_rpc"
  ],
  "agent_prompt": "Monitor the target wallet portfolio. If a malicious token appears or balance drops significantly, execute RPC to pause trading.",
  "parameters": {
    "target_chain": "sui-testnet",
    "target_wallet": "0xYourWalletAddressHere",
    "alert_threshold": "high"
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
      const parsed = JSON.parse(config);
      const res = await createAgent({
        name: name.trim(),
        description: description.trim(),
        config: parsed,
        commitMessage,
      });

      setPhase("signing");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::agent_registry::create_agent`,
        arguments: [
          tx.pure.string(name.trim()),
          tx.pure.string(description.trim()),
          tx.pure.string(res.walrusConfigBlobId),
          tx.pure.string(commitMessage),
          tx.object("0x6"),
        ],
      });

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
    idle: "Upload Config & Sign Transaction",
    uploading: "Uploading config to Walrus...",
    signing: "Waiting for wallet signature...",
    done: "Done!",
    error: "Failed",
  };

  return (
    <div className="max-w-3xl mx-auto px-margin-mobile md:px-0 py-12">
      {/* Breadcrumb */}
      <Link href="/agents" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-colors no-underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span className="font-label-mono text-label-mono">Back to Agents</span>
      </Link>

      {/* Page Title Section */}
      <div className="mb-12">
        <h1 className="font-headline-lg text-headline-lg mb-2">Create Agent</h1>
        <p className="text-on-tertiary-container font-body-md flex items-center gap-2">
          Config uploads to Walrus <span className="material-symbols-outlined text-xs">trending_flat</span> signed on-chain via your connected wallet
        </p>
      </div>

      {!isConnected && (
        <div className="clay-card p-6 mb-8 flex items-center gap-4 bg-orange-50/50">
          <span className="material-symbols-outlined text-[32px] text-orange-500">link_off</span>
          <div>
            <div className="font-headline-sm text-headline-sm">Wallet Required</div>
            <p className="text-sm text-on-surface-variant">Connect your Slush or Sui wallet to sign the on-chain transaction.</p>
          </div>
        </div>
      )}

      {/* Main Form Clay Container */}
      <div className="clay-card p-10 space-y-10 mb-12">
        {/* Agent Name */}
        <section>
          <label className="block font-label-mono text-label-mono text-on-surface-variant mb-4 tracking-wider uppercase">Agent Name</label>
          <input 
            className="w-full clay-inset px-6 py-4 font-body-md text-primary placeholder:text-outline-variant outline-none" 
            placeholder="e.g. liquidity-provision-agent" 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        {/* Description */}
        <section>
          <label className="block font-label-mono text-label-mono text-on-surface-variant mb-4 tracking-wider uppercase">Description</label>
          <textarea 
            className="w-full clay-inset px-6 py-4 font-body-md text-primary placeholder:text-outline-variant resize-none outline-none" 
            placeholder="Describe the primary function and strategy of this autonomous agent..." 
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </section>

        {/* Config JSON Editor */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <label className="block font-label-mono text-label-mono text-on-surface-variant tracking-wider uppercase flex items-center gap-2">
              Config JSON
              {configError && <span className="text-error normal-case tracking-normal">{configError}</span>}
            </label>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-surface-container rounded-md text-[10px] font-label-mono text-on-surface-variant">VALIDATED</span>
              <span className="px-2 py-1 bg-surface-container rounded-md text-[10px] font-label-mono text-on-surface-variant">LATEST VERSION</span>
            </div>
          </div>
          <div className="bg-[#1b1b1b] rounded-2xl p-6 shadow-[inset_0_8px_16px_rgba(0,0,0,0.2),0_4px_8px_rgba(255,255,255,0.8)] relative group">
            <textarea 
              value={config}
              onChange={(e) => validateConfig(e.target.value)}
              className="w-full h-[320px] bg-transparent text-secondary-fixed font-label-mono text-[14px] leading-relaxed resize-none outline-none border-none"
              spellCheck="false"
            />
          </div>
          <p className="mt-4 text-[12px] font-body-md text-on-tertiary-container italic flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Stored as an immutable Walrus blob. Every version is cryptographically verifiable and timestamped.
          </p>
        </section>

        {/* Commit Message */}
        <section>
          <label className="block font-label-mono text-label-mono text-on-surface-variant mb-4 tracking-wider uppercase">Commit Message</label>
          <input 
            className="w-full clay-inset px-6 py-4 font-body-md text-primary placeholder:text-outline-variant outline-none" 
            placeholder="Initial configuration deployment" 
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </section>

        {/* Stepper Visualizer */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className={`flex flex-col items-center text-center gap-2 ${phase === "uploading" || phase === "idle" ? "" : "opacity-40"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg ${phase === "uploading" ? "bg-secondary text-white" : "bg-surface-container-highest text-on-surface"}`}>1</div>
            <span className={`text-[10px] font-label-mono font-bold ${phase === "uploading" ? "text-secondary" : "text-on-surface"}`}>Upload to Walrus</span>
          </div>
          <div className={`flex flex-col items-center text-center gap-2 ${phase === "signing" ? "" : "opacity-40"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg ${phase === "signing" ? "bg-secondary text-white" : "bg-surface-container-highest text-on-surface"}`}>2</div>
            <span className={`text-[10px] font-label-mono font-bold ${phase === "signing" ? "text-secondary" : "text-on-surface"}`}>Sign in Wallet</span>
          </div>
          <div className={`flex flex-col items-center text-center gap-2 ${phase === "done" ? "" : "opacity-40"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg ${phase === "done" ? "bg-secondary text-white" : "bg-surface-container-highest text-on-surface"}`}>3</div>
            <span className={`text-[10px] font-label-mono font-bold ${phase === "done" ? "text-secondary" : "text-on-surface"}`}>On-chain Registration</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !description.trim() || !!configError || !isConnected}
          className="w-full py-6 clay-button-primary text-white flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === "idle" && <span className="material-symbols-outlined group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>}
          <span className="font-headline-sm text-headline-sm uppercase tracking-widest">{submitting ? phaseLabel[phase] : phaseLabel.idle}</span>
        </button>

        {result && (
          <div className={`p-6 rounded-2xl border ${result.success ? "bg-emerald-50/50 border-emerald-200" : "bg-error/5 border-error/20"}`}>
            <div className={`font-bold mb-2 flex items-center gap-2 ${result.success ? "text-emerald-700" : "text-error"}`}>
              <span className="material-symbols-outlined">{result.success ? "check_circle" : "error"}</span>
              {result.success ? "Agent Created On-chain" : "Error"}
            </div>
            <pre className="text-[12px] text-on-surface-variant whitespace-pre-wrap break-all leading-relaxed font-label-mono">{result.message}</pre>
            {result.txDigest && (
              <a href={`https://suiscan.xyz/testnet/tx/${result.txDigest}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-[13px] text-secondary hover:underline font-label-mono">
                View on SuiScan <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Additional Context / Tips */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="clay-card p-6 flex gap-4 items-start">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary">security</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm mb-1 text-sm">Security Node</h4>
            <p className="text-xs text-on-tertiary-container leading-relaxed">Your agent keys never leave your local environment. ShardSync only stores encrypted references.</p>
          </div>
        </div>
        <div className="clay-card p-6 flex gap-4 items-start">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary">database</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm mb-1 text-sm">Walrus Storage</h4>
            <p className="text-xs text-on-tertiary-container leading-relaxed">Large configs are stored off-chain using Walrus Protocol for cost efficiency and high availability.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
