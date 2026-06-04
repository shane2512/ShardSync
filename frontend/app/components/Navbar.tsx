"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { shortenId } from "../lib/api";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/timeline", label: "Timeline" },
  { href: "/analytics", label: "Analytics" },
];

export function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md">
      <nav className="flex justify-between items-center w-full px-margin-desktop h-20 max-w-container-max mx-auto">
        <div className="flex items-center gap-12">
          <Link href="/" className="font-headline-md text-headline-md font-extrabold text-primary no-underline">
            ShardSync
          </Link>
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
        <div className="flex items-center gap-4">
          <div className="flex gap-4 mr-2">
            {account && (
              <span className="font-label-mono text-[12px] text-secondary clay-inset px-3 py-1 rounded-full">
                {shortenId(account.address)}
              </span>
            )}
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">notifications</span>
          </div>
          
          <div style={{ "--connect-wallet-button-color": "var(--color-on-secondary)", "--connect-wallet-button-background": "var(--color-secondary)" } as React.CSSProperties}>
            <ConnectButton
              connectText="Connect Wallet"
              className="clay-button-primary px-6 py-2.5 rounded-full text-on-secondary font-label-mono text-label-mono active:scale-95 transition-transform"
            />
          </div>
        </div>
      </nav>
    </header>
  );
}
