"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { shortenId } from "../lib/api";
import { useState } from "react";
import { useNetwork, type SuiNetwork } from "../hooks/useNetwork";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/timeline", label: "Timeline" },
  { href: "/analytics", label: "Analytics" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const { network, setNetwork } = useNetwork();

  const toggleNetwork = () =>
    setNetwork(network === "testnet" ? "mainnet" : "testnet");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md">
      <nav className="flex justify-between items-center w-full px-4 md:px-margin-desktop h-16 md:h-20 max-w-container-max mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-6 md:gap-12">
          <Link href="/" className="font-headline-md text-headline-md font-extrabold text-primary no-underline text-[18px] md:text-[22px]">
            ShardSync
          </Link>
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-label-mono text-label-mono pb-1 transition-colors duration-200 no-underline ${
                    isActive
                      ? "text-secondary font-bold border-b-2 border-secondary"
                      : "text-on-surface-variant hover:text-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: wallet + hamburger */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Address pill — hidden on small phones */}
          {account && (
            <span className="hidden sm:inline font-label-mono text-[12px] text-secondary clay-inset px-3 py-1 rounded-full">
              {shortenId(account.address)}
            </span>
          )}

          {/* Network toggle pill */}
          <button
            onClick={toggleNetwork}
            title={`Switch to ${network === "testnet" ? "mainnet" : "testnet"}`}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-mono text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${
              network === "mainnet"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${network === "mainnet" ? "bg-amber-400" : "bg-secondary"} animate-pulse`} />
            {network}
          </button>

          {/* Connect button — shrink label on mobile */}
          <div style={{ "--connect-wallet-button-color": "var(--color-on-secondary)", "--connect-wallet-button-background": "var(--color-secondary)" } as React.CSSProperties}>
            <ConnectButton
              connectText="Connect"
              className="clay-button-primary px-4 md:px-6 py-2 md:py-2.5 rounded-full text-on-secondary font-label-mono text-[12px] md:text-label-mono active:scale-95 transition-transform"
            />
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-xl clay-inset"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-primary transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-primary transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-primary transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-md border-t border-white/10 px-4 py-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-label-mono text-[14px] transition-all no-underline ${
                  isActive
                    ? "bg-secondary/15 text-secondary font-bold"
                    : "text-on-surface-variant hover:bg-white/5 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {account && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <span className="font-label-mono text-[11px] text-secondary clay-inset px-3 py-1 rounded-full">
                {account.address.slice(0, 16)}…
              </span>
            </div>
          )}
          {/* Network toggle in mobile menu */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="font-label-mono text-[12px] text-on-surface-variant">Network</span>
            <button
              onClick={toggleNetwork}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label-mono text-[11px] font-bold uppercase tracking-wider border transition-all ${
                network === "mainnet"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-secondary/10 text-secondary border-secondary/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${network === "mainnet" ? "bg-amber-400" : "bg-secondary"} animate-pulse`} />
              {network === "mainnet" ? "Mainnet" : "Testnet"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
