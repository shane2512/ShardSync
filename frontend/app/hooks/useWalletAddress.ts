"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";

/**
 * Returns the currently connected wallet address.
 * Falls back to NEXT_PUBLIC_DEFAULT_ADDRESS if no wallet is connected.
 */
export function useWalletAddress(): string {
  const account = useCurrentAccount();
  return account?.address ?? process.env.NEXT_PUBLIC_DEFAULT_ADDRESS ?? "";
}

/**
 * Returns true if a wallet is connected via Slush / dapp-kit.
 */
export function useIsWalletConnected(): boolean {
  const account = useCurrentAccount();
  return !!account;
}
