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
    <div className="max-w-container-max mx-auto px-margin-desktop py-12">
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Execution Timeline</h1>
        <p className="text-on-surface-variant font-body-lg">Live agent executions indexed via Tatum Data API</p>
      </div>

      <div className="flex gap-12">
        {/* Sidebar Navigation (Contextual) */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-y-4">
          <div className="bg-surface-container-low p-6 rounded-[32px] clay-card flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                <span className="material-symbols-outlined">rocket_launch</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary">Agent Core</h3>
                <span className="text-label-mono text-secondary text-[10px] uppercase tracking-wider">Network Active</span>
              </div>
            </div>
            
            <Link href="/agents/create" className="w-full py-3 rounded-2xl bg-secondary text-white font-bold flex items-center justify-center gap-2 clay-button-primary transition-all hover:translate-x-1 no-underline">
              <span className="material-symbols-outlined">add</span>
              <span>Create New Agent</span>
            </Link>
            
            <div className="space-y-1">
              <Link href="/agents" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-high transition-all duration-200 text-on-surface-variant group no-underline">
                <span className="material-symbols-outlined group-hover:text-secondary">dashboard</span>
                <span className="font-label-mono">Overview</span>
              </Link>
              <Link href="/timeline" className="flex items-center gap-3 p-3 rounded-xl bg-secondary-container text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all no-underline">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>timeline</span>
                <span className="font-label-mono">Deployments</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Timeline Canvas */}
        <div className="flex-1 relative">
          
          {loading && (
            <div className="space-y-12 pl-16">
              <div className="w-full h-32 bg-surface-container-high animate-pulse rounded-[24px]"></div>
              <div className="w-full h-32 bg-surface-container-high animate-pulse rounded-[24px]"></div>
            </div>
          )}

          {error && (
            <div className="clay-card p-8 border border-error/20 bg-error/5">
              <span className="inline-block px-3 py-1 bg-error text-white rounded-full font-label-mono text-sm mb-4">Error</span>
              <p className="text-on-surface-variant mb-2">{error}</p>
              <p className="text-sm text-on-surface-variant opacity-70 font-label-mono">
                Backend must be running: <code className="text-secondary">cd backend && npm run dev</code>
              </p>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="clay-card p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[64px] text-surface-variant mb-4">history</span>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-2">No executions yet</h3>
              <p className="text-on-surface-variant">Run an agent to see its execution history here</p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <>
              {/* Vertical Connector Line */}
              <div className="absolute left-6 top-8 bottom-0 w-[4px] rounded-full z-0" style={{ background: "linear-gradient(180deg, #4648d4 0%, rgba(70, 72, 212, 0.1) 100%)", boxShadow: "inset 1px 0px 2px rgba(255,255,255,0.5)" }}></div>
              
              <div className="space-y-12 pl-16">
                {entries.map((entry, i) => (
                  <div key={`${entry.txDigest}-${i}`} className="relative group">
                    {/* Node Pip */}
                    <div className={`absolute -left-[54px] top-8 w-6 h-6 rounded-full border-4 border-background z-10 shadow-[0_4px_10px_rgba(0,0,0,0.1),inset_1px_1px_2px_rgba(255,255,255,0.8)] ${entry.event.success ? "bg-secondary" : "bg-error"}`}></div>
                    
                    <div className="clay-card p-8 transition-transform duration-300 hover:scale-[1.01]">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <Link href={`/agents/${entry.event.agent_id}`} className="text-primary font-headline-md no-underline hover:text-secondary transition-colors">
                            {entry.agentName || shortenId(entry.event.agent_id)}
                          </Link>
                          {entry.event.success ? (
                            <span className="material-symbols-outlined text-secondary bg-secondary-fixed p-1 rounded-full text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-error bg-error-container p-1 rounded-full text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                          )}
                        </div>
                        <span className="text-on-surface-variant font-label-mono text-[12px]">{timeAgo(entry.timestampMs)}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          <div className="clay-inset px-4 py-2 rounded-xl flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-label-mono uppercase">Log Hash</span>
                            <span className="font-label-mono text-primary text-[13px]">{shortenId(entry.event.walrus_log_blob_id, 12)}</span>
                          </div>
                          <div className="clay-inset px-4 py-2 rounded-xl flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-label-mono uppercase">Ver</span>
                            <span className="font-label-mono text-primary text-[13px]">{shortenId(entry.event.version_id, 12)}</span>
                          </div>
                        </div>
                        
                        <a href={`https://suiscan.xyz/testnet/tx/${entry.txDigest}`} target="_blank" rel="noopener noreferrer" className="p-4 bg-surface-container rounded-2xl flex items-center justify-between hover:bg-secondary-fixed transition-colors no-underline group/link">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-outline">receipt_long</span>
                            <span className="font-label-mono text-on-surface-variant text-[12px]">TX: {shortenId(entry.txDigest, 12)}</span>
                          </div>
                          <span className="material-symbols-outlined text-outline group-hover/link:text-secondary">open_in_new</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
