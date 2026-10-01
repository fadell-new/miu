import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { miuLeaderboard, miuMe, miuPrices } from "@/lib/miu.functions";

export type MeInfo = {
  id: string;
  name: string;
  xp: number;
  rank: { name: string; capMiu: number | null };
  miu: number;
  total: number;
};

export type PriceInfo = { symbol: string; name: string; kind: string; price: number };
export type BoardRow = { name: string; rank: string; total: number };

type MiuCtx = {
  token: string | null;
  me: MeInfo | null;
  prices: PriceInfo[];
  history: Record<string, number[]>;
  board: BoardRow[];
  anim: boolean;
  setAnim: (v: boolean) => void;
  saveToken: (t: string | null) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<MiuCtx | null>(null);

export function useMiu(): MiuCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMiu outside provider");
  return v;
}

export function MiuProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [anim, setAnim] = useState(true);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    try {
      setToken(localStorage.getItem("miu_token"));
    } catch {
      return;
    }
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAnim(false);
    } catch {
      return;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await miuPrices({});
      setPrices(r.prices);
      setHistory((h) => {
        const next: Record<string, number[]> = { ...h };
        for (const p of r.prices) {
          const arr = next[p.symbol] ? [...next[p.symbol], p.price] : [p.price];
          next[p.symbol] = arr.slice(-40);
        }
        return next;
      });
    } catch {
      return;
    }
    try {
      const b = await miuLeaderboard({});
      setBoard(b.rows);
    } catch {
      return;
    }
    const tk = tokenRef.current;
    if (tk) {
      try {
        const m = await miuMe({ data: { token: tk } });
        setMe(m);
      } catch {
        setMe(null);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 12000);
    return () => window.clearInterval(id);
  }, [refresh, token]);

  const saveToken = useCallback((t: string | null) => {
    try {
      if (t) localStorage.setItem("miu_token", t);
      else localStorage.removeItem("miu_token");
    } catch {
      return;
    }
    setToken(t);
  }, []);

  const value = useMemo<MiuCtx>(
    () => ({ token, me, prices, history, board, anim, setAnim, saveToken, refresh }),
    [token, me, prices, history, board, anim, saveToken, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
