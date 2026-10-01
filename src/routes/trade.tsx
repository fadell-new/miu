import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { miuTrade } from "@/lib/miu.functions";

export const Route = createFileRoute("/trade")({
  component: Trade,
});

type TF = { id: string; label: string; bucket: number; seed: number };
const TFS: TF[] = [
  { id: "15s", label: "15s", bucket: 15, seed: 60 },
  { id: "1m", label: "1m", bucket: 60, seed: 60 },
  { id: "5m", label: "5m", bucket: 300, seed: 60 },
  { id: "1h", label: "1h", bucket: 3600, seed: 48 },
];

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
type Level = { p: number; s: number };
type Print = { id: number; p: number; q: number; side: "b" | "s" };

const UP = "#22c55e";
const DOWN = "#a855f7";

function seedCandles(base: number, bucket: number, n: number): Candle[] {
  const nowB = Math.floor(Date.now() / 1000 / bucket) * bucket;
  const out: Candle[] = [];
  let c = base * 0.994;
  for (let i = n - 1; i >= 0; i--) {
    const t = nowB - i * bucket;
    const o = c;
    c = Math.max(base * 0.5, o + (Math.random() - 0.48) * base * 0.0016);
    out.push({
      t,
      o,
      h: Math.max(o, c) + Math.random() * base * 0.0006,
      l: Math.min(o, c) - Math.random() * base * 0.0006,
      c,
      v: 20 + Math.random() * 80,
    });
  }
  return out;
}

function maValues(closes: number[], k: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < k - 1) return null;
    let s = 0;
    for (let j = i - k + 1; j <= i; j++) s += closes[j];
    return s / k;
  });
}

