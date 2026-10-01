import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  miuLeaderboard,
  miuLogin,
  miuMe,
  miuPortfolio,
  miuPrices,
  miuPvpClaim,
  miuPvpCreate,
  miuPvpJoin,
  miuPvpList,
  miuRegister,
  miuShopBuy,
  miuTrade,
} from "@/lib/miu.functions";
import { RANKS, SHOP_SEED } from "@/lib/miu-ranks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "description", content: "MIU paper trading sim with live prices, ranks, shop and PvP." },
      { property: "og:title", content: "MIU Trade League" },
      { property: "og:description", content: "Paper trading sim with live prices, ranks, shop and PvP duels." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://miu-trade.vercel.app/og-cover.svg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://miu-trade.vercel.app/" },
      { rel: "icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  component: Index,
});

type Price = { symbol: string; name: string; kind: string; price: number };

function loadToken(): string | null {
  try {
    return localStorage.getItem("miu_token");
  } catch {
    return null;
  }
}

function Index() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ name: string; rank: { name: string; capMiu: number | null }; miu: number; total: number; xp: number } | null>(null);
  const [symbol, setSymbol] = useState("BTC");
  const [buyAmt, setBuyAmt] = useState("1000");
  const [sellQty, setSellQty] = useState("0.01");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ symbol: string; qty: number; price: number; value: number; pnl: number }[]>([]);
  const [board, setBoard] = useState<{ name: string; rank: string; total: number }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; symbol: string; stake: number; ends_at: string; status: string }[]>([]);
  const [anim, setAnim] = useState(true);
  const [pvpDir, setPvpDir] = useState<"up" | "down">("up");
  const [pvpStake, setPvpStake] = useState("500");

  useEffect(() => {
    setToken(loadToken());
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) setAnim(false);
    } catch {
      return;
    }
  }, []);

  async function refreshPrices() {
    try {
      const r = await miuPrices({});
      setPrices(r.prices);
      if (!symbol && r.prices.length) setSymbol(r.prices[0].symbol);
    } catch {
      return;
    }
  }

  async function refreshAll(t?: string) {
    const tk = t ?? token;
    await refreshPrices();
    try {
      const b = await miuLeaderboard({});
      setBoard(b.rows);
      const pr = await miuPvpList({});
      setRooms(pr.rooms);
    } catch {
      return;
    }
    if (tk) {
      try {
        const m = await miuMe({ data: { token: tk } });
        setMe(m);
        const p = await miuPortfolio({ data: { token: tk } });
        setRows(p.rows);
      } catch {
        setMe(null);
      }
    }
  }

  useEffect(() => {
    void refreshAll();
    const id = window.setInterval(() => void refreshPrices(), 12000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const px = prices.find((p) => p.symbol === symbol)?.price ?? 0;

  async function doRegister() {
    setMsg("");
    try {
      const r = await miuRegister({ data: { email, password: pass, name: nick || email.split("@")[0] } });
      try {
        localStorage.setItem("miu_token", r.token);
      } catch {
        return;
      }
      setToken(r.token);
      await refreshAll(r.token);
      setMsg("Account ready. 100K MIU added.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Register failed");
    }
  }

  async function doLogin() {
    setMsg("");
    try {
      const r = await miuLogin({ data: { email, password: pass } });
      try {
        localStorage.setItem("miu_token", r.token);
      } catch {
        return;
      }
      setToken(r.token);
      await refreshAll(r.token);
      setMsg("Welcome back.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function doTrade(side: "buy" | "sell") {
    setMsg("");
    if (!token) {
      setMsg("Login first with email and password.");
      return;
    }
    try {
      if (side === "buy") {
        await miuTrade({ data: { token, symbol, side, amount: Number(buyAmt) } });
      } else {
        await miuTrade({ data: { token, symbol, side, amount: Number(sellQty) } });
      }
      await refreshAll();
      setMsg(side === "buy" ? "Bought." : "Sold.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Trade failed");
    }
  }

  return (
    <main className={anim ? "miu" : "miu miu-calm"}>
      <header className="miu-nav">
        <a href="#top" className="miu-logo">
          <img src="/favicon.svg" width="28" height="28" alt="MIU logo" />
          <span>MIU Trade</span>
        </a>
        <nav className="miu-links">
          <a href="#markets">Markets</a>
          <a href="#terminal">Terminal</a>
          <a href="#ranks">Ranks</a>
          <a href="#arena">Arena</a>
        </nav>
        <div className="miu-nav-right">
          <button type="button" className="miu-toggle" onClick={() => setAnim((v) => !v)}>
            {anim ? "Calm mode" : "Motion on"}
          </button>
          <span className="miu-balance">{me ? `${me.miu.toLocaleString()} MIU` : "Paper money"}</span>
        </div>
      </header>

      <section id="top" className="miu-hero">
        <div>
          <p className="miu-eyebrow">Paper trading league</p>
          <h1>Trade live markets with 100K MIU</h1>
          <p className="miu-sub">Real price feeds, fake MIU money. Climb from Bronze to MIU Legend and duel friends.</p>
          <div className="miu-cta-row">
            <a href="#terminal" className="miu-cta-a">Enter terminal</a>
            <a href="#ranks" className="miu-cta-b">View ranks</a>
          </div>
          {me ? (
            <p className="miu-note">{me.name} plays as {me.rank.name} with {me.total.toLocaleString()} net worth and {me.xp} XP.</p>
          ) : (
            <p className="miu-note">No wallet yet. Create one below with email and password.</p>
          )}
        </div>
        <div className="miu-hero-card">
          <div className="miu-hero-head">Live board</div>
          <div className={anim ? "miu-strip" : "miu-strip miu-paused"}>
            <div className="miu-strip-inner">
              {prices.map((p) => (
                <span key={p.symbol} className="miu-tick">
                  {p.symbol} {p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              ))}
              {prices.length === 0 ? <span className="miu-tick">Loading feeds</span> : null}
            </div>
          </div>
          <div className="miu-top3">
            {board.slice(0, 3).map((b, i) => (
              <div key={b.name + i} className="miu-top3-row">
                <span>{i + 1}. {b.name}</span>
                <span>{b.total.toLocaleString()} MIU</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="markets" className="miu-section">
        <h2>Markets move every few seconds</h2>
        <div className="miu-hscroll">
          {prices.map((p) => (
            <button key={p.symbol} type="button" onClick={() => setSymbol(p.symbol)} className={p.symbol === symbol ? "miu-sym miu-sym-on" : "miu-sym"}>
              <span>{p.symbol}</span>
              <strong>{p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
              <small>{p.name}</small>
            </button>
          ))}
        </div>
      </section>

      <section id="terminal" className="miu-section miu-split">
        <div>
          <h2>Terminal</h2>
          <p className="miu-sub">Buy with MIU, sell shares back to MIU. Fee 0.3 percent with rank discount.</p>
          <label className="miu-label" htmlFor="miu-sym">Symbol</label>
          <select id="miu-sym" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="miu-input">
            {prices.map((p) => (
              <option key={p.symbol} value={p.symbol}>{p.symbol} at {p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</option>
            ))}
          </select>
          <div className="miu-grid2">
            <div>
              <label className="miu-label" htmlFor="miu-buy">MIU to spend</label>
              <input id="miu-buy" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} inputMode="decimal" className="miu-input" />
              <button type="button" className="miu-cta-c" onClick={() => void doTrade("buy")}>Buy {symbol}</button>
            </div>
            <div>
              <label className="miu-label" htmlFor="miu-sell">Shares to sell</label>
              <input id="miu-sell" value={sellQty} onChange={(e) => setSellQty(e.target.value)} inputMode="decimal" className="miu-input" />
              <button type="button" className="miu-cta-d" onClick={() => void doTrade("sell")}>Sell {symbol}</button>
            </div>
          </div>
          <p className="miu-note">Price {px.toLocaleString(undefined, { maximumFractionDigits: 4 })}. {msg}</p>
          <div className="miu-auth">
            <h3>Wallet login</h3>
            <div className="miu-grid2">
              <div>
                <label className="miu-label" htmlFor="miu-email">Email</label>
                <input id="miu-email" value={email} onChange={(e) => setEmail(e.target.value)} className="miu-input" autoComplete="email" />
              </div>
              <div>
                <label className="miu-label" htmlFor="miu-pass">Password</label>
                <input id="miu-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="miu-input" autoComplete="current-password" />
              </div>
            </div>
            <label className="miu-label" htmlFor="miu-nick">Display name for register</label>
            <input id="miu-nick" value={nick} onChange={(e) => setNick(e.target.value)} className="miu-input" />
            <div className="miu-cta-row">
              <button type="button" className="miu-cta-a" onClick={() => void doRegister()}>Create wallet</button>
              <button type="button" className="miu-cta-b" onClick={() => void doLogin()}>Log in</button>
            </div>
          </div>
        </div>
        <div className="miu-port">
          <h3>Portfolio</h3>
          {rows.length === 0 ? <p className="miu-note">Empty. Buy BTC or AAPL to start.</p> : null}
          {rows.map((r) => (
            <div key={r.symbol} className="miu-prow">
              <span>{r.symbol} {r.qty.toFixed(4)}</span>
              <span>{r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} MIU</span>
              <span className={r.pnl >= 0 ? "miu-up" : "miu-down"}>{r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="ranks" className="miu-section">
        <p className="miu-eyebrow">Progression</p>
        <h2>Ten ranks from Bronze to Legend</h2>
        <div className="miu-rankgrid">
          {RANKS.map((r) => (
            <div key={r.id} className="miu-rank">
              <strong>{r.name}</strong>
              <span>{r.capMiu == null ? "No cap" : `${r.capMiu.toLocaleString()} cap`}</span>
              <small>{r.xpNeeded} XP. {r.blurb}.</small>
            </div>
          ))}
        </div>
      </section>

      <section id="arena" className="miu-section">
        <h2>Shop and duel arena</h2>
        <div className="miu-bento">
          <div className="miu-cell">
            <h3>Shop</h3>
            {SHOP_SEED.map((s) => (
              <div key={s.id} className="miu-prow">
                <span>{s.name} {s.price_miu.toLocaleString()} MIU</span>
                <button
                  type="button"
                  className="miu-mini"
                  onClick={() => {
                    if (!token) {
                      setMsg("Login first.");
                      return;
                    }
                    void miuShopBuy({ data: { token, itemId: s.id } }).then(() => refreshAll()).catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Shop failed"));
                  }}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
          <div className="miu-cell">
            <h3>Duel</h3>
            <div className="miu-grid2">
              <div>
                <label className="miu-label" htmlFor="miu-pdir">Pick direction</label>
                <select id="miu-pdir" value={pvpDir} onChange={(e) => setPvpDir(e.target.value as "up" | "down")} className="miu-input">
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </div>
              <div>
                <label className="miu-label" htmlFor="miu-pstake">Stake MIU</label>
                <input id="miu-pstake" value={pvpStake} onChange={(e) => setPvpStake(e.target.value)} inputMode="numeric" className="miu-input" />
              </div>
            </div>
            <button
              type="button"
              className="miu-cta-c"
              onClick={() => {
                if (!token) {
                  setMsg("Login first.");
                  return;
                }
                void miuPvpCreate({ data: { token, symbol, direction: pvpDir, stake: Number(pvpStake), minutes: 1 } })
                  .then(() => refreshAll())
                  .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Duel failed"));
              }}
            >
              Start duel
            </button>
          </div>
          <div className="miu-cell">
            <h3>Open rooms</h3>
            {rooms.length === 0 ? <p className="miu-note">No rooms yet.</p> : null}
            {rooms.map((r) => (
              <div key={r.id} className="miu-prow">
                <span>{r.symbol} {r.stake} MIU</span>
                <button
                  type="button"
                  className="miu-mini"
                  onClick={() => {
                    if (!token) {
                      setMsg("Login first.");
                      return;
                    }
                    void miuPvpJoin({ data: { token, roomId: r.id, direction: pvpDir } })
                      .then(() => refreshAll())
                      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Join failed"));
                  }}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
          <div className="miu-cell">
            <h3>Settle</h3>
            <p className="miu-note">Claim after the timer ends. Winners split the pot minus 4 percent.</p>
            {rooms.map((r) => (
              <div key={"c" + r.id} className="miu-prow">
                <span>{r.id.slice(0, 6)} {r.status}</span>
                <button
                  type="button"
                  className="miu-mini"
                  onClick={() => {
                    if (!token) return;
                    void miuPvpClaim({ data: { token, roomId: r.id } })
                      .then((s) => setMsg(s.ok ? `Settled. Market went ${s.actual}.` : "Already settled."))
                      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Claim failed"));
                  }}
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="miu-section">
        <h2>Leaderboard</h2>
        <div className="miu-list">
          {board.map((b, i) => (
            <div key={b.name + i} className="miu-lrow">
              <span>{i + 1}. {b.name} ({b.rank})</span>
              <span>{b.total.toLocaleString()} MIU</span>
            </div>
          ))}
          {board.length === 0 ? <p className="miu-note">No traders yet. Be the first.</p> : null}
        </div>
      </section>

      <footer className="miu-footer">
        <span>MIU is fake money for learning. Prices use free public feeds with synthetic fallback.</span>
        <a href="#top" className="miu-cta-d">Back to top</a>
      </footer>
    </main>
  );
}
