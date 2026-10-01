import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "description", content: "MIU paper trading sim with live prices, ranks, shop and PvP." },
      { property: "og:title", content: "MIU Trade League" },
      { property: "og:description", content: "Paper trading sim with live prices, ranks, shop and PvP duels." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://miu-swart.vercel.app/og-cover.svg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://miu-swart.vercel.app/" },
      { rel: "icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  component: Landing,
});

const CANDLES = [
  { h: 34, up: true },
  { h: 52, up: true },
  { h: 44, up: false },
  { h: 66, up: true },
  { h: 58, up: false },
  { h: 78, up: true },
  { h: 64, up: true },
  { h: 88, up: false },
];

function Landing() {
  const { prices, board, me } = useMiu();
  const top = board[0];

  return (
    <SiteShell>
      <section className="miu-hero miu-glowbg">
        <div>
          <p className="miu-eyebrow">Paper trading league</p>
          <h1>Trade live markets with 100K MIU</h1>
          <p className="miu-sub">Real price feeds, fake MIU money. Climb from Bronze to MIU Legend and duel friends.</p>
          <div className="miu-cta-row">
            <Link to="/trade" className="miu-cta-a">
              Enter terminal
            </Link>
            <Link to="/ranks" className="miu-cta-b">
              View ranks
            </Link>
          </div>
          <div className="miu-statgrid miu-stagger">
            <div className="miu-stat">
              <strong>{prices.length || "-"}</strong>
              <small>live markets</small>
            </div>
            <div className="miu-stat">
              <strong>{board.length || "-"}</strong>
              <small>traders ranked</small>
            </div>
            <div className="miu-stat">
              <strong>{top ? `${Math.round(top.total / 1000)}K` : "-"}</strong>
              <small>top net worth MIU</small>
            </div>
          </div>
          {me ? (
            <p className="miu-note">
              {me.name} plays as {me.rank.name} with {me.total.toLocaleString()} net worth.
            </p>
          ) : (
            <p className="miu-note">
              No wallet yet. <Link to="/auth">Create one</Link> with email and password.
            </p>
          )}
        </div>
        <div className="miu-stagger">
          <div className="miu-candles">
            {CANDLES.map((c, i) => (
              <span
                key={i}
                className="miu-candle"
                style={{ height: c.h * 2, background: c.up ? "#22c55e" : "#a855f7" }}
              />
            ))}
          </div>
          <div className="miu-strip" style={{ marginTop: 10 }}>
            <div className="miu-strip-inner">
              {[...prices, ...prices].map((p, i) => (
                <span key={p.symbol + i} className="miu-tick">
                  {p.symbol} {p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              ))}
              {prices.length === 0 ? <span className="miu-tick">Loading feeds</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="miu-section">
        <h2>Top traders this week</h2>
        <div className="miu-list miu-stagger">
          {board.slice(0, 3).map((b, i) => (
            <div key={b.name + i} className="miu-lrow">
              <span>
                {i + 1}. {b.name} ({b.rank})
              </span>
              <span>{b.total.toLocaleString()} MIU</span>
            </div>
          ))}
          {board.length === 0 ? <p className="miu-note">No traders yet. Be the first.</p> : null}
        </div>
        <div className="miu-cta-row">
          <Link to="/leaderboard" className="miu-cta-d">
            Full board
          </Link>
          <Link to="/arena" className="miu-cta-d">
            Duel arena
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
