"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="pt-12">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] gap-16 items-center overflow-visible">
          <div className="space-y-8 relative z-10">
            <div className="space-y-4">
              <span className="inline-block py-1 px-4 clay-inset text-secondary font-label-mono text-[12px] uppercase tracking-wider">
                Decentralized Version Control v1.0
              </span>
              <h1 className="font-headline-lg text-headline-lg lg:text-[56px] lg:leading-[1.1] tracking-tight text-primary">
                Version Control for <span className="text-secondary">Autonomous Agents</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Version, inspect, fork, and roll back autonomous AI agents and their evolving configuration brains with cryptographic guarantees on Walrus storage, coordinated by Sui and indexed by Tatum.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/agents/create" className="clay-button-primary px-8 py-4 rounded-2xl text-on-secondary font-headline-sm flex items-center gap-2 group active:scale-95 no-underline">
                Get Started
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <Link href="/docs" className="clay-button-secondary px-8 py-4 rounded-2xl text-primary font-headline-sm flex items-center gap-2 active:scale-95 no-underline">
                View Docs
                <span className="material-symbols-outlined">description</span>
              </Link>
            </div>
            <p className="font-body-md text-[13px] text-on-surface-variant/80 italic">
              Refer to the project documentation at <Link href="/docs" className="text-secondary hover:underline font-semibold">/docs</Link> for detailed architecture specifications.
            </p>
          </div>
          <div className="relative flex justify-center items-center lg:justify-end z-0 overflow-visible h-[650px]">
            {/* Glow */}
            <div className="absolute w-[900px] h-[900px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none right-[-150px] top-[80px]" />

            {/* Crystal */}
            <img
              alt="Shard Crystal"
              src="/shard.png"
              className="
                absolute
                w-[1500px]
                max-w-none
                right-[-350px]
                top-[-50px]
                z-10
                hero-glow
                animate-float-breathing
                pointer-events-none
              "
            />
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="max-w-[1800px] mx-auto px-margin-desktop mb-32 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="clay-card p-10 flex flex-col items-center text-center space-y-6 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
              <img alt="Security Icon" className="scale-[2.5] object-center" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQf72t8S6TiGag_bhv1305ZNU_dPHpqt6wK5oRVkcUsaejc0VXrBaOOUHBjUk4Hmw-GRiCYRpp0XDDdGwnkF_oSY77ikJfY5IS6WvK8idzhxoYa4DDNpX-ynWSPnhf2s4dl9aXb3jUdjDr0EQWBTdIipepJoVDMIuEaLzK_5HFK0SuaTYs7A8niNpHVnM6UEn4OdxwBd4kbo9mTuFOF3g5ujGhCPyQNAUAKz0kgjzybbyVExqIfVJmuKlTmRJuaDqhFWRbt-UBqWc" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline-md text-headline-md text-primary">Decentralized Versioning</h3>
              <p className="font-body-md text-on-surface-variant">Track config revisions and parameters. Fork parent states and roll back updates with cryptographic consensus via Sui & Walrus.</p>
            </div>
          </div>
          <div className="clay-card p-10 flex flex-col items-center text-center space-y-6 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
              <img alt="Execution Icon" className="scale-[2.5] object-center -translate-x-1/3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQf72t8S6TiGag_bhv1305ZNU_dPHpqt6wK5oRVkcUsaejc0VXrBaOOUHBjUk4Hmw-GRiCYRpp0XDDdGwnkF_oSY77ikJfY5IS6WvK8idzhxoYa4DDNpX-ynWSPnhf2s4dl9aXb3jUdjDr0EQWBTdIipepJoVDMIuEaLzK_5HFK0SuaTYs7A8niNpHVnM6UEn4OdxwBd4kbo9mTuFOF3g5ujGhCPyQNAUAKz0kgjzybbyVExqIfVJmuKlTmRJuaDqhFWRbt-UBqWc" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline-md text-headline-md text-primary">Verifiable Execution Logs</h3>
              <p className="font-body-md text-on-surface-variant">Persist step-by-step inputs, durations, and outputs on Walrus, linking directly to on-chain execution indexes.</p>
            </div>
          </div>
          <div className="clay-card p-10 flex flex-col items-center text-center space-y-6 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
              <img alt="Connectivity Icon" className="scale-[2.5] object-center -translate-x-2/3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQf72t8S6TiGag_bhv1305ZNU_dPHpqt6wK5oRVkcUsaejc0VXrBaOOUHBjUk4Hmw-GRiCYRpp0XDDdGwnkF_oSY77ikJfY5IS6WvK8idzhxoYa4DDNpX-ynWSPnhf2s4dl9aXb3jUdjDr0EQWBTdIipepJoVDMIuEaLzK_5HFK0SuaTYs7A8niNpHVnM6UEn4OdxwBd4kbo9mTuFOF3g5ujGhCPyQNAUAKz0kgjzybbyVExqIfVJmuKlTmRJuaDqhFWRbt-UBqWc" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline-md text-headline-md text-primary">Tatum-Indexed Timelines</h3>
              <p className="font-body-md text-on-surface-variant">Monitor runtime metrics, durations, and success rates using high-performance indexing powered by Tatum Gateway.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Preview */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-32">
        <div className="clay-card p-4 md:p-8">
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-error/20"></div>
                <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
                <div className="w-3 h-3 rounded-full bg-secondary/20"></div>
              </div>
              <span className="font-label-mono text-label-mono text-on-surface-variant px-3 py-1 clay-inset">agent_config.json</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 clay-inset p-8 overflow-hidden relative min-h-[400px]">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline-sm text-headline-sm">Versioned Agents</h4>
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold">MONITORED: 2</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-surface p-4 rounded-xl shadow-sm flex justify-between items-center border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-on-secondary">
                        <span className="material-symbols-outlined">analytics</span>
                      </div>
                      <div>
                        <p className="font-headline-sm text-[16px]">TraderAgent_v2</p>
                        <p className="text-[12px] text-on-surface-variant">Walrus config ID: 0x56ae13...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-secondary">2 Revisions</p>
                      <p className="text-[10px] text-on-surface-variant">Sui Registered</p>
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl shadow-sm flex justify-between items-center border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-tertiary rounded-lg flex items-center justify-center text-on-tertiary">
                        <span className="material-symbols-outlined">psychology</span>
                      </div>
                      <div>
                        <p className="font-headline-sm text-[16px]">SentimentAnalyzer_v1</p>
                        <p className="text-[12px] text-on-surface-variant">Walrus config ID: 0x8b32cf...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold">Stable</p>
                      <p className="text-[10px] text-on-surface-variant">Sui Registered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#1b1b1b] rounded-2xl p-8 font-label-mono text-label-mono text-on-tertiary-fixed overflow-x-auto">
              <pre className="text-[#c6c6c6] text-[13px] leading-relaxed">
                {`{
  "agent": "Trading_Bot_Agent",
  "version": 2,
  "walrus_config_blob_id": "0x56ae13...",
  "commit_message": "Optimized trade pairs",
  "permissions": [
    "DEX_READ",
    "TRANSACT_SUI"
  ],
  "strategy": {
    "pairs": ["SUI/USDC"],
    "interval_seconds": 60
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-32 text-center">
        <p className="font-label-mono text-label-mono text-on-surface-variant mb-12 uppercase tracking-[0.2em]">
          Powered by leading on-chain protocols
        </p>
        <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 grayscale opacity-60 hover:grayscale-0 transition-all duration-500">
          <div className="text-headline-sm font-bold tracking-tighter">SUI NETWORK</div>
          <div className="text-headline-sm font-bold tracking-tighter">WALRUS STORAGE</div>
          <div className="text-headline-sm font-bold tracking-tighter">TATUM GATEWAY</div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-24">
        <div className="clay-card p-12 lg:p-24 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="font-headline-lg text-headline-lg max-w-2xl mx-auto">Ready to version your agent brains?</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">
              Get full transparency, history, and version control for your AI agents using decentralized storage on Sui and Walrus.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/agents/create" className="clay-button-primary px-12 py-5 rounded-2xl text-on-secondary font-headline-sm active:scale-95 transition-all no-underline inline-block">
                Create An Agent
              </Link>
              <Link href="/docs" className="clay-button-secondary px-12 py-5 rounded-2xl text-primary font-headline-sm active:scale-95 transition-all border border-transparent hover:border-secondary/20 no-underline inline-block">
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
