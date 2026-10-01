import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { miuTrade } from "@/lib/miu.functions";

export const Route = createFileRoute("/trade")({
  component: Trade,
});

function sparkPoints(data: number[]): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  return data
    .map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(60 - ((v - min) / span) * 56).toFixed(1)}`)
    .join(" ");
}

function Trade() {
  const { token, prices, history } = useMiu();
  const [symbol, setSymbol] = useState("BTC");
  const [buyAmt, setBuyAmt] = useState("1000");
  const [sellQty, setSellQty] = useState("0.01");
  const [msg, setMsg] = useState("");
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const prev = useRef<number>(0);

  const px = prices.find((p) => p.symbol === symbol)?.price ?? 0;

  useEffect(() => {
    if (prev.current && px && px !== prev.current) setDir(px > prev.current ? "up" : "down");
    if (px) prev.current = px;
  }, [px]);

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
      setMsg(side === "buy" ? "Bought." : "Sold.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Trade failed");
    }
  }

  const line = sparkPoints(history[symbol] ?? []);

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Terminal</p>
        <h2>Buy low, sell high, pay tiny fees</h2>
        <div className="miu-split">
          <div className="miu-stagger">
            <label className="miu-label" htmlFor="miu-sym">
              Symbol
            </label>
            <select id="miu-sym" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="miu-input">
              {prices.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol} at {p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </option>
              ))}
            </select>
            <div className="miu-port" style={{ marginTop: 12 }}>
              <span className="miu-hero-head">Live price</span>
              <div style={{ fontSize: 30, fontFamily: "'IBM Plex Mono', monospace" }}>
                <span key={px} className={dir === "up" ? "miu-flash-up" : dir === "down" ? "miu-flash-down" : undefined}>
                  {px.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
              {line ? (
                <svg viewBox="0 0 100 64" className="miu-spark" preserveAspectRatio="none">
                  <polyline points={line} fill="none" stroke="#2447D6" strokeWidth="2" />
                </svg>
              ) : (
                <p className="miu-note">Chart builds as ticks arrive.</p>
              )}
            </div>
            <div className="miu-grid2">
              <div>
                <label className="miu-label" htmlFor="miu-buy">
                  MIU to spend
                </label>
                <input id="miu-buy" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} inputMode="decimal" className="miu-input" />
                <button type="button" className="miu-cta-c" onClick={() => void doTrade("buy")}>
                  Buy {symbol}
                </button>
              </div>
              <div>
                <label className="miu-label" htmlFor="miu-sell">
                  Shares to sell
                </label>
                <input id="miu-sell" value={sellQty} onChange={(e) => setSellQty(e.target.value)} inputMode="decimal" className="miu-input" />
                <button type="button" className="miu-cta-d" onClick={() => void doTrade("sell")}>
                  Sell {symbol}
                </button>
              </div>
            </div>
            <p className="miu-note">
              Fee 0.3 percent with rank discount. {msg}{" "}
              {!token ? (
                <Link to="/auth">Log in to trade.</Link>
              ) : null}
            </p>
          </div>
          <div>
            <h3>How buying works</h3>
            <p className="miu-sub">MIU converts into shares of the symbol you pick. Sell any time to convert back to MIU plus profit or minus loss.</p>
            <div className="miu-statgrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="miu-stat">
                <strong>{prices.length}</strong>
                <small>markets live</small>
              </div>
              <div className="miu-stat">
                <strong>0.3%</strong>
                <small>base fee</small>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
