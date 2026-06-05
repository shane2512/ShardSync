"use client";

import { useState } from "react";

const NAV = [
  { id: "overview",  label: "Overview",           icon: "auto_awesome" },
  { id: "quickstart",label: "Quick Start",         icon: "rocket_launch" },
  { id: "agents",    label: "Agents",              icon: "smart_toy" },
  { id: "versions",  label: "Version Control",     icon: "history" },
  { id: "execution", label: "Execution",           icon: "play_circle" },
  { id: "tools",     label: "Tools & Chains",      icon: "build" },
  { id: "api",       label: "API Reference",       icon: "code" },
  { id: "stack",     label: "Tech Stack",          icon: "layers" },
];

const DATA_TOOLS = [
  { name: "get_metadata",             desc: "Fetch NFT / multitoken metadata by contract address and token IDs" },
  { name: "get_wallet_balance_by_time",desc: "Get wallet balance at a specific historical timestamp" },
  { name: "get_wallet_portfolio",     desc: "Return all coin balances and token holdings for a wallet" },
  { name: "get_owners",               desc: "List all owners of an NFT or token contract" },
  { name: "check_owner",              desc: "Verify whether an address owns a specific token" },
  { name: "get_transaction_history",  desc: "Retrieve recent transaction history for a wallet address" },
  { name: "get_block_by_time",        desc: "Look up block number and info at a given timestamp" },
  { name: "get_tokens",               desc: "List all ERC-20 / token holdings for a wallet" },
  { name: "check_malicous_address",   desc: "Security check — flag whether an address is known malicious" },
  { name: "get_exchange_rate",        desc: "Fetch real-time exchange rate for any crypto / fiat pair" },
];

const GATEWAY_TOOLS = [
  { name: "gateway_get_supported_chains",  desc: "Return all blockchain networks available via Tatum RPC Gateway" },
  { name: "gateway_get_supported_methods", desc: "List RPC methods supported for a specific chain" },
  { name: "gateway_execute_rpc",           desc: "Execute an arbitrary JSON-RPC call on any supported chain" },
];

const CHAINS = [
  "Ethereum", "Polygon", "Arbitrum One", "Optimism", "Base",
  "BNB Smart Chain", "Avalanche", "Fantom", "Celo", "Gnosis",
  "Ronin", "Chiliz", "Bitcoin", "Litecoin", "Dogecoin",
  "Bitcoin Cash", "Solana", "Cardano", "Tezos", "Stellar",
  "Ripple", "EOS",
];

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: "⬡", Polygon: "⬡", "Arbitrum One": "⬡", Optimism: "⬡", Base: "⬡",
  "BNB Smart Chain": "⬡", Avalanche: "⬡", Fantom: "⬡", Celo: "⬡", Gnosis: "⬡",
  Ronin: "⬡", Chiliz: "⬡", Bitcoin: "₿", Litecoin: "Ł", Dogecoin: "Ð",
  "Bitcoin Cash": "₿", Solana: "◎", Cardano: "₳", Tezos: "ꜩ", Stellar: "✦",
  Ripple: "✕", EOS: "⬡",
};

