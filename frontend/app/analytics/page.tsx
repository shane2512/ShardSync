"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { listAgents, listVersions, listExecutions, checkHealth, shortenId } from "../lib/api";
import { useWalletAddress } from "../hooks/useWalletAddress";
import { useNetwork } from "../hooks/useNetwork";

interface AgentStats {
  name: string;
  objectId: string;
  versions: number;
  executions: number;
  successRate: number;
}

const CHART_COLORS = {
  indigo: "#0066CC",
  cyan: "#2dd4bf",
  emerald: "#22c55e",
  rose: "#ba1a1a",
  purple: "#6063ee",
  amber: "#f59e0b",
};

const tooltipStyle = {
  contentStyle: { background: "#ffffff", border: "none", borderRadius: "16px", fontSize: "13px", color: "#1b1b1b", boxShadow: "0 10px 20px rgba(0,0,0,0.1), inset 2px 2px 4px rgba(255,255,255,1)" },
  itemStyle: { color: "#4c4546", fontFamily: "JetBrains Mono, monospace" },
  cursor: { fill: "#f3f3f3" }
};

export default function AnalyticsPage() {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [execTimeline, setExecTimeline] = useState<{ time: string; count: number; success: number; fail: number }[]>([]);
  const [overview, setOverview] = useState({ agents: 0, versions: 0, executions: 0, successRate: 0, checkpoint: "" });
  const [loading, setLoading] = useState(true);
  const owner = useWalletAddress();
  const { network } = useNetwork();

  const load = useCallback(async () => {
    try {
      const healthRes = await checkHealth(network);
      const agentsRes = owner ? await listAgents(owner, network) : { data: [] };
      const versionsRes = owner ? await listVersions(owner, network) : { data: [] };
      const execsRes = await listExecutions(network);

      const agents = agentsRes.data.map((a) => {
        const f = a.data.content.fields as Record<string, unknown>;
        return { id: a.data.objectId, name: String(f.name || ""), versionCount: parseInt(String(f.version_count || "0")) };
      });

      const versionsByAgent = new Map<string, number>();
      versionsRes.data.forEach((v) => {
        const f = v.data.content.fields as Record<string, unknown>;
        const aid = String(f.agent_id);
        versionsByAgent.set(aid, (versionsByAgent.get(aid) || 0) + 1);
      });

      const execsByAgent = new Map<string, { total: number; success: number }>();
      const timeMap = new Map<string, { count: number; success: number; fail: number }>();

      execsRes.data.forEach((e) => {
        const p = e.parsedJson as Record<string, unknown>;
        const aid = String(p.agent_id);
        const s = execsByAgent.get(aid) || { total: 0, success: 0 };
        s.total++;
        if (p.success) s.success++;
        execsByAgent.set(aid, s);

        const ts = parseInt(e.timestampMs);
        const d = new Date(ts);
        const key = `${d.getHours().toString().padStart(2, "0")}:${(Math.floor(d.getMinutes() / 10) * 10).toString().padStart(2, "0")}`;
        const t = timeMap.get(key) || { count: 0, success: 0, fail: 0 };
        t.count++;
        if (p.success) t.success++; else t.fail++;
        timeMap.set(key, t);
      });

      const stats: AgentStats[] = agents.map((a) => ({
        name: a.name,
        objectId: a.id,
        versions: versionsByAgent.get(a.id) || a.versionCount,
        executions: execsByAgent.get(a.id)?.total || 0,
        successRate: execsByAgent.has(a.id) ? Math.round((execsByAgent.get(a.id)!.success / execsByAgent.get(a.id)!.total) * 100) : 0,
      }));

      const timeline = Array.from(timeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, data]) => ({ time, ...data }));

      const totalExec = execsRes.data.length;
      const totalSuccess = execsRes.data.filter((e) => (e.parsedJson as Record<string, unknown>).success).length;

      setAgentStats(stats);
      setExecTimeline(timeline);
      setOverview({
        agents: agents.length,
        versions: versionsRes.data.length,
        executions: totalExec,
        successRate: totalExec > 0 ? Math.round((totalSuccess / totalExec) * 100) : 0,
        checkpoint: healthRes.suiCheckpoint,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [owner, network]);

  useEffect(() => { load(); }, [load]);

  const pieData = [
    { name: "Success", value: overview.successRate },
    { name: "Fail", value: 100 - overview.successRate },
  ];

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8 md:py-12">
        <div className="w-48 h-8 bg-surface-container-high animate-pulse rounded-lg mb-4"></div>
        <div className="w-96 h-4 bg-surface-container-high animate-pulse rounded-lg mb-12"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter mb-10">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className={`clay-card h-40 animate-pulse ${i === 5 ? 'lg:col-span-1 md:col-span-2' : ''}`}></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-10">
          <div className="lg:col-span-2 clay-card h-[400px] animate-pulse"></div>
          <div className="clay-card h-[400px] animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8 md:py-12">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Analytics</h1>
        <p className="font-body-lg text-on-surface-variant max-w-2xl">
          Real-time metrics from Sui testnet via Tatum Data API. Monitor performance, version history, and execution stability across your shard network.
        </p>
      </div>

      {/* Top-Level Metric Grid (Claymorphic Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter mb-10">
        <div className="clay-card p-6 flex flex-col justify-between h-40 group">
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-[12px] text-secondary font-bold uppercase tracking-widest">Agents</span>
            <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">memory</span>
          </div>
          <div className="font-headline-lg text-[48px] text-primary leading-none">{overview.agents}</div>
          <div className="flex items-center gap-1 text-[12px] text-secondary">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            <span>Total indexed</span>
          </div>
        </div>

        <div className="clay-card p-6 flex flex-col justify-between h-40 group">
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-[12px] text-secondary font-bold uppercase tracking-widest">Versions</span>
            <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">history_edu</span>
          </div>
          <div className="font-headline-lg text-[48px] text-primary leading-none">{overview.versions}</div>
          <div className="flex items-center gap-1 text-[12px] text-outline">
            <span>Registered</span>
          </div>
        </div>

        <div className="clay-card p-6 flex flex-col justify-between h-40 group">
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-[12px] text-secondary font-bold uppercase tracking-widest">Executions</span>
            <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">bolt</span>
          </div>
          <div className="font-headline-lg text-[48px] text-primary leading-none">{overview.executions}</div>
          <div className="flex items-center gap-1 text-[12px] text-outline">
            <span>Tracked</span>
          </div>
        </div>

        <div className={`clay-card p-6 flex flex-col justify-between h-40 group border-2 border-transparent hover:border-secondary/10`}>
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-[12px] text-secondary font-bold uppercase tracking-widest">Success Rate</span>
            <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">check_circle</span>
          </div>
          <div className={`font-headline-lg text-[48px] ${overview.successRate >= 90 ? 'text-[#22c55e]' : 'text-amber-500'} leading-none`}>{overview.successRate}%</div>
          <div className={`flex items-center gap-1 text-[12px] ${overview.successRate >= 90 ? 'text-[#22c55e]' : 'text-amber-500'}`}>
            <span>Stability score</span>
          </div>
        </div>

        <div className="clay-card p-6 flex flex-col justify-between h-40 group lg:col-span-1 md:col-span-2">
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-[12px] text-secondary font-bold uppercase tracking-widest">Checkpoint</span>
            <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">numbers</span>
          </div>
          <div className="font-headline-sm text-[24px] text-primary truncate" title={overview.checkpoint}>{overview.checkpoint || "—"}</div>
          <div className="flex items-center gap-1 text-[12px] text-outline">
            <span>Sui Testnet</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-10">
        {/* Execution Activity Chart */}
        <div className="lg:col-span-2 clay-card p-8 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-1">Execution Activity</h3>
              <p className="font-label-mono text-[12px] text-on-tertiary-container uppercase">Frequency per minute</p>
            </div>
          </div>
          <div className="flex-grow clay-inset p-6 relative">
            {execTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={execTimeline}>
                  <defs>
                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.rose} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#7e7576" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} />
                  <YAxis stroke="#7e7576" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="success" stroke={CHART_COLORS.emerald} fill="url(#gradSuccess)" strokeWidth={3} />
                  <Area type="monotone" dataKey="fail" stroke={CHART_COLORS.rose} fill="url(#gradFail)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-label-mono text-outline">No execution data available</div>
            )}
          </div>
        </div>

        {/* Success Rate Ring */}
        <div className="clay-card p-8 flex flex-col items-center justify-center text-center">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-1 self-start">Success Rate</h3>
          <p className="font-label-mono text-[12px] text-on-tertiary-container uppercase mb-8 self-start">Integrity Score</p>

          {overview.executions > 0 ? (
            <>
              <div className="relative w-48 h-48 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0} cornerRadius={4}>
                      <Cell fill={CHART_COLORS.emerald} />
                      <Cell fill={CHART_COLORS.rose} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-lg text-[40px] text-primary">{overview.successRate}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="clay-inset p-3 rounded-xl">
                  <p className="text-[10px] font-label-mono text-outline uppercase">Pass</p>
                  <p className="font-headline-sm text-[16px] text-[#22c55e]">{execTimeline.reduce((acc, curr) => acc + curr.success, 0)}</p>
                </div>
                <div className="clay-inset p-3 rounded-xl">
                  <p className="text-[10px] font-label-mono text-outline uppercase">Fail</p>
                  <p className="font-headline-sm text-[16px] text-error">{execTimeline.reduce((acc, curr) => acc + curr.fail, 0)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-48 flex items-center justify-center font-label-mono text-outline">No data</div>
          )}
        </div>
      </div>

      {/* Versions Per Agent Section */}
      <div className="clay-card p-8 mb-10">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-1">Versions per Agent</h3>
        <p className="font-label-mono text-[12px] text-on-tertiary-container uppercase mb-8">Distribution of software releases</p>
        <div className="h-72 clay-inset p-6 rounded-2xl">
          {agentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentStats} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#7e7576" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} />
                <YAxis stroke="#7e7576" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="versions" fill={CHART_COLORS.indigo} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center font-label-mono text-outline">No agents available</div>
          )}
        </div>
      </div>

      {/* Agent Breakdown List */}
      <div className="mb-6">
        <h3 className="font-label-mono text-[12px] text-on-tertiary-container uppercase tracking-widest mb-4">Agent Breakdown</h3>
        <div className="space-y-4">
          {agentStats.length > 0 ? (
            agentStats.map((a, i) => (
              <div key={a.objectId} className="clay-card p-6 flex flex-wrap items-center justify-between gap-6 hover:translate-x-1 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary shadow-[inset_1px_1px_4px_rgba(255,255,255,0.8)]">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-[18px] text-secondary">{a.name}</h4>
                    <p className="font-label-mono text-[12px] text-outline">{shortenId(a.objectId, 12)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 md:gap-12">
                  <div className="text-center">
                    <p className="text-[10px] font-label-mono text-outline uppercase">Ver</p>
                    <p className="font-headline-sm text-primary">{a.versions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-label-mono text-outline uppercase">Exec</p>
                    <p className="font-headline-sm text-primary">{a.executions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-label-mono text-outline uppercase">Rate</p>
                    <p className={`font-headline-sm ${a.executions === 0 ? 'text-outline' : (a.successRate >= 90 ? 'text-[#22c55e]' : 'text-amber-500')}`}>
                      {a.executions === 0 ? 'N/A' : `${a.successRate}%`}
                    </p>
                  </div>
                  <Link href={`/agents/${a.objectId}`} className="flex items-center gap-1 font-label-mono text-[12px] text-secondary hover:underline bg-surface-container-high px-3 py-1.5 rounded-full no-underline transition-colors">
                    View <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="clay-card p-8 text-center font-label-mono text-outline">No agents registered</div>
          )}
        </div>
      </div>
    </div>
  );
}
