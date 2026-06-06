"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type SuiNetwork = "testnet" | "mainnet";

interface NetworkContextValue {
  network: SuiNetwork;
  setNetwork: (n: SuiNetwork) => void;
  rpcUrl: string;
  walrusPublisher: string;
  walrusAggregator: string;
  suiScanBase: string;
}

const NETWORK_CONFIG: Record<SuiNetwork, Omit<NetworkContextValue, "network" | "setNetwork">> = {
  testnet: {
    rpcUrl: "https://sui-testnet.gateway.tatum.io",
    walrusPublisher: "https://publisher.walrus-testnet.walrus.space",
    walrusAggregator: "https://aggregator.walrus-testnet.walrus.space",
    suiScanBase: "https://suiscan.xyz/testnet",
  },
  mainnet: {
    rpcUrl: "https://sui-mainnet.gateway.tatum.io",
    walrusPublisher: "https://publisher.walrus.space",
    walrusAggregator: "https://aggregator.walrus.space",
    suiScanBase: "https://suiscan.xyz/mainnet",
  },
};

const NetworkContext = createContext<NetworkContextValue>({
  network: "testnet",
  setNetwork: () => {},
  ...NETWORK_CONFIG.testnet,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<SuiNetwork>("testnet");

  // Persist selection in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shardsync_network") as SuiNetwork | null;
    if (saved === "mainnet" || saved === "testnet") setNetworkState(saved);
  }, []);

  const setNetwork = (n: SuiNetwork) => {
    setNetworkState(n);
    localStorage.setItem("shardsync_network", n);
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork, ...NETWORK_CONFIG[network] }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