export default function DocsPage() {
  const [active, setActive] = useState("overview");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>

      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop flex gap-10 py-8 md:py-12 w-full">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 gap-1 sticky top-28 self-start">
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-3 pl-3">Contents</p>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium ${
                active === n.id
                  ? "bg-secondary/15 text-secondary"
                  : "text-on-surface-variant hover:text-primary hover:bg-white/5"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${active === n.id ? "text-secondary" : ""}`}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 w-full mb-6 shrink-0">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${active === n.id ? "clay-button-primary text-white" : "clay-button-secondary text-primary"}`}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-10">

          {active === "overview" && (
            <section className="space-y-8">
              <div>
                <span className="inline-block py-1 px-3 clay-inset text-secondary font-label-mono text-[11px] uppercase tracking-wider mb-3">What is ShardSync</span>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-4">Version Control for Autonomous AI Agents</h1>
                <p className="font-body-md text-on-surface-variant leading-relaxed max-w-2xl">
                  ShardSync brings the power of version control to on-chain AI agents. Every agent config, execution log, and memory snapshot is stored as a cryptographically verifiable blob on <strong className="text-primary">Walrus</strong>, indexed on <strong className="text-primary">Sui</strong>, and queried through <strong className="text-primary">Tatum</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { icon: "history", title: "Version History", desc: "Every change to an agent creates an immutable version on-chain. Roll back to any prior state in one click." },
                  { icon: "fork_right", title: "Fork Agents", desc: "Clone any agent into a new registry. Experiment with config changes without affecting the original." },
                  { icon: "verified_user", title: "Cryptographic Proof", desc: "Agent configs and execution logs are stored on Walrus with verifiable blob IDs — tamper-evident by design." },
                ].map((c) => (
                  <div key={c.title} className="clay-inset p-6 rounded-2xl space-y-3">
                    <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary">{c.icon}</span>
                    </div>
                    <h3 className="font-headline-sm text-[16px] text-primary">{c.title}</h3>
                    <p className="text-on-surface-variant text-[14px] leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="clay-card p-6 rounded-2xl border border-secondary/20">
                <h2 className="font-headline-sm text-[18px] text-primary mb-4">How it works</h2>
                <div className="space-y-4">
                  {[
                    ["1", "Create Agent", "Define a name, description, and JSON configuration specifying the MCP tools and parameters your agent uses."],
                    ["2", "Store on Walrus", "The config JSON is uploaded as a blob to Walrus decentralized storage. The blob ID is returned and stored on-chain."],
                    ["3", "Register on Sui", "A Move smart contract creates an AgentRegistry object on Sui, linking your wallet address to the agent and its first version."],
                    ["4", "Run & Log", "Trigger execution — the backend calls Tatum MCP tools, records outputs, and uploads an execution log back to Walrus."],
                    ["5", "Inspect & Diff", "View full version history, compare JSON configs side-by-side, and inspect execution logs directly from Walrus."],
                  ].map(([num, title, desc]) => (
                    <div key={num} className="flex gap-4">
                      <div className="w-7 h-7 bg-secondary text-white rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">{num}</div>
                      <div>
                        <p className="font-headline-sm text-[15px] text-primary mb-1">{title}</p>
                        <p className="text-on-surface-variant text-[14px] leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {active === "quickstart" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Quick Start</h1>
                <p className="text-on-surface-variant font-body-md">Get your first agent running in under 5 minutes.</p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    step: "Step 1", title: "Connect Your Wallet",
                    desc: "Click Connect Wallet in the top-right corner of the dashboard. ShardSync supports Slush and any Sui-compatible wallet. Your address is used as the agent owner identity.",
                    code: null,
                  },
                  {
                    step: "Step 2", title: "Create an Agent",
                    desc: "Go to Agents → Create New Agent. Fill in the name and description, then define the JSON configuration:",
                    code: `{
  "agent_name": "My Portfolio Monitor",
  "version": "1.0.0",
  "mcp_tools_enabled": ["get_wallet_portfolio"],
  "parameters": {
    "target_chain": "sui-testnet",
    "target_wallet": "0xYourWalletAddress",
    "alert_threshold_usd": 100
  }
}`,
                  },
                  {
                    step: "Step 3", title: "Sign the Transaction",
                    desc: "After submitting, your wallet will prompt you to sign a Sui transaction that registers the agent on-chain. Approve it — the agent is now live.",
                    code: null,
                  },
                  {
                    step: "Step 4", title: "Run the Agent",
                    desc: "Open your agent's detail page and click Run Agent. The backend executes the configured MCP tools via Tatum and stores the output log on Walrus.",
                    code: null,
                  },
                ].map((s) => (
                  <div key={s.step} className="clay-card p-6 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="clay-inset px-3 py-1 rounded-lg font-label-mono text-[11px] text-secondary uppercase tracking-wider">{s.step}</span>
                      <h2 className="font-headline-sm text-[18px] text-primary">{s.title}</h2>
                    </div>
                    <p className="text-on-surface-variant text-[14px] leading-relaxed">{s.desc}</p>
                    {s.code && (
                      <pre className="clay-inset rounded-xl p-4 text-[13px] text-secondary font-mono overflow-x-auto">{s.code}</pre>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === "agents" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Agents</h1>
                <p className="text-on-surface-variant font-body-md">An agent is an autonomous unit with a config, version history, and execution logs — all stored on-chain.</p>
              </div>

              <div className="space-y-6">
                <div className="clay-card p-6 rounded-2xl">
                  <h2 className="font-headline-sm text-[18px] text-primary mb-4">Agent Configuration Schema</h2>
                  <pre className="clay-inset rounded-xl p-4 text-[13px] text-secondary font-mono overflow-x-auto">{`{
  "agent_name": "string",          // Display name
  "version": "string",             // Semantic version e.g. "1.0.0"
  "mcp_tools_enabled": ["string"], // Tatum MCP tools to run
  "parameters": {
    "target_chain": "string",      // e.g. "sui-testnet"
    "target_wallet": "string",     // 0x... Sui address
    "alert_threshold_usd": number  // Optional threshold
  }
}`}</pre>
                </div>

                <div className="clay-card p-6 rounded-2xl">
                  <h2 className="font-headline-sm text-[18px] text-primary mb-4">Supported MCP Tools</h2>
                  <div className="space-y-3">
                    {[
                      ["get_wallet_portfolio", "Returns all coin balances and token holdings for a Sui wallet."],
                      ["get_transaction_history", "Fetches recent transaction blocks for a wallet address on Sui."],
                      ["check_malicious_address", "Runs a Tatum security check on any wallet or contract address."],
                      ["get_exchange_rate", "Fetches the current SUI/USD exchange rate from Tatum Data API."],
                    ].map(([tool, desc]) => (
                      <div key={tool} className="flex gap-4 clay-inset p-4 rounded-xl">
                        <code className="text-secondary font-mono text-[13px] shrink-0">{tool}</code>
                        <p className="text-on-surface-variant text-[14px]">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="clay-card p-6 rounded-2xl">
                  <h2 className="font-headline-sm text-[18px] text-primary mb-3">Forking an Agent</h2>
                  <p className="text-on-surface-variant text-[14px] leading-relaxed">
                    Any agent can be forked into a new independent registry. The fork inherits the parent's latest version config as a starting point. Changes to the fork do not affect the original. Use forks to experiment with different MCP tools or parameters safely.
                  </p>
                </div>
              </div>
            </section>
          )}

          {active === "versions" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Version Control</h1>
                <p className="text-on-surface-variant font-body-md">Every config change creates an immutable on-chain version. Browse history, compare diffs, and roll back.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { icon: "add_circle", title: "Creating a Version", desc: "Open an agent and click New Version. The current active config is pre-filled so you can make targeted edits. On save, the JSON is uploaded to Walrus and a new version object is created on Sui." },
                  { icon: "compare_arrows", title: "Comparing Versions", desc: "Select any two versions in the timeline to see a live JSON diff. Added fields appear in green, removed in red — making it easy to track what changed between runs." },
                  { icon: "history", title: "Version Timeline", desc: "The timeline view shows all versions in chronological order with their Walrus blob IDs, creation timestamps, and execution counts." },
                  { icon: "settings_backup_restore", title: "Rolling Back", desc: "Click any past version and select Set as Active. The agent's current pointer is updated on-chain to that version — future executions use the rolled-back config." },
                ].map((c) => (
                  <div key={c.title} className="clay-inset p-6 rounded-2xl space-y-3">
                    <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary">{c.icon}</span>
                    </div>
                    <h3 className="font-headline-sm text-[16px] text-primary">{c.title}</h3>
                    <p className="text-on-surface-variant text-[14px] leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="clay-card p-6 rounded-2xl border border-secondary/20">
                <h2 className="font-headline-sm text-[18px] text-primary mb-3">How versions are stored</h2>
                <div className="space-y-2 text-[14px] text-on-surface-variant">
                  <p>1. Config JSON → uploaded to <strong className="text-primary">Walrus</strong> → returns a <code className="text-secondary">blobId</code></p>
                  <p>2. <code className="text-secondary">blobId</code> → stored in a <strong className="text-primary">Sui</strong> AgentVersion object on-chain</p>
                  <p>3. AgentRegistry pointer → updated to reference the new version</p>
                  <p>4. Old versions remain immutable and accessible forever via their blob IDs</p>
                </div>
              </div>
            </section>
          )}

          {active === "execution" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Agent Execution</h1>
                <p className="text-on-surface-variant font-body-md">Running an agent triggers real Tatum MCP tool calls and records structured logs on Walrus.</p>
              </div>

              <div className="clay-card p-6 rounded-2xl">
                <h2 className="font-headline-sm text-[18px] text-primary mb-4">Execution Flow</h2>
                <div className="space-y-4">
                  {[
                    ["Fetch Config", "Backend reads the agent's active version object from Sui to get the Walrus blob ID of the current config."],
                    ["Load from Walrus", "Config JSON is fetched from Walrus aggregator and parsed to extract mcp_tools_enabled and parameters."],
                    ["Route to Tatum", "For Sui chains: calls suix_getAllBalances or suix_queryTransactionBlocks via Tatum RPC Gateway. For EVM chains: calls Tatum Data API directly."],
                    ["Build Log", "The tool output is wrapped in a structured execution log with timestamp, tool name, args, result, and success status."],
                    ["Store Log on Walrus", "The execution log JSON is uploaded to Walrus. The returned blob ID is the permanent record of this run."],
                  ].map(([title, desc], i) => (
                    <div key={title} className="flex gap-4">
                      <div className="w-6 h-6 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <p className="font-medium text-primary text-[14px] mb-1">{title}</p>
                        <p className="text-on-surface-variant text-[14px] leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="clay-card p-6 rounded-2xl">
                <h2 className="font-headline-sm text-[18px] text-primary mb-3">Execution Log Structure</h2>
                <pre className="clay-inset rounded-xl p-4 text-[13px] text-secondary font-mono overflow-x-auto">{`{
  "timestamp": "2026-06-04T14:59:08.520Z",
  "versionId": "0x...",
  "mcp_server": "@tatumio/blockchain-mcp",
  "tool_calls": [
    {
      "tool": "get_transaction_history",
      "args": { "address": "0x...", "rpc_method": "suix_queryTransactionBlocks" }
    }
  ],
  "output": { "rpc_method": "...", "data": { ... } },
  "success": true
}`}</pre>
              </div>
            </section>
          )}

          {active === "api" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">API Reference</h1>
                <p className="text-on-surface-variant font-body-md">The ShardSync backend exposes a REST API at <code className="text-secondary">/api</code>.</p>
              </div>

              <div className="space-y-4">
                {[
                  { method: "GET", path: "/api/health", desc: "Health check. Returns server status and network info." },
                  { method: "POST", path: "/api/agents", desc: "Create a new agent. Stores config on Walrus, returns unsigned Sui transaction bytes." },
                  { method: "GET", path: "/api/agents?owner=0x...", desc: "List all agents owned by a wallet address." },
                  { method: "GET", path: "/api/agents/:objectId", desc: "Get full details of a specific agent by its Sui object ID." },
                  { method: "POST", path: "/api/agents/version", desc: "Create a new version for an agent. Uploads config to Walrus, returns Sui tx bytes." },
                  { method: "POST", path: "/api/agents/fork", desc: "Fork an agent into a new registry." },
                  { method: "POST", path: "/api/agents/run", desc: "Execute an agent. Calls Tatum MCP tools, stores log on Walrus." },
                  { method: "GET", path: "/api/blobs/:blobId", desc: "Fetch raw content of any Walrus blob by its ID." },
                  { method: "GET", path: "/api/executions", desc: "List recent execution events across all agents." },
                ].map((e) => (
                  <div key={e.path} className="flex gap-4 clay-inset p-4 rounded-xl items-start">
                    <span className={`font-mono text-[12px] px-2 py-1 rounded-md shrink-0 mt-0.5 ${e.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-secondary/20 text-secondary"}`}>{e.method}</span>
                    <div>
                      <code className="text-primary font-mono text-[13px]">{e.path}</code>
                      <p className="text-on-surface-variant text-[13px] mt-1">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === "tools" && (
            <section className="space-y-10">
              {/* Header */}
              <div>
                <span className="inline-block py-1 px-3 clay-inset text-secondary font-label-mono text-[11px] uppercase tracking-wider mb-3">Tatum Integration</span>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-3">Supported Tools &amp; Chains</h1>
                <p className="text-on-surface-variant font-body-md leading-relaxed max-w-2xl">
                  ShardSync uses <strong className="text-primary">Tatum MCP</strong> (Model Context Protocol) alongside the <strong className="text-primary">Tatum Data API</strong> to give agents real blockchain intelligence.
                  When you run an agent, your natural-language prompt is matched to the best tool using NLP keyword scoring.
                  The tool is first called through the <strong className="text-secondary">MCP server subprocess</strong> (JSON-RPC over stdio) — if that's unavailable, it falls back to the <strong className="text-secondary">Data API in-process</strong>.
                  Every response is logged to Walrus and the log blob ID is committed on-chain.
                </p>
              </div>

              {/* Blockchain Data Tools */}
              <div className="clay-card p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-secondary/15 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-[18px]">dataset</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-[18px] text-primary">Blockchain Data</h2>
                    <span className="font-label-mono text-[11px] text-secondary uppercase tracking-wider">10 tools — via Tatum Data API</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {DATA_TOOLS.map((t) => (
                    <div key={t.name} className="flex gap-4 clay-inset p-3.5 rounded-xl items-start">
                      <code className="text-secondary font-mono text-[12px] shrink-0 mt-0.5 leading-5">{t.name}</code>
                      <p className="text-on-surface-variant text-[13px] leading-relaxed">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RPC Gateway Tools */}
              <div className="clay-card p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-400 text-[18px]">hub</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-[18px] text-primary">RPC Gateway</h2>
                    <span className="font-label-mono text-[11px] text-purple-400 uppercase tracking-wider">3 tools — via Tatum RPC Gateway</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {GATEWAY_TOOLS.map((t) => (
                    <div key={t.name} className="flex gap-4 clay-inset p-3.5 rounded-xl items-start">
                      <code className="text-purple-400 font-mono text-[12px] shrink-0 mt-0.5 leading-5">{t.name}</code>
                      <p className="text-on-surface-variant text-[13px] leading-relaxed">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to enable a tool */}
              <div className="clay-inset p-5 rounded-2xl border border-secondary/20">
                <h3 className="font-headline-sm text-[15px] text-primary mb-2">How to enable tools for your agent</h3>
                <p className="text-on-surface-variant text-[13px] mb-3">Add tool names to <code className="text-secondary">mcp_tools_enabled</code> in your agent config. Then use natural language in the Run Agent modal — the NLP router picks the best match automatically.</p>
                <pre className="bg-black/20 rounded-xl p-4 text-[12px] text-secondary font-mono overflow-x-auto">{`{
  "mcp_tools_enabled": [
    "get_wallet_portfolio",
    "check_malicous_address",
    "get_transaction_history",
    "gateway_get_supported_chains"
  ]
}`}</pre>
              </div>

              {/* Supported chains */}
              <div className="clay-card p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-[18px]">language</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-[18px] text-primary">Supported Blockchains</h2>
                    <span className="font-label-mono text-[11px] text-blue-400 uppercase tracking-wider">{CHAINS.length} networks</span>
                  </div>
                </div>
                <p className="text-on-surface-variant text-[13px]">
                  Set <code className="text-secondary">target_chain</code> in your agent config to any of these. Sui routes through the Tatum JSON-RPC gateway; all others use the Tatum Data API.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {CHAINS.map((c) => (
                    <div key={c} className="clay-inset px-3 py-2.5 rounded-xl flex items-center gap-2">
                      <span className="text-secondary text-[14px] font-mono shrink-0">{CHAIN_ICONS[c] ?? "⬡"}</span>
                      <span className="text-[13px] text-primary font-medium truncate">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {active === "stack" && (
            <section className="space-y-8">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Tech Stack</h1>
                <p className="text-on-surface-variant font-body-md">ShardSync is built on three core protocols working in concert.</p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    icon: "hexagon",
                    name: "Sui Blockchain",
                    role: "Coordination Layer",
                    color: "text-blue-400",
                    bg: "bg-blue-500/10",
                    points: [
                      "AgentRegistry and AgentVersion objects store on-chain metadata",
                      "All agent ownership, version history, and execution events are anchored here",
                      "Move smart contracts guarantee tamper-proof version lineage",
                      "Transactions are signed client-side — no private keys on the backend",
                    ],
                  },
                  {
                    icon: "cloud",
                    name: "Walrus Protocol",
                    role: "Storage Layer",
                    color: "text-secondary",
                    bg: "bg-secondary/10",
                    points: [
                      "All agent configs, execution logs, and memory snapshots are stored as blobs",
                      "Erasure-coded decentralized storage — highly available and censorship-resistant",
                      "Each blob gets a unique content-addressed ID stored on Sui",
                      "Blob data is retrieved directly via the Walrus aggregator API",
                    ],
                  },
                  {
                    icon: "api",
                    name: "Tatum",
                    role: "Blockchain Gateway & MCP",
                    color: "text-purple-400",
                    bg: "bg-purple-500/10",
                    points: [
                      "RPC Gateway: all Sui JSON-RPC calls go through Tatum (sui-testnet.gateway.tatum.io)",
                      "MCP tools: get_wallet_portfolio, get_transaction_history, check_malicious_address, get_exchange_rate",
                      "DataService and TatumApiClient imported in-process — no subprocess spawning",
                      "Supports 130+ blockchain networks for EVM chain agent targets",
                    ],
                  },
                ].map((s) => (
                  <div key={s.name} className="clay-card p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                      </div>
                      <div>
                        <h2 className="font-headline-sm text-[18px] text-primary">{s.name}</h2>
                        <span className={`font-label-mono text-[11px] uppercase tracking-wider ${s.color}`}>{s.role}</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {s.points.map((p) => (
                        <li key={p} className="flex gap-2 text-[14px] text-on-surface-variant">
                          <span className={`${s.color} mt-1 text-[16px] material-symbols-outlined`}>check_circle</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
