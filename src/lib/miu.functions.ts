import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db.server";
import { BASE_FEE, SHOP_SEED, START_MIU, SYMBOLS, rankForXp } from "./miu-ranks";

function uid(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

async function hashPass(pw: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + "::" + pw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Db = {
  prepare: (q: string) => {
    bind: (...v: unknown[]) => {
      first: <T>() => Promise<T | null>;
      all: <T>() => Promise<{ results: T[] }>;
      run: () => Promise<unknown>;
    };
    first: <T>() => Promise<T | null>;
    all: <T>() => Promise<{ results: T[] }>;
  };
};

async function ensureSeed(DB: Db) {
  for (const s of SYMBOLS) {
    await DB.prepare("INSERT INTO symbols(symbol,name,kind,base_price) VALUES(?,?,?,?) ON CONFLICT(symbol) DO NOTHING")
      .bind(s.symbol, s.name, s.kind, s.base)
      .run();
  }
  for (const it of SHOP_SEED) {
    await DB.prepare("INSERT INTO shop_items(id,name,kind,price_miu,perk) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING")
      .bind(it.id, it.name, it.kind, it.price_miu, it.perk)
      .run();
  }
}

async function sessionUser(DB: Db, token: string) {
  const s = await DB.prepare("SELECT user_id, expires_at FROM sessions WHERE id=?")
    .bind(token)
    .first<{ user_id: string; expires_at: string }>();
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) return null;
  const u = await DB.prepare("SELECT id,email,display_name,xp FROM users WHERE id=?")
    .bind(s.user_id)
    .first<{ id: string; email: string; display_name: string; xp: number }>();
  return u;
}

function synthPrice(symbol: string, base: number): number {
  const t = Date.now() / 1000;
  let h = 0;
  for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) % 1000;
  const w = 0.028 * Math.sin(t / 97 + h) + 0.012 * Math.sin(t / 23 + h * 2) + 0.006 * Math.sin(t / 7 + h);
  const drift = 0.02 * Math.sin(t / 900 + h);
  return Math.max(base * 0.2, base * (1 + w + drift));
}

async function livePrice(DB: Db, symbol: string, base: number): Promise<{ price: number; cached: boolean }> {
  const row = await DB.prepare("SELECT price, updated_at FROM price_cache WHERE symbol=?")
    .bind(symbol)
    .first<{ price: number; updated_at: string }>();
  const age = row ? Date.now() - new Date(row.updated_at).getTime() : 1e9;
  const ttl = symbol === "BTC" || symbol === "ETH" || symbol === "SOL" ? 15000 : 60000;
  if (row && age < ttl) return { price: row.price, cached: true };
  let px = synthPrice(symbol, base);
  try {
    if (symbol === "BTC" || symbol === "ETH" || symbol === "SOL") {
      const map: Record<string, string> = { BTC: "BTCUSDT", ETH: "ETHUSDT", SOL: "SOLUSDT" };
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${map[symbol]}`);
      if (r.ok) {
        const j = (await r.json()) as { price: string };
        const v = Number(j.price);
        if (Number.isFinite(v) && v > 0) px = v;
      }
    } else if (symbol === "AAPL" || symbol === "NVDA" || symbol === "TSLA") {
      const q = symbol.toLowerCase() + ".us";
      const r = await fetch(`https://stooq.com/q/l/?s=${q}&f=sd2t2ohlcv&h&e=csv`);
      if (r.ok) {
        const txt = await r.text();
        const line = txt.trim().split("\n").pop() ?? "";
        const parts = line.split(",");
        const close = Number(parts[6]);
        if (Number.isFinite(close) && close > 0) px = close;
      }
    } else if (symbol === "EURUSD") {
      const r = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD");
      if (r.ok) {
        const j = (await r.json()) as { rates: { USD: number } };
        if (j.rates?.USD) px = j.rates.USD;
      }
    }
  } catch {
    px = synthPrice(symbol, base);
  }
  await DB.prepare("INSERT INTO price_cache(symbol,price,updated_at) VALUES(?,?,NOW()) ON CONFLICT(symbol) DO UPDATE SET price=EXCLUDED.price, updated_at=NOW()")
    .bind(symbol, px)
    .run();
  return { price: px, cached: false };
}

async function allPrices(DB: Db) {
  await ensureSeed(DB);
  const rows = await DB.prepare("SELECT symbol,name,kind,base_price FROM symbols").all<{
    symbol: string;
    name: string;
    kind: string;
    base_price: number;
  }>();
  const list = rows.results.length ? rows.results : SYMBOLS.map((s) => ({ symbol: s.symbol, name: s.name, kind: s.kind, base_price: s.base }));
  const out: { symbol: string; name: string; kind: string; price: number }[] = [];
  for (const r of list) {
    const p = await livePrice(DB, r.symbol, r.base_price);
    out.push({ symbol: r.symbol, name: r.name, kind: r.kind, price: p.price });
  }
  return out;
}

