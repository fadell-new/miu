export type RankId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "elite"
  | "master"
  | "grandmaster"
  | "mythic"
  | "legend";

export type Rank = {
  id: RankId;
  name: string;
  capMiu: number | null;
  xpNeeded: number;
  feeDiscount: number;
  blurb: string;
};

export const RANKS: Rank[] = [
  { id: "bronze", name: "Bronze", capMiu: 200000, xpNeeded: 0, feeDiscount: 0, blurb: "Start with 100K MIU" },
  { id: "silver", name: "Silver", capMiu: 400000, xpNeeded: 200, feeDiscount: 0.1, blurb: "Fee minus 10 percent" },
  { id: "gold", name: "Gold", capMiu: 700000, xpNeeded: 600, feeDiscount: 0.2, blurb: "Unlock 5 min PvP" },
  { id: "platinum", name: "Platinum", capMiu: 1200000, xpNeeded: 1500, feeDiscount: 0.3, blurb: "Shop rare frames" },
  { id: "diamond", name: "Diamond", capMiu: 2000000, xpNeeded: 3000, feeDiscount: 0.4, blurb: "Tournament access" },
  { id: "elite", name: "Elite", capMiu: 5000000, xpNeeded: 6000, feeDiscount: 0.5, blurb: "Fee cut in half" },
  { id: "master", name: "Master", capMiu: 12000000, xpNeeded: 12000, feeDiscount: 0.6, blurb: "Master trader badge" },
  { id: "grandmaster", name: "Grandmaster", capMiu: 30000000, xpNeeded: 25000, feeDiscount: 0.7, blurb: "Top room creator" },
  { id: "mythic", name: "Mythic", capMiu: 80000000, xpNeeded: 50000, feeDiscount: 0.8, blurb: "Mythic glow profile" },
  { id: "legend", name: "MIU Legend", capMiu: null, xpNeeded: 100000, feeDiscount: 0.85, blurb: "No cap, forever" },
];

export function rankForXp(xp: number): Rank {
  let cur = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.xpNeeded) cur = r;
  }
  return cur;
}

export const START_MIU = 100000;
export const BASE_FEE = 0.003;

export const SYMBOLS = [
  { symbol: "BTC", name: "Bitcoin", kind: "crypto", base: 67000 },
  { symbol: "ETH", name: "Ethereum", kind: "crypto", base: 3500 },
  { symbol: "SOL", name: "Solana", kind: "crypto", base: 150 },
  { symbol: "AAPL", name: "Apple", kind: "stock", base: 220 },
  { symbol: "NVDA", name: "Nvidia", kind: "stock", base: 880 },
  { symbol: "TSLA", name: "Tesla", kind: "stock", base: 180 },
  { symbol: "GOLD", name: "Gold", kind: "metal", base: 2350 },
  { symbol: "EURUSD", name: "Euro FX", kind: "forex", base: 1.08 },
  { symbol: "MEME", name: "Meme Index", kind: "meme", base: 12 },
  { symbol: "MIUI", name: "MIU Index", kind: "index", base: 1000 },
];

export const SHOP_SEED = [
  { id: "frame-neon", name: "Neon Frame", kind: "frame", price_miu: 5000, perk: "Profile frame" },
  { id: "badge-bull", name: "Bull Badge", kind: "badge", price_miu: 8000, perk: "Showcase badge" },
  { id: "theme-cobalt", name: "Cobalt Theme", kind: "theme", price_miu: 12000, perk: "Terminal theme" },
  { id: "fee-pass", name: "Fee Pass 7d", kind: "boost", price_miu: 20000, perk: "Extra 20 percent fee off" },
];
