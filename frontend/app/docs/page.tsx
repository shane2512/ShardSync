"use client";

import { useState } from "react";
import Link from "next/link";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"requirements" | "phases" | "rules" | "tools">("requirements");

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <span className="inline-block py-1 px-4 clay-inset text-secondary font-label-mono text-[12px] uppercase tracking-wider mb-2">
            Context & Reference
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Documentation</h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Complete architectural specifications, build phases, rules, and integration guidelines for ShardSync.
          </p>
        </div>
        <Link href="/" className="clay-button-secondary px-6 py-3 rounded-2xl text-primary font-headline-sm flex items-center gap-2 active:scale-95 self-start md:self-auto no-underline">
          <span className="material-symbols-outlined">arrow_back</span>
          Back Home
        </Link>
      </div>

      {/* Tabs Nav */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setActiveTab("requirements")}
          className={`px-6 py-3 rounded-xl font-headline-sm transition-all active:scale-95 ${
            activeTab === "requirements"
              ? "clay-button-primary text-white"
              : "clay-button-secondary text-primary"
          }`}
        >
          Requirements
        </button>
        <button
          onClick={() => setActiveTab("phases")}
          className={`px-6 py-3 rounded-xl font-headline-sm transition-all active:scale-95 ${
            activeTab === "phases"
              ? "clay-button-primary text-white"
              : "clay-button-secondary text-primary"
          }`}
        >
          Development Phases
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-6 py-3 rounded-xl font-headline-sm transition-all active:scale-95 ${
            activeTab === "rules"
              ? "clay-button-primary text-white"
              : "clay-button-secondary text-primary"
          }`}
        >
          Project Rules
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-6 py-3 rounded-xl font-headline-sm transition-all active:scale-95 ${
            activeTab === "tools"
              ? "clay-button-primary text-white"
              : "clay-button-secondary text-primary"
          }`}
        >
          Tools & Services
        </button>
      </div>

      {/* Doc Panel */}
      <div className="clay-card p-8 md:p-12 min-h-[500px]">
        {activeTab === "requirements" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary mb-2">1. Problem Statement</h2>
              <p className="font-body-md text-on-surface-variant leading-relaxed">
                Autonomous AI agents are increasingly used for on-chain operations, but their behavior is opaque and hard to debug.
                There is no standard way to version, inspect, fork, and roll back agents and their evolving "brains" (config + memory + logs) with cryptographic guarantees on storage and history.
              </p>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-primary mb-4">2. Core Objectives</h2>
              <ul className="space-y-3 font-body-md text-on-surface-variant list-disc pl-5">
                <li>Model agents as <strong>Sui-native objects</strong> with version history.</li>
                <li>Store agent configuration, memory snapshots, and execution logs as <strong>Walrus blobs</strong> with verifiable availability.</li>
                <li>
                  Use <strong>Tatum</strong> for Sui RPC transaction submission, event/transaction indexing for timelines and analytics, and MCP server integrations.
                </li>
                <li>
                  Provide a <strong>dashboard</strong> to create/update/fork agents, visualize execution timelines, inspect logs from Walrus, and compare versions.
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-primary mb-4">3. Functional Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="clay-inset p-6 rounded-2xl">
                  <h3 className="font-headline-sm text-[18px] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">history</span> Agent Lifecycle</h3>
                  <p className="text-on-surface-variant text-[14px]">
                    User provides metadata and JSON config. Backend stores it on Walrus, and Move contract creates `AgentRegistry` and version objects linking to the blob. Forking creates a registry referencing a parent version.
                  </p>
                </div>
                <div className="clay-inset p-6 rounded-2xl">
                  <h3 className="font-headline-sm text-[18px] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">play_arrow</span> Agent Execution</h3>
                  <p className="text-on-surface-variant text-[14px]">
                    Triggering run simulates deterministic agent steps, uploads execution logs to Walrus, and registers an on-chain execution event with duration, status, and log blob references.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "phases" && (
          <div className="space-y-8">
            <h2 className="font-headline-md text-headline-md text-primary mb-4">Phase-by-Phase Development Plan</h2>
            <div className="space-y-6 border-l-2 border-secondary/20 pl-6 ml-2">
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-secondary"></div>
                <h3 className="font-headline-sm text-[18px] text-primary">Phase 0 – Environment & Reference</h3>
                <p className="font-body-md text-on-surface-variant">Set up Sui CLI, Walrus endpoints, Tatum API gateways, and review Tatum MCP specifications.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-secondary"></div>
                <h3 className="font-headline-sm text-[18px] text-primary">Phase 1 – Smart Contracts & Basic Backend</h3>
                <p className="font-body-md text-on-surface-variant">Deploy Move registry contracts to Sui. Implement backend handlers to proxy Walrus storage and prepare Tatum Sui transactions.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-secondary"></div>
                <h3 className="font-headline-sm text-[18px] text-primary">Phase 2 – Frontend, Timelines & Diff</h3>
                <p className="font-body-md text-on-surface-variant">Implement the dashboard interface. Display version timelines using indexed events from Tatum and compare config JSON blobs.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-secondary"></div>
                <h3 className="font-headline-sm text-[18px] text-primary">Phase 3 – Analytics, Polish & Demo</h3>
                <p className="font-body-md text-on-surface-variant">Add interactive execution charts. Polish visual claymorphic aesthetic. Integrate blockchain wallet providers and verify final build workflows.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-8">
            <h2 className="font-headline-md text-headline-md text-primary mb-4">Project Rules & Conventions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="clay-inset p-6 rounded-2xl">
                <h3 className="font-headline-sm text-[18px] mb-2 text-primary">Architectural Guardrails</h3>
                <ul className="space-y-2 text-on-surface-variant text-[14px] list-disc pl-4">
                  <li><strong>Walrus is mandatory:</strong> All configs, execution logs, and states reside in Walrus.</li>
                  <li><strong>Tatum is canonical:</strong> All blockchain state interactions are indexed and routed via Tatum.</li>
                  <li><strong>Sui is coordination:</strong> Smart contracts store directory mappings and blob hashes, not large content.</li>
                </ul>
              </div>
              <div className="clay-inset p-6 rounded-2xl">
                <h3 className="font-headline-sm text-[18px] mb-2 text-primary">Security & Development</h3>
                <ul className="space-y-2 text-on-surface-variant text-[14px] list-disc pl-4">
                  <li><strong>No private keys on backend:</strong> Transactions must be signed client-side via wallet provider.</li>
                  <li><strong>Validate JSON configs:</strong> Verify schemas prior to committing snapshots to Walrus.</li>
                  <li><strong>Respect latency bounds:</strong> Handle network propagation and availability transitions gracefully.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-8">
            <h2 className="font-headline-md text-headline-md text-primary mb-4">Tools & Service Stack</h2>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">storage</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-[18px]">Walrus Protocol</h4>
                  <p className="font-body-md text-on-surface-variant">Decentralized, erasure-coded storage layer for heavy files like AI parameters, execution traces, and model specifications.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">api</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-[18px]">Tatum RPC Gateway</h4>
                  <p className="font-body-md text-on-surface-variant">Unified API interface for Sui blockchain transactions, block checks, and real-time execution event triggers.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">terminal</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-[18px]">Tatum MCP Server</h4>
                  <p className="font-body-md text-on-surface-variant">Integrated terminal controls and `@tatumio/blockchain-mcp` tools facilitating local development and on-chain verification.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
