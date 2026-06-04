# Changelog

## [0.1.0] – Phase 1 Scaffold

### Added
- **Contracts**: `agent_registry.move` with `AgentRegistry`, `AgentVersion`, `AgentExecution` structs and `create_agent`, `create_version`, `fork_agent`, `log_execution` entrypoints.
- **Backend**: Express API with Tatum RPC service, Walrus blob service, and agent CRUD + execution endpoints.
- **Frontend**: Next.js dashboard with agent list, agent detail, create agent form, and execution timeline views.
- **Docs**: Requirements, development phases, tools & services, and rules docs.
