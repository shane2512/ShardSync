import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { WalletProviders } from "./components/WalletProviders";

export const metadata: Metadata = {
  title: "ShardSync – Version Control for Autonomous Agents",
  description:
    "Version, inspect, fork, and roll back autonomous AI agents with cryptographic guarantees on Sui + Walrus.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WalletProviders>
          <Navbar />
          <main style={{ paddingTop: "72px" }}>{children}</main>
          <Footer />
        </WalletProviders>
      </body>
    </html>
  );
}

