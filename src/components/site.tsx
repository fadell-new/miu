import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MiuProvider, useMiu } from "@/lib/miu-client";

const LINKS = [
  { to: "/trade", label: "Trade" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/ranks", label: "Ranks" },
  { to: "/shop", label: "Shop" },
  { to: "/arena", label: "Arena" },
  { to: "/leaderboard", label: "Board" },
];

function Shell({ children }: { children: ReactNode }) {
  const { me, anim, setAnim } = useMiu();
  const router = useRouter();
  const path = router.state.location.pathname;

  return (
    <div className={anim ? "miu" : "miu miu-calm"}>
      <header className="miu-nav">
        <Link to="/" className="miu-logo">
          <img src="/favicon.svg" width="28" height="28" alt="MIU logo" />
          <span>MIU Trade</span>
        </Link>
        <nav className="miu-links">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={path === l.to ? "on" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="miu-nav-right">
          <button type="button" className="miu-toggle" onClick={() => setAnim(!anim)}>
            {anim ? "Calm mode" : "Motion on"}
          </button>
          {me ? (
            <span className="miu-balance">{me.miu.toLocaleString()} MIU</span>
          ) : (
            <Link to="/auth" className="miu-balance">
              Log in
            </Link>
          )}
        </div>
      </header>
      <div key={path} className="miu-page">
        {children}
      </div>
      <footer className="miu-footer">
        <span>MIU is fake money for learning. Prices use free public feeds with synthetic fallback.</span>
        <Link to="/" className="miu-cta-d">
          Home
        </Link>
      </footer>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <MiuProvider>
      <Shell>{children}</Shell>
    </MiuProvider>
  );
}