function Trade() {
  const { token, prices } = useMiu();
  const [symbol, setSymbol] = useState("BTC");
  const [tf, setTf] = useState<TF>(TFS[1]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [book, setBook] = useState<{ asks: Level[]; bids: Level[] }>({ asks: [], bids: [] });
  const [tape, setTape] = useState<Print[]>([]);
  const [buyAmt, setBuyAmt] = useState("1000");
  const [sellQty, setSellQty] = useState("0.01");
  const [msg, setMsg] = useState("");
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  const px = prices.find((p) => p.symbol === symbol)?.price ?? 0;
  const liveRef = useRef(0);
  const printId = useRef(0);
  const seeded = useRef("");
  useEffect(() => {
    if (px) {
      if (!liveRef.current || px !== liveRef.current) setDir(px > liveRef.current && liveRef.current ? "up" : px < liveRef.current && liveRef.current ? "down" : null);
      liveRef.current = px;
    }
  }, [px]);

  useEffect(() => {
    const base = prices.find((p) => p.symbol === symbol)?.price;
    if (!base) return;
    const key = symbol + tf.id;
    if (seeded.current === key) return;
    seeded.current = key;
    setCandles(seedCandles(base, tf.bucket, tf.seed));
  }, [symbol, tf, prices]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const anchor = liveRef.current || prev[prev.length - 1].c;
        const p = anchor * (1 + (Math.random() - 0.5) * 0.0012);
        const tb = Math.floor(Date.now() / 1000 / tf.bucket) * tf.bucket;
        const last = prev[prev.length - 1];
        if (last.t === tb) {
          const u = { ...last, h: Math.max(last.h, p), l: Math.min(last.l, p), c: p, v: last.v + Math.random() * 4 };
          return [...prev.slice(0, -1), u];
        }
        const nc: Candle = { t: tb, o: last.c, h: Math.max(last.c, p), l: Math.min(last.c, p), c: p, v: 8 + Math.random() * 20 };
        return [...prev.slice(-89), nc];
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [symbol, tf]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const base = liveRef.current;
      if (!base) return;
      const mk = (down: boolean): Level[] =>
        Array.from({ length: 8 }, (_, i) => {
          const off = (i + 1) * base * 0.0004 * (0.7 + Math.random() * 0.6);
          return { p: down ? base - off : base + off, s: 0.1 + Math.random() * 4 };
        });
      setBook({ asks: mk(false).reverse(), bids: mk(true) });
      printId.current += 1;
      const side = Math.random() > 0.5 ? "b" : ("s" as const);
      const print: Print = { id: printId.current, p: base * (1 + (Math.random() - 0.5) * 0.0006), q: 0.01 + Math.random() * 2, side };
      setTape((t) => [print, ...t].slice(0, 14));
    }, 1800);
    return () => window.clearInterval(id);
  }, [symbol]);

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

  const vis = candles.slice(-60);
  const closes = candles.map((c) => c.c);
  const ma7 = maValues(closes, 7).slice(-60);
  const ma25 = maValues(closes, 25).slice(-60);
  const W = 720;
  const PH = 250;
  const VH = 52;
  const H = PH + 12 + VH;
  let min = Infinity;
  let max = -Infinity;
  for (const c of vis) {
    min = Math.min(min, c.l);
    max = Math.max(max, c.h);
  }
  if (!vis.length) {
    min = 0;
    max = 1;
  }
  const pad = (max - min) * 0.08 || 1;
  min -= pad;
  max += pad;
  const y = (v: number) => ((max - v) / (max - min)) * PH;
  const slot = vis.length ? W / vis.length : W;
  const maxV = Math.max(1, ...vis.map((c) => c.v));
  const line = (arr: (number | null)[]) =>
    arr
      .map((v, i) => (v == null ? null : `${((i / Math.max(1, arr.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const first = vis[0]?.o ?? 0;
  const lastC = vis.length ? vis[vis.length - 1].c : 0;
  const chg = first ? ((lastC - first) / first) * 100 : 0;
  const maxSize = Math.max(0.01, ...book.asks.map((a) => a.s), ...book.bids.map((b) => b.s));
  const spread = book.asks.length && book.bids.length ? book.asks[book.asks.length - 1].p - book.bids[0].p : 0;

  return (
    <SiteShell>
      <section className="miu-section" style={{ maxWidth: 1240 }}>
        <p className="miu-eyebrow">Terminal</p>
        <h2>{symbol} live terminal</h2>
        <div className="miu-termhead">
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="miu-input" style={{ maxWidth: 260 }} aria-label="Symbol">
            {prices.map((p) => (
              <option key={p.symbol} value={p.symbol}>
                {p.symbol} {p.name}
              </option>
            ))}
          </select>
          <div className="miu-tfrow">
            {TFS.map((t) => (
              <button key={t.id} type="button" className={t.id === tf.id ? "miu-tf on" : "miu-tf"} onClick={() => setTf(t)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="miu-termhead">
          <span className="miu-bigpx">
            <span key={Math.round(lastC * 100)} className={dir === "up" ? "miu-flash-up" : dir === "down" ? "miu-flash-down" : undefined}>
              {(px || lastC).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </span>
          <span className={chg >= 0 ? "miu-chg up" : "miu-chg down"}>
            {chg >= 0 ? "+" : ""}
            {chg.toFixed(2)}%
          </span>
        </div>

        <div className="miu-term">
          <div className="miu-chartcard">
            <div className="miu-termhead">
              <span className="miu-hero-head">Candles plus MA7 and MA25 plus volume</span>
              <span className="miu-hero-head">{tf.label} chart</span>
            </div>
            {vis.length < 2 ? (
              <p className="miu-note">Loading chart.</p>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="miu-candlechart" preserveAspectRatio="xMidYMid meet">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1="0" x2={W} y1={PH * f} y2={PH * f} stroke="#222a35" strokeWidth="1" />
                ))}
                <polyline points={line(ma25)} fill="none" stroke="#9aa3b2" strokeWidth="1.5" strokeDasharray="4 3" />
                <polyline points={line(ma7)} fill="none" stroke="#a855f7" strokeWidth="1.5" />
                {vis.map((c, i) => {
                  const up = c.c >= c.o;
                  const col = up ? UP : DOWN;
                  const x = slot * i + slot / 2;
                  const bw = Math.max(2, slot * 0.55);
                  return (
                    <g key={c.t}>
                      <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1.5" />
                      <rect x={x - bw / 2} y={Math.min(y(c.o), y(c.c))} width={bw} height={Math.max(1.5, Math.abs(y(c.o) - y(c.c)))} fill={col} rx="1" />
                      <rect x={x - bw / 2} y={PH + 12 + VH - (c.v / maxV) * VH} width={bw} height={Math.max(1, (c.v / maxV) * VH)} fill={col} opacity="0.5" rx="1" />
                    </g>
                  );
                })}
                <line x1="0" x2={W} y1={y(lastC)} y2={y(lastC)} stroke="#e8ebf0" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
                <text x={W - 4} y={y(lastC) - 5} textAnchor="end" fontSize="12" fill="#e8ebf0" fontFamily="'IBM Plex Mono', monospace">
                  {lastC.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>
              </svg>
            )}
          </div>

          <div className="miu-bookcard">
            <div className="miu-termhead">
              <span className="miu-hero-head">Order book</span>
            </div>
            {book.asks.map((a, i) => (
              <div key={"a" + i} className="miu-bookrow miu-askrow">
                <i style={{ width: `${Math.round((a.s / maxSize) * 100)}%` }} />
                <span>{a.p.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span>{a.s.toFixed(2)}</span>
              </div>
            ))}
            <div className="miu-spread">spread {spread.toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
            {book.bids.map((b, i) => (
              <div key={"b" + i} className="miu-bookrow miu-bidrow">
                <i style={{ width: `${Math.round((b.s / maxSize) * 100)}%` }} />
                <span>{b.p.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span>{b.s.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="miu-term" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="miu-tapecard">
            <div className="miu-termhead">
              <span className="miu-hero-head">Buy and sell</span>
            </div>
            <div className="miu-grid2">
              <div>
                <label className="miu-label" htmlFor="miu-buy">
                  MIU to spend
                </label>
                <input id="miu-buy" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} inputMode="decimal" className="miu-input" />
                <button type="button" className="miu-cta-c" style={{ background: "#16a34a", borderColor: "#16a34a" }} onClick={() => void doTrade("buy")}>
                  Buy {symbol}
                </button>
              </div>
              <div>
                <label className="miu-label" htmlFor="miu-sell">
                  Shares to sell
                </label>
                <input id="miu-sell" value={sellQty} onChange={(e) => setSellQty(e.target.value)} inputMode="decimal" className="miu-input" />
                <button type="button" className="miu-cta-c" style={{ background: "#9333ea", borderColor: "#9333ea" }} onClick={() => void doTrade("sell")}>
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
          <div className="miu-tapecard">
            <div className="miu-termhead">
              <span className="miu-hero-head">Tape</span>
            </div>
            {tape.length === 0 ? <p className="miu-note">Waiting for prints.</p> : null}
            {tape.map((t) => (
              <div key={t.id} className="miu-taperow">
                <span className={t.side === "b" ? "miu-up" : "miu-down"}>
                  {t.p.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span>{t.q.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
