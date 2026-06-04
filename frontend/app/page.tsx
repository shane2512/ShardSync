"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="pt-12">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-16 items-center overflow-visible">
          <div className="space-y-8 relative z-10">
            <div className="space-y-4">
              <span className="inline-block py-1 px-4 clay-inset text-secondary font-label-mono text-[12px] uppercase tracking-wider">
                On-Chain Orchestration v1.0
              </span>
              <h1 className="font-headline-lg text-headline-lg lg:text-[64px] leading-[1.05] tracking-tight text-primary">
                Orchestrate On-Chain Intelligence with <span className="text-secondary">Tactile Precision</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Deploy autonomous agents on Sui with unmatched speed and security. Transform raw blockchain data into physical-feeling workflows through our claymorphic agent-core.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/agents/create" className="clay-button-primary px-8 py-4 rounded-2xl text-on-secondary font-headline-sm flex items-center gap-2 group active:scale-95 no-underline">
                Get Started
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <button className="clay-button-secondary px-8 py-4 rounded-2xl text-primary font-headline-sm flex items-center gap-2 active:scale-95">
                View Docs
                <span className="material-symbols-outlined">description</span>
              </button>
            </div>
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
              <h3 className="font-headline-md text-headline-md text-primary">Secure by Design</h3>
              <p className="font-body-md text-on-surface-variant">Immutable smart-contracts governing agent permissions and asset flows with 0.0% breach history.</p>
            </div>
          </div>
          <div className="clay-card p-10 flex flex-col items-center text-center space-y-6 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
              <img alt="Execution Icon" className="scale-[2.5] object-center -translate-x-1/3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQf72t8S6TiGag_bhv1305ZNU_dPHpqt6wK5oRVkcUsaejc0VXrBaOOUHBjUk4Hmw-GRiCYRpp0XDDdGwnkF_oSY77ikJfY5IS6WvK8idzhxoYa4DDNpX-ynWSPnhf2s4dl9aXb3jUdjDr0EQWBTdIipepJoVDMIuEaLzK_5HFK0SuaTYs7A8niNpHVnM6UEn4OdxwBd4kbo9mTuFOF3g5ujGhCPyQNAUAKz0kgjzybbyVExqIfVJmuKlTmRJuaDqhFWRbt-UBqWc" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline-md text-headline-md text-primary">Blazing Execution</h3>
              <p className="font-body-md text-on-surface-variant">Parallel transaction processing on Sui allows your agents to act within milliseconds of on-chain events.</p>
            </div>
          </div>
          <div className="clay-card p-10 flex flex-col items-center text-center space-y-6 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
              <img alt="Connectivity Icon" className="scale-[2.5] object-center -translate-x-2/3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQf72t8S6TiGag_bhv1305ZNU_dPHpqt6wK5oRVkcUsaejc0VXrBaOOUHBjUk4Hmw-GRiCYRpp0XDDdGwnkF_oSY77ikJfY5IS6WvK8idzhxoYa4DDNpX-ynWSPnhf2s4dl9aXb3jUdjDr0EQWBTdIipepJoVDMIuEaLzK_5HFK0SuaTYs7A8niNpHVnM6UEn4OdxwBd4kbo9mTuFOF3g5ujGhCPyQNAUAKz0kgjzybbyVExqIfVJmuKlTmRJuaDqhFWRbt-UBqWc" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline-md text-headline-md text-primary">Global Connectivity</h3>
              <p className="font-body-md text-on-surface-variant">Seamless bridging and cross-chain communication hubs for truly decentralized intelligence.</p>
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
              <span className="font-label-mono text-label-mono text-on-surface-variant px-3 py-1 clay-inset">core_orchestrator.yaml</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 clay-inset p-8 overflow-hidden relative min-h-[400px]">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline-sm text-headline-sm">Active Agents</h4>
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold">LIVE: 12</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-surface p-4 rounded-xl shadow-sm flex justify-between items-center border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-on-secondary">
                        <span className="material-symbols-outlined">rocket_launch</span>
                      </div>
                      <div>
                        <p className="font-headline-sm text-[16px]">YieldSeeker_V2</p>
                        <p className="text-[12px] text-on-surface-variant">Allocating: 45,000 SUI</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-secondary">+12.4%</p>
                      <p className="text-[10px] text-on-surface-variant">24h APY</p>
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl shadow-sm flex justify-between items-center border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-tertiary rounded-lg flex items-center justify-center text-on-tertiary">
                        <span className="material-symbols-outlined">security</span>
                      </div>
                      <div>
                        <p className="font-headline-sm text-[16px]">RiskGuard_Alpha</p>
                        <p className="text-[12px] text-on-surface-variant">Monitoring: Mainnet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold">Stable</p>
                      <p className="text-[10px] text-on-surface-variant">Status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#1b1b1b] rounded-2xl p-8 font-label-mono text-label-mono text-on-tertiary-fixed overflow-x-auto">
              <pre className="text-[#c6c6c6]">
                <span className="text-secondary-fixed">version:</span> "3.4"{'\n'}
                <span className="text-secondary-fixed">agent:</span>{'\n'}
                {'  '}<span className="text-secondary-fixed">name:</span> "Liquidity_Sentinel"{'\n'}
                {'  '}<span className="text-secondary-fixed">core:</span> "ShardSync-V1"{'\n'}
                {'  '}<span className="text-secondary-fixed">permissions:</span>{'\n'}
                {'    '}- "DEX_INTERACTION"{'\n'}
                {'    '}- "YIELD_COMPOUNDING"{'\n'}
                {'  '}<span className="text-secondary-fixed">strategies:</span>{'\n'}
                {'    '}<span className="text-secondary-fixed">- type:</span> "rebalance"{'\n'}
                {'      '}<span className="text-secondary-fixed">threshold:</span> 0.05{'\n'}
                {'      '}<span className="text-secondary-fixed">priority:</span> "high"{'\n'}
                {'  '}<span className="text-secondary-fixed">governance:</span>{'\n'}
                {'    '}<span className="text-secondary-fixed">multisig:</span> true{'\n'}
                {'    '}<span className="text-secondary-fixed">delay:</span> 120s
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-32 text-center">
        <p className="font-label-mono text-label-mono text-on-surface-variant mb-12 uppercase tracking-[0.2em]">
          Powering the Future of Web3
        </p>
        <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 grayscale opacity-60 hover:grayscale-0 transition-all duration-500">
          <div className="text-headline-sm font-bold tracking-tighter">SUI NETWORK</div>
          <div className="text-headline-sm font-bold tracking-tighter">CELO ECO</div>
          <div className="text-headline-sm font-bold tracking-tighter">AGENT.AI</div>
          <div className="text-headline-sm font-bold tracking-tighter">SYNTH_PRO</div>
          <div className="text-headline-sm font-bold tracking-tighter">CORE_DAO</div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-24">
        <div className="clay-card p-12 lg:p-24 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="font-headline-lg text-headline-lg max-w-2xl mx-auto">Ready to scale your agent workforce?</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">
              Upgrade your network capacity today and unlock advanced multi-chain orchestration features.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="clay-button-primary px-12 py-5 rounded-2xl text-on-secondary font-headline-sm active:scale-95 transition-all">
                Upgrade Network Capacity
              </button>
              <button className="clay-button-secondary px-12 py-5 rounded-2xl text-primary font-headline-sm active:scale-95 transition-all border border-transparent hover:border-secondary/20">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
