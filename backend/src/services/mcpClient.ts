import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { getEnv } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface McpCallResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

/**
 * Programmatically spawns the Tatum MCP server subprocess, executes the protocol handshake,
 * invokes the specified tool with arguments, and retrieves the output.
 */
export async function callTatumMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  const env = getEnv();
  
  return new Promise((resolve) => {
    // Resolve the absolute path to the local @tatumio/blockchain-mcp package cli.js
    const mcpPath = path.resolve(__dirname, "../../node_modules/@tatumio/blockchain-mcp/dist/cli.js");
    console.log(`[MCP Client] Spawning node with "${mcpPath}" to call "${toolName}" with args:`, args);

    // Spawn the Tatum MCP server directly via Node.js (no shell layer required)
    const mcpProcess = spawn("node", [mcpPath], {
      env: {
        ...process.env,
        TATUM_API_KEY: env.TATUM_API_KEY,
      },
    });

    let stdoutBuffer = "";
    let isInitialized = false;
    let resolved = false;

    const cleanup = () => {
      if (!mcpProcess.killed) {
        mcpProcess.kill();
      }
    };

    // 15 seconds timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          error: `Tatum MCP tool call timed out after 15 seconds.`,
        });
      }
    }, 15000);

    mcpProcess.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const message = JSON.parse(trimmed);

          // Phase A: Handshake Response
          if (message.id === 1 && !isInitialized) {
            isInitialized = true;
            
            // Send notifications/initialized as required by the MCP protocol
            mcpProcess.stdin.write(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "notifications/initialized",
              }) + "\n"
            );

            // Execute the target tool call
            mcpProcess.stdin.write(
              JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                  name: toolName,
                  arguments: args,
                },
              }) + "\n"
            );
          } 
          // Phase B: Tool Output Response
          else if (message.id === 2) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              cleanup();
              
              if (message.error) {
                resolve({
                  success: false,
                  error: message.error.message || JSON.stringify(message.error),
                });
              } else {
                resolve({
                  success: true,
                  output: message.result,
                });
              }
            }
          }
        } catch {
          // Ignore any non-JSON startup/npm printouts from stdout
        }
      }
    });

    mcpProcess.stderr.on("data", (data) => {
      const errStr = data.toString().trim();
      if (errStr) {
        console.warn(`[MCP Server stderr]: ${errStr}`);
      }
    });

    mcpProcess.on("error", (err) => {
      console.error("[MCP Client Process Error]:", err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve({
          success: false,
          error: `MCP Process Spawn Error: ${err.message}`,
        });
      }
    });

    mcpProcess.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `MCP process exited with code ${code} before response.`,
        });
      }
    });

    // Write the initialize handshake request to the MCP server
    mcpProcess.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "shardsync-client",
            version: "1.0.0",
          },
        },
      }) + "\n"
    );
  });
}
