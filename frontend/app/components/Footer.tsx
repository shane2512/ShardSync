import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-surface-variant/20 py-20 mt-20">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <span className="font-headline-sm text-headline-sm font-bold text-primary">
              ShardSync
            </span>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              The premium orchestrator for on-chain intelligence. Built for developers who value speed, security, and tactile UI.
            </p>
          </div>
          <div>
            <h5 className="font-label-mono text-label-mono font-bold mb-6 text-primary uppercase tracking-wider">
              Product
            </h5>
            <ul className="space-y-4 text-on-surface-variant list-none p-0 m-0 font-body-md">
              <li>
                <Link href="/" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Agent SDK
                </Link>
              </li>
              <li>
                <Link href="/timeline" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Timeline
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-mono text-label-mono font-bold mb-6 text-primary uppercase tracking-wider">
              Resources
            </h5>
            <ul className="space-y-4 text-on-surface-variant list-none p-0 m-0 font-body-md">
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-mono text-label-mono font-bold mb-6 text-primary uppercase tracking-wider">
              Legal
            </h5>
            <ul className="space-y-4 text-on-surface-variant list-none p-0 m-0 font-body-md">
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-secondary transition-colors no-underline text-on-surface-variant">
                  License
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-surface-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-on-tertiary-container font-label-mono text-[12px] m-0">
            © 2024 ShardSync protocol. All agents are sovereign.
          </p>
          <div className="flex gap-6 font-label-mono text-[12px] text-on-surface-variant">
            <span>v2.4.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-secondary self-center"></div>
            <span>Network Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
