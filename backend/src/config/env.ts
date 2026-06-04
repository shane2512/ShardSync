import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  TATUM_API_KEY: z.string().min(1, "TATUM_API_KEY is required"),
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
  SUI_NETWORK: z.enum(["testnet", "devnet"]).default("testnet"),
  SHARDSYNC_PACKAGE_ID: z.string().default("0x0"),
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
