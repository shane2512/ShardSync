"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard", icon: "⬡" },
  { href: "/agents", label: "Agents", icon: "◈" },
  { href: "/timeline", label: "Timeline", icon: "◷" },
  { href: "/analytics", label: "Analytics", icon: "◐" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        borderRadius: 0,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "var(--gradient-hero)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 800,
            color: "white",
          }}
        >
          S
        </div>
        <span
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Shard
          <span className="gradient-text">Sync</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: "flex", gap: "4px" }}>
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                background: isActive
                  ? "rgba(99, 102, 241, 0.1)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(99, 102, 241, 0.2)"
                  : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "16px" }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Network Badge */}
      <div className="badge badge-info">
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--accent-indigo)",
          }}
        />
        Sui Testnet
      </div>
    </nav>
  );
}
