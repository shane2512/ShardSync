# ShardSync – README

> **Git for Autonomous Agents** on Sui × Walrus × Tatum

ShardSync is a versioning and orchestration system for autonomous AI agents built on Sui blockchain. Every agent config and execution log is stored as a verifiable Walrus blob, while Sui objects provide the coordination layer.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                  │
│  Dashboard │ Agents │ Timeline │ Analytics │ Create  │
└──────────────┬───────────────────────────────────────┘
               │ REST API
┌──────────────▼───────────────────────────────────────┐
│              Backend (Express + TypeScript)           │
│  Routes → Tatum Service (RPC) + Walrus Service (HTTP)│
└──────────────┬────────────────────┬──────────────────┘
               │                    │
    ┌──────────▼──────┐   ┌────────▼────────┐
    │   Tatum Gateway │   │ Walrus Testnet  │
    │  (Sui RPC Proxy) │   │ (Blob Storage)  │
    └──────────┬──────┘   └─────────────────┘
               │
    ┌──────────▼──────┐
    │  Sui Testnet    │
    │  agent_registry │
    └─────────────────┘
```

## Deployed Contract

| Field | Value |
|-------|-------|
| **Package** | `0x17104a3b9595ee7514a188628bf556a4fe7d39de242ff9b869129ab4e9531177` |
| **Module** | `agent_registry` |
| **Network** | Sui Testnet |

## Quick Start

### Prerequisites
- Node.js v18+
- Sui CLI (via `suiup`)
- Tatum API key ([dashboard.tatum.io](https://dashboard.tatum.io))

### 1. Backend
```bash
cd backend
cp .env.example .env  # Fill in TATUM_API_KEY
npm install
npm run dev           # Starts on :4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # Starts on :3000
```

### 3. Smart Contract
```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Chain** | Sui Move | Agent registry, versions, executions |
| **Storage** | Walrus | Immutable config + log blobs |
| **RPC** | Tatum | Sui gateway, event indexing, MCP |
| **Backend** | Express/TS | API proxy, transaction prep |
| **Frontend** | Next.js/React | Dashboard, analytics, diff view |
| **MCP** | `@tatumio/blockchain-mcp` | AI agent chain insights |

## MCP Integration

ShardSync includes Tatum MCP server configuration for AI-powered chain insights:

```json
{
  "mcpServers": {
    "tatumio": {
      "command": "npx",
      "args": ["@tatumio/blockchain-mcp"],
      "env": { "TATUM_API_KEY": "YOUR_KEY" }
    }
  }
}
```

Available tools: `get_wallet_portfolio`, `get_transaction_history`, `get_tokens`, `check_malicous_address`, and more.

## License

MIT
