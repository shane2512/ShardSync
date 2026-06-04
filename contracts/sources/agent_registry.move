/// ShardSync – AgentRegistry
/// Manages the lifecycle of autonomous agents: creation, versioning, forking, and execution logging.
/// On-chain objects store metadata only; heavy data lives in Walrus blobs.
module shardsync::agent_registry;

use std::string::String;
use sui::event;
use sui::clock::Clock;

// ─── Data Structures ──────────────────────────────────────────────────

/// Global registry entry for a single agent. Owned by the creator.
public struct AgentRegistry has key, store {
    id: UID,
    name: String,
    description: String,
    owner: address,
    latest_version_id: Option<ID>,
    version_count: u64,
    created_at: u64,
    updated_at: u64,
}

/// A specific version of an agent's configuration.
/// Points to a Walrus blob containing the full JSON config.
public struct AgentVersion has key, store {
    id: UID,
    agent_id: ID,
    version_number: u64,
    parent_version_id: Option<ID>,
    walrus_config_blob_id: String,
    walrus_snapshot_blob_id: Option<String>,
    commit_message: String,
    created_at: u64,
}

/// A record of a single agent execution.
/// Links an AgentVersion to the Walrus blob storing its execution log.
public struct AgentExecution has key, store {
    id: UID,
    agent_id: ID,
    version_id: ID,
    walrus_log_blob_id: String,
    duration_ms: u64,
    success: bool,
    created_at: u64,
}

// ─── Events ───────────────────────────────────────────────────────────

public struct AgentCreated has copy, drop {
    agent_id: ID,
    name: String,
    owner: address,
}

public struct VersionCreated has copy, drop {
    version_id: ID,
    agent_id: ID,
    version_number: u64,
    walrus_config_blob_id: String,
}

public struct ExecutionLogged has copy, drop {
    execution_id: ID,
    agent_id: ID,
    version_id: ID,
    walrus_log_blob_id: String,
    success: bool,
}

public struct AgentForked has copy, drop {
    new_agent_id: ID,
    source_version_id: ID,
    owner: address,
}

// ─── Entrypoints ──────────────────────────────────────────────────────

/// Create a new agent with its first version.
/// The caller provides metadata + the Walrus blob ID for the initial config.
entry fun create_agent(
    name: String,
    description: String,
    walrus_config_blob_id: String,
    commit_message: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    let sender = ctx.sender();

    // Create the registry object
    let mut registry = AgentRegistry {
        id: object::new(ctx),
        name,
        description,
        owner: sender,
        latest_version_id: option::none(),
        version_count: 0,
        created_at: now,
        updated_at: now,
    };

    let agent_id = object::id(&registry);

    // Create the first version
    let version = AgentVersion {
        id: object::new(ctx),
        agent_id,
        version_number: 1,
        parent_version_id: option::none(),
        walrus_config_blob_id,
        walrus_snapshot_blob_id: option::none(),
        commit_message,
        created_at: now,
    };

    let version_id = object::id(&version);

    // Link version to registry
    registry.latest_version_id = option::some(version_id);
    registry.version_count = 1;

    // Emit events
    event::emit(AgentCreated {
        agent_id,
        name: registry.name,
        owner: sender,
    });

    event::emit(VersionCreated {
        version_id,
        agent_id,
        version_number: 1,
        walrus_config_blob_id: version.walrus_config_blob_id,
    });

    // Transfer objects to the sender
    transfer::transfer(registry, sender);
    transfer::transfer(version, sender);
}

/// Create a new version for an existing agent.
/// The caller passes the current AgentRegistry (which they own) and the new blob ID.
entry fun create_version(
    registry: &mut AgentRegistry,
    walrus_config_blob_id: String,
    commit_message: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    let agent_id = object::id(registry);
    let new_version_number = registry.version_count + 1;

    let version = AgentVersion {
        id: object::new(ctx),
        agent_id,
        version_number: new_version_number,
        parent_version_id: registry.latest_version_id,
        walrus_config_blob_id,
        walrus_snapshot_blob_id: option::none(),
        commit_message,
        created_at: now,
    };

    let version_id = object::id(&version);

    // Update registry
    registry.latest_version_id = option::some(version_id);
    registry.version_count = new_version_number;
    registry.updated_at = now;

    event::emit(VersionCreated {
        version_id,
        agent_id,
        version_number: new_version_number,
        walrus_config_blob_id: version.walrus_config_blob_id,
    });

    transfer::transfer(version, ctx.sender());
}

/// Fork an existing agent by creating a new AgentRegistry whose first version
/// references the source version as its parent.
entry fun fork_agent(
    source_version: &AgentVersion,
    name: String,
    description: String,
    walrus_config_blob_id: String,
    commit_message: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    let sender = ctx.sender();
    let source_version_id = object::id(source_version);

    let mut registry = AgentRegistry {
        id: object::new(ctx),
        name,
        description,
        owner: sender,
        latest_version_id: option::none(),
        version_count: 0,
        created_at: now,
        updated_at: now,
    };

    let new_agent_id = object::id(&registry);

    let version = AgentVersion {
        id: object::new(ctx),
        agent_id: new_agent_id,
        version_number: 1,
        parent_version_id: option::some(source_version_id),
        walrus_config_blob_id,
        walrus_snapshot_blob_id: option::none(),
        commit_message,
        created_at: now,
    };

    let version_id = object::id(&version);
    registry.latest_version_id = option::some(version_id);
    registry.version_count = 1;

    event::emit(AgentForked {
        new_agent_id,
        source_version_id,
        owner: sender,
    });

    event::emit(VersionCreated {
        version_id,
        agent_id: new_agent_id,
        version_number: 1,
        walrus_config_blob_id: version.walrus_config_blob_id,
    });

    transfer::transfer(registry, sender);
    transfer::transfer(version, sender);
}

/// Log an agent execution. Called after the backend runs the agent and uploads
/// the execution log to Walrus.
entry fun log_execution(
    registry: &AgentRegistry,
    version: &AgentVersion,
    walrus_log_blob_id: String,
    duration_ms: u64,
    success: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    let agent_id = object::id(registry);
    let version_id = object::id(version);

    let execution = AgentExecution {
        id: object::new(ctx),
        agent_id,
        version_id,
        walrus_log_blob_id,
        duration_ms,
        success,
        created_at: now,
    };

    let execution_id = object::id(&execution);

    event::emit(ExecutionLogged {
        execution_id,
        agent_id,
        version_id,
        walrus_log_blob_id: execution.walrus_log_blob_id,
        success,
    });

    transfer::transfer(execution, ctx.sender());
}

// ─── View Accessors ───────────────────────────────────────────────────

public fun agent_name(registry: &AgentRegistry): &String { &registry.name }
public fun agent_owner(registry: &AgentRegistry): address { registry.owner }
public fun agent_version_count(registry: &AgentRegistry): u64 { registry.version_count }
public fun version_blob_id(version: &AgentVersion): &String { &version.walrus_config_blob_id }
public fun version_number(version: &AgentVersion): u64 { version.version_number }
public fun execution_success(exec: &AgentExecution): bool { exec.success }
public fun execution_duration(exec: &AgentExecution): u64 { exec.duration_ms }