async function netWorth(DB: Db, userId: string, prices: { symbol: string; price: number }[]) {
  const w = await DB.prepare("SELECT miu FROM wallets WHERE user_id=?").bind(userId).first<{ miu: number }>();
  const h = await DB.prepare("SELECT symbol, qty FROM holdings WHERE user_id=?").bind(userId).all<{ symbol: string; qty: number }>();
  const pm = new Map(prices.map((p) => [p.symbol, p.price]));
  let hold = 0;
  for (const r of h.results) hold += (pm.get(r.symbol) ?? 0) * r.qty;
  return { miu: w?.miu ?? 0, hold, total: (w?.miu ?? 0) + hold };
}

export const miuRegister = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(2).max(24) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    await ensureSeed(DB);
    const exists = await DB.prepare("SELECT id FROM users WHERE email=?").bind(data.email.toLowerCase()).first<{ id: string }>();
    if (exists) throw new Error("Email already used");
    const id = uid();
    const salt = uid();
    const pass_hash = (await hashPass(data.password, salt)) + "." + salt;
    await DB.prepare("INSERT INTO users(id,email,pass_hash,display_name,xp) VALUES(?,?,?, ?,0)").bind(id, data.email.toLowerCase(), pass_hash, data.name).run();
    await DB.prepare("INSERT INTO wallets(user_id,miu) VALUES(?,?)").bind(id, START_MIU).run();
    const token = uid();
    const exp = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(token, id, exp).run();
    return { token, name: data.name };
  });

export const miuLogin = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    await ensureSeed(DB);
    const u = await DB.prepare("SELECT id,pass_hash,display_name FROM users WHERE email=?").bind(data.email.toLowerCase()).first<{ id: string; pass_hash: string; display_name: string }>();
    if (!u) throw new Error("Wrong email or password");
    const [h, salt] = u.pass_hash.split(".");
    if (!salt || (await hashPass(data.password, salt)) !== h) throw new Error("Wrong email or password");
    const token = uid();
    const exp = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(token, u.id, exp).run();
    return { token, name: u.display_name };
  });

export const miuMe = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    await ensureSeed(db);
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Session expired");
    const prices = await allPrices(db);
    const nw = await netWorth(db, u.id, prices);
    const rank = rankForXp(u.xp);
    return { id: u.id, email: u.email, name: u.display_name, xp: u.xp, rank, miu: Math.round(nw.miu), hold: Math.round(nw.hold), total: Math.round(nw.total) };
  });

export const miuPrices = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const DB = getDb();
    const prices = await allPrices(DB);
    return { prices, ts: Date.now() };
  });

