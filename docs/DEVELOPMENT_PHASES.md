# ShardSync – Phase-by-Phase Development Plan

This document outlines a 3-day build plan aligned with hackathon constraints.

---

## Phase 0 – Environment & References (Pre-Dev)

**Goals**
- Set up core tools.
- Review relevant docs and MCP server interfaces.

**Tasks**
1. Install and configure:
   - Sui CLI and Move toolchain.
   - Node.js + pnpm/npm.
   - Walrus client / access to a Walrus publisher + aggregator.
   - Tatum API key and SDKs.
2. Read key docs:
   - Walrus docs (focus: integration with Sui, storage resources, blobs).
   - Walrus GitHub repo for examples and client code.
   - Tatum Data API & RPC docs.
   - Tatum MCP server / `@tatumio/blockchain-mcp` README.

---

## Phase 1 – Smart Contracts + Basic Backend

**Deliverables**
- Deployed Move package on Sui testnet/devnet.
- Backend endpoints for:
  - Creating/updating agents.
  - Writing/reading Walrus blobs.
  - Emitting execution events.

**Tasks**
1. Design Move data structures:
   - `AgentRegistry` (global or per-owner object).
   - `AgentVersion` objects.
   - `AgentExecution` event/object.
2. Implement creation, update, and fork entrypoints.
3. Implement execution logging entrypoint emitting `AgentExecution`.
4. Deploy to Sui testnet/devnet.
5. Backend:
   - Node/TS service with Walrus integration.
   - Tatum integration for Sui RPC calls.
   - Test end-to-end flows via scripts/Postman.

---

## Phase 2 – Frontend + Timeline & Diff

**Deliverables**
- React/Next.js dashboard.

**Tasks**
1. Build basic UI: Agent list, detail view, create/edit forms.
2. Integrate with backend endpoints.
3. Timeline view using Tatum Data API.
4. Version diff (client-side JSON diff).

---

## Phase 3 – Analytics, Polish, and Demo Prep

**Deliverables**
- Polished UI/UX, analytics charts, demo script.

**Tasks**
1. Add charts (Recharts/Chart.js).
2. UX polish.
3. Optional MCP integration.
4. Write final docs.
5. Script demo scenario.

---
