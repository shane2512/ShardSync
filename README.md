<div align="center">

<img src="https://img.shields.io/badge/Sui-Testnet%20%26%20Mainnet-4DA2FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNS0xMC01LTEwIDV6TTIgMTJsMTAgNSAxMC01LTEwLTUtMTAgNXoiLz48L3N2Zz4=&logoColor=white" alt="Sui Testnet & Mainnet" />
<img src="https://img.shields.io/badge/Walrus-Decentralized_Storage-8B5CF6?style=for-the-badge" alt="Walrus" />
<img src="https://img.shields.io/badge/Tatum-MCP_Gateway-F59E0B?style=for-the-badge" alt="Tatum" />
<img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="MIT License" />

<br /><br />

<h1>⬡ ShardSync</h1>

<p><strong>Version Control for Autonomous AI Agents — on Sui × Walrus × Tatum</strong></p>

<p>
  ShardSync brings the developer experience of version control to autonomous on-chain AI agents.
  Every agent config, execution log, and memory snapshot is stored as a cryptographically verifiable
  blob on Walrus, indexed on Sui, and queried through the Tatum RPC gateway.
</p>

<p>
  <a href="https://shardsync.vercel.app"><strong> Live Demo</strong></a> ·
  <a href="https://shardsync.vercel.app/docs"><strong>Documentation</strong></a> ·
  <a href="https://github.com/shane2512/ShardSync/issues">Report Bug</a> ·
  <a href="https://github.com/shane2512/ShardSync/issues">Request Feature</a>
</p>

</div>

---

## Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Deployed Contracts](#-deployed-contracts)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
- [Agent Configuration](#-agent-configuration)
- [MCP Integration](#-mcp-integration)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

##  About the Project

Autonomous AI agents are increasingly used for on-chain operations — managing portfolios, monitoring wallets, executing trades, and interacting with DeFi protocols. But their behavior is **opaque and hard to debug**.

There is no standard way to:
- Version an agent's configuration and logic
- Inspect what it did across multiple executions
- Fork an agent to test changes safely
- Roll back to a known-good state with cryptographic proof

**ShardSync solves this.** It models agents as Sui-native objects with a full version history backed by Walrus decentralized storage. Every config change creates an immutable snapshot. Every execution generates a verifiable log.

> Think of it as **GitHub for your AI agents** — but fully on-chain, with cryptographic guarantees.

---

##  Key Features

| Feature | Description |
|---|---|
|  **Version History** | Every config change creates an on-chain version. Browse, compare, and restore any snapshot. |
|  **Agent Forking** | Clone any agent into a new independent registry. Experiment safely without affecting the original. |
|  **Real Execution** | Trigger live Tatum MCP tool calls (`suix_getAllBalances`, `suix_queryTransactionBlocks`, etc.) with real chain data. |
|  **Diff Viewer** | Side-by-side JSON comparison of any two versions with color-coded additions and removals. |
|  **Cryptographic Storage** | All blobs stored on Walrus with content-addressed IDs — tamper-evident by design. |
|  **On-chain Logs** | Execution outputs uploaded to Walrus; log blob IDs anchored on Sui for permanent audit trails. |
|  **Dashboard** | Full-featured Next.js dashboard: create, inspect, fork, run, and diff agents visually. |

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
│   Landing │ Agents │ Agent Detail │ Analytics │ Docs         │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API (NEXT_PUBLIC_API_URL)
┌───────────────────────────▼─────────────────────────────────┐
│              Backend (Express + TypeScript)                  │
│                                                             │
│  /api/agents  →  Tatum RPC + Walrus + Sui tx builder        │
│  /api/agents/run  →  Tatum MCP Tools (in-process)           │
│  /api/blobs/:id  →  Walrus Aggregator proxy                 │
└──────────┬────────────────────────────────┬─────────────────┘
           │ ?network=testnet|mainnet        │
┌──────────▼──────────┐          ┌──────────▼──────────────────┐
│   Tatum RPC Gateway │          │  Walrus Storage             │
│                     │          │                             │
│ Testnet:            │          │ Testnet:                    │
│  sui-testnet.       │          │  publisher.walrus-testnet   │
│  gateway.tatum.io   │          │  .walrus.space              │
│                     │          │                             │
│ Mainnet:            │          │ Mainnet:                    │
│  sui-mainnet.       │          │  walrus-mainnet-publisher-1 │
│  gateway.tatum.io   │          │  .staketab.org (community)  │
│                     │          │  aggregator.walrus-mainnet  │
│ Sui JSON-RPC        │          │  .walrus.space              │
│ MCP Data API        │          │  Blob PUT / GET             │
└──────────┬──────────┘          └─────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│   Sui Network (network-aware)                   │
│                                                 │
│ Testnet Package:                                │
│  0x17104a3b...9531177                           │
│                                                 │
│ Mainnet Package:                                │
│  0x64bea627...c604d4                            │
│                                                 │
│  AgentRegistry obj · AgentVersion obj           │
│  ExecutionEvent · on-chain logs                 │
└─────────────────────────────────────────────────┘
```

---

##  Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Blockchain** | Sui Move | Testnet | Agent registry, version objects, execution events |
| **Storage** | Walrus Protocol | Testnet | Immutable config blobs, execution log storage |
| **RPC / MCP** | Tatum | v4 | Sui JSON-RPC gateway, blockchain MCP tools |
| **Backend** | Express + TypeScript | 4.x / 5.x | REST API, Walrus proxy, tx building |
| **Frontend** | Next.js + React | 16 / 19 | Dashboard, analytics, diff viewer |
| **Wallet** | Mysten dApp Kit | 1.x | Sui wallet connection (Slush, etc.) |
| **MCP Package** | `@tatumio/blockchain-mcp` | 1.0.5 | In-process Tatum Data & RPC tool execution |

---

##  Deployed Contracts

ShardSync is live on both **Sui Testnet** and **Sui Mainnet**. The same Move module (`agent_registry`) is deployed to both networks with independent package IDs.

### 🟢 Testnet (default)

| Field | Value |
|---|---|
| **Package ID** | `0x17104a3b9595ee7514a188628bf556a4fe7d39de242ff9b869129ab4e9531177` |
| **Module** | `agent_registry` |
| **Network** | Sui Testnet |
| **Tatum RPC** | `https://sui-testnet.gateway.tatum.io/` |
| **Walrus Publisher** | `https://publisher.walrus-testnet.walrus.space` |
| **Walrus Aggregator** | `https://aggregator.walrus-testnet.walrus.space` |
| **Explorer** | [View on SuiVision Testnet](https://testnet.suivision.xyz/package/0x17104a3b9595ee7514a188628bf556a4fe7d39de242ff9b869129ab4e9531177) |

### 🔴 Mainnet (live)

| Field | Value |
|---|---|
| **Package ID** | `0x64bea6270d379cb1e9e75bab769fa671d2421f072572f82e807dee6e94c604d4` |
| **Module** | `agent_registry` |
| **Network** | Sui Mainnet |
| **Tatum RPC** | `https://sui-mainnet.gateway.tatum.io/` |
| **Walrus Publisher** | `https://walrus-mainnet-publisher-1.staketab.org` *(community-run, intermittent)* |
| **Walrus Aggregator** | `https://aggregator.walrus-mainnet.walrus.space` |
| **Explorer** | [View on SuiVision Mainnet](https://suivision.xyz/package/0x64bea6270d379cb1e9e75bab769fa671d2421f072572f82e807dee6e94c604d4) |

> **⚠️ Mainnet write operations** (create agent, new version, run agent) require a funded Walrus Mainnet publisher.
> The community publisher is intermittently available. For production, deploy your own or use [Nami Cloud](https://nami.cloud).
> **Read operations** (list agents, analytics, timeline) work on Mainnet without any restrictions.

---

##  Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9+
- **Sui CLI** — install via [suiup](https://docs.sui.io/guides/developer/getting-started/sui-install)
- **Tatum API Key** — free at [dashboard.tatum.io](https://dashboard.tatum.io)
- A **Sui Testnet wallet** with some test SUI ([faucet](https://faucet.sui.io))

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/shane2512/ShardSync.git
cd ShardSync
```

#### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
TATUM_API_KEY=your_tatum_api_key_here

# ── Testnet ───────────────────────────────────────────────────────────
TATUM_SUI_RPC_URL=https://sui-testnet.gateway.tatum.io/
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
SHARDSYNC_PACKAGE_ID=0x17104a3b9595ee7514a188628bf556a4fe7d39de242ff9b869129ab4e9531177

# ── Mainnet ───────────────────────────────────────────────────────────
TATUM_SUI_MAINNET_RPC_URL=https://sui-mainnet.gateway.tatum.io/
WALRUS_MAINNET_PUBLISHER_URL=https://walrus-mainnet-publisher-1.staketab.org
WALRUS_MAINNET_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space
SHARDSYNC_MAINNET_PACKAGE_ID=0x64bea6270d379cb1e9e75bab769fa671d2421f072572f82e807dee6e94c604d4

# ── Shared ────────────────────────────────────────────────────────────
SUI_NETWORK=testnet
PORT=4000
```

```bash
npm install
npm run dev       # http://localhost:4000
```

#### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_PACKAGE_ID=0x17104a3b9595ee7514a188628bf556a4fe7d39de242ff9b869129ab4e9531177
NEXT_PUBLIC_MAINNET_PACKAGE_ID=0x64bea6270d379cb1e9e75bab769fa671d2421f072572f82e807dee6e94c604d4
```

```bash
npm install
npm run dev       # http://localhost:3000
```

#### 4. Smart Contracts (optional — already deployed)

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

---

##  Agent Configuration

When creating or updating an agent, you provide a JSON config blob:

```json
{
  "agent_name": "Portfolio Monitor",
  "version": "1.0.0",
  "mcp_tools_enabled": ["get_wallet_portfolio"],
  "parameters": {
    "target_chain": "sui-testnet",
    "target_wallet": "0xYourSuiWalletAddress",
    "alert_threshold_usd": 100
  }
}
```

### Supported MCP Tools

| Tool | Chain Support | Description |
|---|---|---|
| `get_wallet_portfolio` | Sui (via `suix_getAllBalances`) | All coin balances and token holdings |
| `get_transaction_history` | Sui (via `suix_queryTransactionBlocks`) | Recent transactions for a wallet |
| `check_malicious_address` | Cross-chain | Tatum security check on any address |
| `get_exchange_rate` | Cross-chain | SUI/USD or any crypto/fiat rate |

> **Note:** For Sui chains, tools are routed to the Tatum JSON-RPC Gateway (`sui-testnet.gateway.tatum.io`). For EVM chains, the Tatum Data API (`api.tatum.io/v4/data/`) is used directly.

---

##  MCP Integration

ShardSync uses `@tatumio/blockchain-mcp` **in-process** (not as a subprocess). The `DataService` and `TatumApiClient` classes are imported directly, making the integration cloud-native and deployment-safe.

The `.mcp.json` at the repo root enables MCP tool access in compatible editors (Cursor, VS Code with MCP extension):

```json
{
  "mcpServers": {
    "tatumio": {
      "command": "npx",
      "args": ["@tatumio/blockchain-mcp"],
      "env": {
        "TATUM_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

---

##  API Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/agents` | Create a new agent (returns unsigned Sui tx) |
| `GET` | `/agents?owner=0x...` | List agents by owner address |
| `GET` | `/agents/:objectId` | Get agent detail by Sui object ID |
| `POST` | `/agents/version` | Create a new version (upload config to Walrus) |
| `POST` | `/agents/fork` | Fork an agent into a new registry |
| `POST` | `/agents/run` | Execute agent with real Tatum MCP tools |
| `GET` | `/blobs/:blobId` | Fetch raw Walrus blob content |
| `GET` | `/executions` | List recent execution events |
| `GET` | `/versions?owner=0x...` | List all version objects by owner |

---

##  Deployment

ShardSync is deployed using two free services:

| Service | Used For | URL |
|---|---|---|
| **Vercel** | Next.js Frontend | [shardsync.vercel.app](https://shardsync.vercel.app) |
| **Render** | Express Backend | [shardsync.onrender.com](https://shardsync.onrender.com) |

### Deploy Your Own

**Backend → Render**
1. Connect your GitHub repo at [render.com](https://render.com)
2. Set Root Directory: `backend`
3. Build: `npm install --include=dev && npm run build`
4. Start: `npm start`
5. Add env vars: `TATUM_API_KEY`, `SHARDSYNC_PACKAGE_ID`, `FRONTEND_URL`

**Frontend → Vercel**
1. Import repo at [vercel.com](https://vercel.com)
2. Set Root Directory: `frontend`
3. Add env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PACKAGE_ID`

---

##  Project Structure

```
ShardSync/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/env.ts       # Zod-validated environment config
│   │   ├── routes/agents.ts    # All agent CRUD + run endpoints
│   │   ├── services/
│   │   │   ├── tatum.ts        # Sui RPC + helper functions
│   │   │   ├── walrus.ts       # Walrus blob store/read
│   │   │   └── mcpClient.ts    # In-process Tatum MCP tool executor
│   │   └── index.ts            # Express app entry point
│   └── package.json
│
├── frontend/                   # Next.js 16 dashboard
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── agents/             # Agent list + detail + create
│   │   ├── analytics/          # Execution analytics charts
│   │   ├── docs/               # Product documentation
│   │   ├── components/         # Navbar, Footer, WalletProviders
│   │   ├── hooks/              # useWalletAddress, etc.
│   │   └── lib/api.ts          # Backend API client
│   └── package.json
│
├── contracts/                  # Sui Move smart contracts
│   ├── sources/
│   │   └── agent_registry.move # AgentRegistry + version objects
│   └── Move.toml
│
├── docs/                       # Project specification documents
├── render.yaml                 # Render deployment config
└── README.md
```

---

##  Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please keep commits conventional (`feat:`, `fix:`, `docs:`, `refactor:`).

---

##  License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">
  <p>Built with ❤️ on <strong>Sui</strong> · <strong>Walrus</strong> · <strong>Tatum</strong></p>
  <p>
    <a href="https://sui.io">Sui</a> ·
    <a href="https://walrus.xyz">Walrus</a> ·
    <a href="https://tatum.io">Tatum</a>
  </p>
</div>