export const miuTrade = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), symbol: z.string().min(1), side: z.enum(["buy", "sell"]), amount: z.number().positive().max(100000000) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    await ensureSeed(db);
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const sym = await db.prepare("SELECT base_price FROM symbols WHERE symbol=?").bind(data.symbol).first<{ base_price: number }>();
    if (!sym) throw new Error("Unknown symbol");
    const { price } = await livePrice(db, data.symbol, sym.base_price);
    const prices = await allPrices(db);
    const nw = await netWorth(db, u.id, prices);
    const rank = rankForXp(u.xp);
    if (rank.capMiu != null && nw.total >= rank.capMiu && data.side === "buy") {
      throw new Error(`Cap reached at ${rank.name}. Need ${rank.xpNeeded} XP path: earn XP to rank up.`);
    }
    const feeRate = BASE_FEE * (1 - rank.feeDiscount);
    if (data.side === "buy") {
      const spend = Math.floor(data.amount);
      if (spend > nw.miu) throw new Error("Not enough MIU");
      const fee = Math.floor(spend * feeRate);
      const qty = (spend - fee) / price;
      if (qty <= 0) throw new Error("Amount too small");
      const cur = await db.prepare("SELECT qty, avg_price FROM holdings WHERE user_id=? AND symbol=?").bind(u.id, data.symbol).first<{ qty: number; avg_price: number }>();
      const nq = (cur?.qty ?? 0) + qty;
      const na = cur ? (cur.avg_price * cur.qty + price * qty) / nq : price;
      await db.prepare("UPDATE wallets SET miu=miu-?, updated_at=NOW() WHERE user_id=?").bind(spend, u.id).run();
      await db.prepare("INSERT INTO holdings(user_id,symbol,qty,avg_price,updated_at) VALUES(?,?,?,?,NOW()) ON CONFLICT(user_id,symbol) DO UPDATE SET qty=EXCLUDED.qty, avg_price=EXCLUDED.avg_price, updated_at=NOW()").bind(u.id, data.symbol, nq, na).run();
      await db.prepare("INSERT INTO orders(id,user_id,symbol,side,qty,price,fee) VALUES(?,?,?,?,?,?,?)").bind(uid(), u.id, data.symbol, "buy", qty, price, fee).run();
      await db.prepare("UPDATE users SET xp=xp+? WHERE id=?").bind(5 + Math.floor(spend / 2000), u.id).run();
      return { ok: true, qty, price, fee };
    } else {
      const cur = await db.prepare("SELECT qty FROM holdings WHERE user_id=? AND symbol=?").bind(u.id, data.symbol).first<{ qty: number }>();
      if (!cur || cur.qty < data.amount) throw new Error("Not enough shares");
      const gross = data.amount * price;
      const fee = Math.floor(gross * feeRate);
      const gain = Math.floor(gross - fee);
      await db.prepare("UPDATE holdings SET qty=qty-?, updated_at=NOW() WHERE user_id=? AND symbol=?").bind(data.amount, u.id, data.symbol).run();
      await db.prepare("UPDATE wallets SET miu=miu+?, updated_at=NOW() WHERE user_id=?").bind(gain, u.id).run();
      await db.prepare("INSERT INTO orders(id,user_id,symbol,side,qty,price,fee) VALUES(?,?,?,?,?,?,?)").bind(uid(), u.id, data.symbol, "sell", data.amount, price, fee).run();
      await db.prepare("UPDATE users SET xp=xp+? WHERE id=?").bind(5 + Math.floor(gain / 2000), u.id).run();
      return { ok: true, gain, price, fee };
    }
  });

export const miuPortfolio = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const prices = await allPrices(db);
    const pm = new Map(prices.map((p) => [p.symbol, p.price]));
    const h = await db.prepare("SELECT symbol, qty, avg_price FROM holdings WHERE user_id=?").bind(u.id).all<{ symbol: string; qty: number; avg_price: number }>();
    const rows = h.results.filter((r) => r.qty > 0.000001).map((r) => {
      const px = pm.get(r.symbol) ?? r.avg_price;
      return { ...r, price: px, value: px * r.qty, pnl: (px - r.avg_price) * r.qty };
    });
    const nw = await netWorth(db, u.id, prices);
    return { rows, miu: nw.miu, total: nw.total };
  });

export const miuLeaderboard = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const prices = await allPrices(db);
    const pm = new Map(prices.map((p) => [p.symbol, p.price]));
    const users = await db.prepare("SELECT id, display_name, xp FROM users ORDER BY xp DESC LIMIT 50").all<{ id: string; display_name: string; xp: number }>();
    const out: { name: string; rank: string; total: number; xp: number }[] = [];
    for (const u of users.results) {
      const w = await db.prepare("SELECT miu FROM wallets WHERE user_id=?").bind(u.id).first<{ miu: number }>();
      const h = await db.prepare("SELECT symbol, qty FROM holdings WHERE user_id=?").bind(u.id).all<{ symbol: string; qty: number }>();
      let hold = 0;
      for (const r of h.results) hold += (pm.get(r.symbol) ?? 0) * r.qty;
      const total = Math.round((w?.miu ?? 0) + hold);
      out.push({ name: u.display_name, rank: rankForXp(u.xp).name, total, xp: u.xp });
    }
    out.sort((a, b) => b.total - a.total);
    return { rows: out.slice(0, 20) };
  });

export const miuShopBuy = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), itemId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const item = SHOP_SEED.find((i) => i.id === data.itemId);
    if (!item) throw new Error("No item");
    const w = await db.prepare("SELECT miu FROM wallets WHERE user_id=?").bind(u.id).first<{ miu: number }>();
    if (!w || w.miu < item.price_miu) throw new Error("Not enough MIU");
    await db.prepare("UPDATE wallets SET miu=miu-?, updated_at=NOW() WHERE user_id=?").bind(item.price_miu, u.id).run();
    await db.prepare("INSERT INTO inventory(user_id,item_id) VALUES(?,?) ON CONFLICT(user_id,item_id) DO NOTHING").bind(u.id, item.id).run();
    return { ok: true };
  });

