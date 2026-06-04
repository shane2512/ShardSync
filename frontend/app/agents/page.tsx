"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { listAgents, shortenId, timeAgo } from "../lib/api";
import { useWalletAddress, useIsWalletConnected } from "../hooks/useWalletAddress";

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

  const owner = useWalletAddress();
  const isConnected = useIsWalletConnected();

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
    <div className="max-w-container-max mx-auto px-margin-desktop py-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Agents</h1>
          <p className="text-on-surface-variant font-body-lg">
            {isConnected ? (
              <>On-chain autonomous entities managed by <span className="text-secondary font-medium">{shortenId(owner)}</span></>
            ) : (
              <span className="text-error">Connect wallet to view agents</span>
            )}
          </p>
        </div>
        <Link href="/agents/create" className="clay-button-primary flex items-center gap-2 text-white px-8 py-4 rounded-2xl font-headline-sm text-headline-sm no-underline">
          <span className="material-symbols-outlined">add_circle</span>
          Create New Agent
        </Link>
      </section>

      {/* Search and Filters */}
      <section className="mb-8">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-tertiary-container">search</span>
          <input 
            className="clay-inset w-full pl-16 pr-8 py-5 rounded-3xl font-body-md text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-all border-none" 
            placeholder="Search agents by name or ID..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* Agent Cards Grid */}
      <section className="flex flex-col gap-6">
        {!isConnected && (
          <div className="clay-card p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-on-tertiary-container">account_balance_wallet</span>
            <h3 className="font-headline-sm text-headline-sm text-primary">Wallet Not Connected</h3>
            <p className="text-on-surface-variant font-body-md">Connect your Slush or Sui wallet to load your on-chain agents.</p>
          </div>
        )}

        {loading && isConnected && (
          <div className="clay-card p-8 rounded-3xl h-32 flex items-center justify-center text-on-surface-variant">
            Loading...
          </div>
        )}

        {error && (
          <div className="clay-card p-8 rounded-3xl border border-error bg-error/5 text-error">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {!loading && !error && filtered.map((agent) => (
          <Link key={agent.objectId} href={`/agents/${agent.objectId}`} className="clay-card p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between group cursor-pointer hover:translate-y-[-4px] transition-transform duration-300 no-underline">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shadow-[inset_0_2px_8px_rgba(255,255,255,1)]">
                <span className="material-symbols-outlined text-[32px]">memory</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-headline-sm text-headline-sm text-primary">{agent.fields.name}</h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold tracking-wider uppercase border border-emerald-100">On-chain</span>
                </div>
                <p className="text-on-surface-variant font-body-md mb-2">{agent.fields.description || "No description provided."}</p>
                <span className="font-label-mono text-label-mono text-on-tertiary-container">ID: {shortenId(agent.objectId)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-12 mt-6 md:mt-0 w-full md:w-auto justify-end">
              <div className="text-center">
                <p className="font-headline-md text-headline-md text-primary">{agent.fields.version_count}</p>
                <p className="font-label-mono text-[10px] text-on-tertiary-container uppercase tracking-widest">Versions</p>
              </div>
              <div className="text-center">
                <p className="font-headline-sm text-headline-sm text-primary">{timeAgo(agent.fields.updated_at)}</p>
                <p className="font-label-mono text-[10px] text-on-tertiary-container uppercase tracking-widest">Updated</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-on-surface-variant group-hover:bg-secondary group-hover:text-white transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_12px_rgba(0,0,0,0.05)] bg-white">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>
          </Link>
        ))}

        {!loading && !error && isConnected && filtered.length === 0 && (
          <div className="clay-card p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-on-tertiary-container">search_off</span>
            <h3 className="font-headline-sm text-headline-sm text-primary">No agents found</h3>
            <p className="text-on-surface-variant font-body-md">Create your first autonomous agent or try a different search term.</p>
          </div>
        )}
      </section>
    </div>
  );
}
