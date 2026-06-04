# ShardSync – Requirements

## 1. Problem Statement

Autonomous AI agents are increasingly used for on-chain operations, but their behavior is opaque and hard to debug.  
There is no standard way to version, inspect, fork, and roll back agents and their evolving "brains" (config + memory + logs) with cryptographic guarantees on storage and history.

ShardSync solves this by treating each agent as a **versioned repository** backed by Walrus blobs, coordinated by Sui objects, and indexed/orchestrated using Tatum infrastructure.

---

## 2. Core Objectives

- Model agents as **Sui-native objects** with version history.
- Store agent configuration, memory snapshots, and execution logs as **Walrus blobs** with verifiable availability.
- Use **Tatum** for:
  - Sui RPC transaction submission.
  - Event/transaction indexing for timelines and analytics.
  - (Optional) MCP integration to assist configuration and development.
- Provide a **dashboard** to:
  - Create/update/fork agents.
  - Visualize execution timelines.
  - Inspect logs from Walrus.
  - Compare versions (diff view).

---

## 3. Functional Requirements

### 3.1 Agent Lifecycle

- Create a new agent:
  - User provides basic metadata and a JSON config.
  - Backend uploads config to Walrus and obtains blob ID + proof.
  - Smart contract creates `AgentRegistry` entry and initial `AgentVersion` object referencing the Walrus blob.
- Update agent (new version):
  - User edits config via UI.
  - Backend uploads new config to Walrus.
  - Contract creates a new `AgentVersion` linked to the previous one.
- Fork agent:
  - Create a new `AgentRegistry` entry whose first version references an existing `AgentVersion` as `parent_version`.

### 3.2 Agent Execution

- Trigger a "Run Agent" action from the UI.
- Backend simulates an execution:
  - Calls a simple external API or deterministic function.
  - Produces a structured execution log (input, output, timestamps, success flag).
  - Uploads log to Walrus and records blob ID.
  - Calls Sui via Tatum to emit an `AgentExecution` event/object referencing:
    - `AgentVersion`
    - Walrus log blob ID
    - Basic metrics (duration, success).

### 3.3 Timeline & Analytics

- UI shows executions per agent over time (timeline).
- User can:
  - Filter by version, time window, and status.
  - See aggregate stats (counts, success rate, avg duration).
- Data is sourced from Tatum's indexed Sui events and transactions.

### 3.4 Version Diff & Inspection

- UI shows a list of versions for an agent.
- User can select two versions and see a JSON diff of their configs.
- User can click into a version and:
  - Open Walrus-stored config JSON.
  - View related execution logs (via Walrus).

---

## 4. Non-Functional Requirements

- **Network:** Sui testnet/devnet only.
- **Performance:** Timeline should load within a few seconds for a test account (tens–hundreds of events).
- **Security:** 
  - No private keys in backend.
  - All chain transactions signed client-side or via secure wallet flows.
- **Reliability:**
  - Handle Walrus unavailability gracefully (e.g., display "blob not yet certified").
- **Documentation & Demo:**
  - Clear setup instructions for running the stack.
  - 2–3 minute demo script + screens.
  - Brief section linking to Walrus and Tatum MCP docs for deeper integration references.

---

## 5. External Dependencies

- Walrus protocol for decentralized verifiable data.
- Walrus JS/Quilt client or HTTP API to publisher/aggregator for blob operations.
- Tatum Sui RPC/Data API and MCP server tooling.
- Sui Move toolchain and Sui devnet/testnet.
