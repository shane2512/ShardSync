# ShardSync – Project Rules and Conventions

---

## 1. Architectural Rules

1. **Walrus is mandatory for agent data.** All configs, logs, and snapshots as Walrus blobs.
2. **Tatum is the canonical chain access layer.** All Sui RPC calls through Tatum.
3. **Sui objects represent coordination, not heavy data.** On-chain objects link to Walrus blobs.

---

## 2. Development Rules

1. **No private keys on backend.** Transactions signed client-side.
2. **TypeScript everywhere (except Move).**
3. **Clear separation:** `contracts/` for Move, `backend/` for Node/TS, `frontend/` for React/Next.
4. **Minimal coupling to specific UIs.** Backend exposes REST/JSON APIs.

---

## 3. Data & Security Rules

1. **Never store secrets in Git.** Use `.env`.
2. **Validate JSON configs** before saving to Walrus.
3. **Respect Walrus guarantees.** Don't assume immediate availability.
4. **Limit external calls in demo agent.**

---

## 4. Coding & Documentation Rules

1. Keep functions small and composable.
2. Write minimal comments where intent is non-obvious.
3. Update docs when interfaces change.
4. All major changes require `CHANGELOG.md` entry.

---

## 5. MCP Usage Rules

1. Tools must clearly state purpose, inputs, outputs, limitations.
2. Restrict to Sui testnet/devnet.
3. Confirm parameters before automation writes to chain or Walrus.

---