export const miuPvpCreate = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), symbol: z.string(), direction: z.enum(["up", "down"]), stake: z.number().int().min(100).max(100000), minutes: z.number().int().min(1).max(15) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const w = await db.prepare("SELECT miu FROM wallets WHERE user_id=?").bind(u.id).first<{ miu: number }>();
    if (!w || w.miu < data.stake) throw new Error("Not enough MIU");
    const sym = await db.prepare("SELECT base_price FROM symbols WHERE symbol=?").bind(data.symbol).first<{ base_price: number }>();
    if (!sym) throw new Error("Unknown symbol");
    const { price } = await livePrice(db, data.symbol, sym.base_price);
    const id = uid();
    const ends = new Date(Date.now() + data.minutes * 60000).toISOString();
    await db.prepare("UPDATE wallets SET miu=miu-?, updated_at=NOW() WHERE user_id=?").bind(data.stake, u.id).run();
    await db.prepare("INSERT INTO pvp_rooms(id,symbol,creator_id,stake,direction,start_price,ends_at,mode,status) VALUES(?,?,?,?,?,?,?,'duel','open')").bind(id, data.symbol, u.id, data.stake, data.direction, price, ends).run();
    await db.prepare("INSERT INTO pvp_entries(room_id,user_id,direction) VALUES(?,?,?)").bind(id, u.id, data.direction).run();
    return { id };
  });

export const miuPvpList = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const rows = await db.prepare("SELECT id,symbol,stake,direction,ends_at,status FROM pvp_rooms ORDER BY created_at DESC LIMIT 20").all<{ id: string; symbol: string; stake: number; direction: string; ends_at: string; status: string }>();
    return { rooms: rows.results };
  });

export const miuPvpJoin = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), roomId: z.string().min(1), direction: z.enum(["up", "down"]) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const room = await db.prepare("SELECT stake,status,creator_id FROM pvp_rooms WHERE id=?").bind(data.roomId).first<{ stake: number; status: string; creator_id: string }>();
    if (!room || room.status !== "open") throw new Error("Room closed");
    if (room.creator_id === u.id) throw new Error("Cannot join own room");
    const w = await db.prepare("SELECT miu FROM wallets WHERE user_id=?").bind(u.id).first<{ miu: number }>();
    if (!w || w.miu < room.stake) throw new Error("Not enough MIU");
    await db.prepare("UPDATE wallets SET miu=miu-?, updated_at=NOW() WHERE user_id=?").bind(room.stake, u.id).run();
    await db.prepare("INSERT INTO pvp_entries(room_id,user_id,direction) VALUES(?,?,?) ON CONFLICT(room_id,user_id) DO NOTHING").bind(data.roomId, u.id, data.direction).run();
    await db.prepare("UPDATE pvp_rooms SET status='filled' WHERE id=?").bind(data.roomId).run();
    return { ok: true };
  });

export const miuPvpClaim = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), roomId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const DB = getDb();
    const db = DB as unknown as Db;
    const u = await sessionUser(db, data.token);
    if (!u) throw new Error("Login first");
    const room = await db.prepare("SELECT symbol,stake,start_price,ends_at,status FROM pvp_rooms WHERE id=?").bind(data.roomId).first<{ symbol: string; stake: number; start_price: number; ends_at: string; status: string }>();
    if (!room) throw new Error("No room");
    if (new Date(room.ends_at).getTime() > Date.now()) throw new Error("Not ended yet");
    if (room.status === "done") return { ok: false, msg: "Settled" };
    const sym = await db.prepare("SELECT base_price FROM symbols WHERE symbol=?").bind(room.symbol).first<{ base_price: number }>();
    const { price: end } = await livePrice(db, room.symbol, sym?.base_price ?? 100);
    const actual = end >= room.start_price ? "up" : "down";
    const entries = await db.prepare("SELECT user_id, direction FROM pvp_entries WHERE room_id=?").bind(data.roomId).all<{ user_id: string; direction: string }>();
    const winners = entries.results.filter((e) => e.direction === actual);
    const pot = room.stake * entries.results.length;
    const payout = winners.length ? Math.floor((pot * 0.96) / winners.length) : 0;
    for (const win of winners) {
      await db.prepare("UPDATE wallets SET miu=miu+?, updated_at=NOW() WHERE user_id=?").bind(payout, win.user_id).run();
      await db.prepare("UPDATE users SET xp=xp+50 WHERE id=?").bind(win.user_id).run();
    }
    await db.prepare("UPDATE pvp_rooms SET status='done', winner_id=? WHERE id=?").bind(winners[0]?.user_id ?? null, data.roomId).run();
    return { ok: true, actual, payout, won: winners.some((x) => x.user_id === u.id) };
  });
