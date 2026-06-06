import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  TATUM_API_KEY: z.string().min(1, "TATUM_API_KEY is required"),
  // Testnet (defaults)
  TATUM_SUI_RPC_URL: z
    .string()
    .url()
    .default("https://sui-testnet.gateway.tatum.io/"),
  WALRUS_PUBLISHER_URL: z
    .string()
    .url()
    .default("https://publisher.walrus-testnet.walrus.space"),
  WALRUS_AGGREGATOR_URL: z
    .string()
    .url()
    .default("https://aggregator.walrus-testnet.walrus.space"),
  // Mainnet
  TATUM_SUI_MAINNET_RPC_URL: z
    .string()
    .url()
    .default("https://sui-mainnet.gateway.tatum.io/"),
  WALRUS_MAINNET_PUBLISHER_URL: z
    .string()
    .url()
    .default("https://walrus-mainnet-publisher-1.staketab.org"),
  WALRUS_MAINNET_AGGREGATOR_URL: z
    .string()
    .url()
    .default("https://aggregator.walrus-mainnet.walrus.space"),
  // Shared
  SUI_NETWORK: z.enum(["testnet", "mainnet", "devnet"]).default("testnet"),
  SHARDSYNC_PACKAGE_ID: z.string().default("0x0"),
  SHARDSYNC_MAINNET_PACKAGE_ID: z.string().default("0x0"),
  PORT: z.coerce.number().default(4000),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid environment variables:");
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}

export type NetworkId = "testnet" | "mainnet";

/** Returns all network-specific config for a given network ID. */
export function getNetworkConfig(network: NetworkId = "testnet") {
  const env = getEnv();
  if (network === "mainnet") {
    return {
      rpcUrl: env.TATUM_SUI_MAINNET_RPC_URL,
      walrusPublisher: env.WALRUS_MAINNET_PUBLISHER_URL,
      walrusAggregator: env.WALRUS_MAINNET_AGGREGATOR_URL,
      packageId: env.SHARDSYNC_MAINNET_PACKAGE_ID,
      network: "mainnet" as const,
    };
  }
  return {
    rpcUrl: env.TATUM_SUI_RPC_URL,
    walrusPublisher: env.WALRUS_PUBLISHER_URL,
    walrusAggregator: env.WALRUS_AGGREGATOR_URL,
    packageId: env.SHARDSYNC_PACKAGE_ID,
    network: "testnet" as const,
  };
}

/** Parse ?network= query param (any Express query type), default to testnet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseNetwork(raw: any): NetworkId {
  const val: unknown = Array.isArray(raw) ? raw[0] : raw;
  return val === "mainnet" ? "mainnet" : "testnet";
}
