"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { listAgents, listVersions, listExecutions, checkHealth, shortenId } from "../lib/api";

interface AgentStats {
  name: string;
  objectId: string;
  versions: number;
  executions: number;
  successRate: number;
}

const CHART_COLORS = {
  indigo: "#6366f1",
  cyan: "#22d3ee",
  emerald: "#34d399",
  rose: "#fb7185",
  purple: "#a78bfa",
  amber: "#fbbf24",
};

const tooltipStyle = {
  contentStyle: { background: "#161822", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "13px", color: "#f0f0f5" },
  itemStyle: { color: "#8b8fa3" },
};

export default function AnalyticsPage() {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [execTimeline, setExecTimeline] = useState<{ time: string; count: number; success: number; fail: number }[]>([]);
  const [overview, setOverview] = useState({ agents: 0, versions: 0, executions: 0, successRate: 0, checkpoint: "" });
  const [loading, setLoading] = useState(true);
  const owner = process.env.NEXT_PUBLIC_DEFAULT_ADDRESS || "";

  const load = useCallback(async () => {
    try {
      // Serialize calls to avoid Tatum rate limits
      const healthRes = await checkHealth();
      const agentsRes = owner ? await listAgents(owner) : { data: [] };
      const versionsRes = owner ? await listVersions(owner) : { data: [] };
      const execsRes = await listExecutions();

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
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  const pieData = [
    { name: "Success", value: overview.successRate },
    { name: "Fail", value: 100 - overview.successRate },
  ];

  return (
    <div className="page-container" style={{ paddingTop: "24px" }}>
      <div className="animate-fade-in" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Analytics</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Real-time metrics from Sui testnet via Tatum Data API
        </p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "32px" }}>
        {[
          { label: "Agents", value: overview.agents, color: CHART_COLORS.indigo, icon: "◆" },
          { label: "Versions", value: overview.versions, color: CHART_COLORS.cyan, icon: "△" },
          { label: "Executions", value: overview.executions, color: CHART_COLORS.emerald, icon: "▶" },
          { label: "Success Rate", value: `${overview.successRate}%`, color: overview.successRate >= 90 ? CHART_COLORS.emerald : CHART_COLORS.amber, icon: "✓" },
          { label: "Checkpoint", value: parseInt(overview.checkpoint || "0").toLocaleString(), color: CHART_COLORS.purple, icon: "⬡" },
        ].map((s) => (
          <div key={s.label} className="card animate-slide-up" style={{ padding: "20px", cursor: "default", borderTop: `2px solid ${s.color}` }}>
            {loading ? <div className="skeleton" style={{ height: "40px" }} /> : (
              <>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "32px" }}>
        {/* Execution Timeline Chart */}
        <div className="card" style={{ padding: "24px", cursor: "default" }}>
          <div className="section-title">Execution Activity</div>
          {loading ? <div className="skeleton" style={{ height: "200px" }} /> : execTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={execTimeline}>
                <defs>
                  <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.rose} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#565a6e" fontSize={11} />
                <YAxis stroke="#565a6e" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="success" stroke={CHART_COLORS.emerald} fill="url(#gradSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="fail" stroke={CHART_COLORS.rose} fill="url(#gradFail)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Run agents to see activity</div>
          )}
        </div>

        {/* Success Rate Pie */}
        <div className="card" style={{ padding: "24px", cursor: "default" }}>
          <div className="section-title">Success Rate</div>
          {loading ? <div className="skeleton" style={{ height: "200px" }} /> : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    <Cell fill={CHART_COLORS.emerald} />
                    <Cell fill="rgba(251,113,133,0.3)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "-20px", color: CHART_COLORS.emerald }}>{overview.successRate}%</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>of {overview.executions} executions</div>
            </div>
          )}
        </div>
      </div>

      {/* Per-Agent Chart */}
      <div className="card" style={{ padding: "24px", cursor: "default", marginBottom: "32px" }}>
        <div className="section-title">Versions per Agent</div>
        {loading ? <div className="skeleton" style={{ height: "200px" }} /> : agentStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agentStats} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="#565a6e" fontSize={12} fontFamily="JetBrains Mono, monospace" />
              <YAxis stroke="#565a6e" fontSize={11} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="versions" fill={CHART_COLORS.indigo} radius={[6, 6, 0, 0]} />
              <Bar dataKey="executions" fill={CHART_COLORS.cyan} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>No agents yet</div>
        )}
      </div>

      {/* Agent Table */}
      <div className="section-title">Agent Breakdown</div>
      <div style={{ display: "grid", gap: "8px" }}>
        {agentStats.map((a, i) => (
          <Link key={a.objectId} href={`/agents/${a.objectId}`} className="card animate-slide-up"
            style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr repeat(3, 80px) auto", alignItems: "center", gap: "16px", textDecoration: "none", color: "inherit", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
            <div>
              <span className="mono" style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{a.name}</span>
              <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{shortenId(a.objectId)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>{a.versions}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>ver</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>{a.executions}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>exec</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: a.successRate >= 90 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{a.successRate}%</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>rate</div>
            </div>
            <a href={`https://suiscan.xyz/testnet/object/${a.objectId}`} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} style={{ fontSize: "12px", color: "var(--accent-indigo)", textDecoration: "none" }}>
              Explorer ↗
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
