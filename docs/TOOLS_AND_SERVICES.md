# ShardSync – Tools and Services

---

## 1. Blockchain & Storage

### Sui
- **Purpose:** Smart contracts (Move), object model for agents, versions, and executions.
- **Tools:** Sui CLI, Move compiler / Sui SDK

### Walrus
- **Purpose:** Verifiable blob storage for agent configs, snapshots, and logs.
- **Usage:** Store agent configuration JSON, execution logs, memory snapshots.

---

## 2. Tatum Stack

### Tatum RPC & Data API
- **Purpose:** Transaction submission, chain queries, event/transaction indexing.
- **Usage:** All contract interactions and analytics queries.

### Tatum MCP Server
- **Package:** `@tatumio/blockchain-mcp`
- **Purpose:** MCP tools for querying Tatum APIs and interacting with Sui.

---

## 3. Web & Backend

### Frontend
- **Framework:** Next.js + React + TypeScript
- **UI:** Tailwind CSS
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Responsibilities:** Proxy calls to Tatum, Walrus blob upload/download, agent execution simulation.

---

## 4. MCP Servers

1. **Tatum Blockchain MCP** – `@tatumio/blockchain-mcp`
2. **(Optional) Walrus MCP** – custom or community
3. **(Optional) Generic HTTP / Fetch MCP**

---

## 5. Supporting Services

- **Hosting:** Frontend on Vercel, Backend on Railway/Render.
- **Dev Tools:** GitHub, Antigravity.
