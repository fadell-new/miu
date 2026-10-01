import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { miuPvpClaim, miuPvpCreate, miuPvpJoin, miuPvpList } from "@/lib/miu.functions";

export const Route = createFileRoute("/arena")({
  component: Arena,
});

type Room = { id: string; symbol: string; stake: number; ends_at: string; status: string };

function Arena() {
  const { token, prices, refresh } = useMiu();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [dir, setDir] = useState<"up" | "down">("up");
  const [stake, setStake] = useState("500");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void miuPvpList({})
      .then((r) => setRooms(r.rooms))
      .catch(() => undefined);
  }, []);

  async function reload() {
    const r = await miuPvpList({}).catch(() => null);
    if (r) setRooms(r.rooms);
    await refresh();
  }

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">PvP</p>
        <h2>Duel on direction</h2>
        <div className="miu-bento miu-stagger">
          <div className="miu-cell">
            <h3>Start a duel</h3>
            <label className="miu-label" htmlFor="arena-sym">
              Symbol
            </label>
            <select id="arena-sym" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="miu-input">
              {prices.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol}
                </option>
              ))}
            </select>
            <div className="miu-grid2">
              <div>
                <label className="miu-label" htmlFor="arena-dir">
                  You call
                </label>
                <select id="arena-dir" value={dir} onChange={(e) => setDir(e.target.value as "up" | "down")} className="miu-input">
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </div>
              <div>
                <label className="miu-label" htmlFor="arena-stake">
                  Stake MIU
                </label>
                <input id="arena-stake" value={stake} onChange={(e) => setStake(e.target.value)} inputMode="numeric" className="miu-input" />
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
                void miuPvpCreate({ data: { token, symbol, direction: dir, stake: Number(stake), minutes: 1 } })
                  .then(() => {
                    setMsg("Room open for 1 minute.");
                    void reload();
                  })
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
                <span>
                  {r.symbol} {r.stake} MIU
                </span>
                <button
                  type="button"
                  className="miu-mini"
                  onClick={() => {
                    if (!token) {
                      setMsg("Login first.");
                      return;
                    }
                    void miuPvpJoin({ data: { token, roomId: r.id, direction: dir } })
                      .then(() => {
                        setMsg("Joined. Good luck.");
                        void reload();
                      })
                      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Join failed"));
                  }}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="miu-port" style={{ marginTop: 12 }}>
          <h3>Settle</h3>
          <p className="miu-note">Claim after the timer ends. Winners split the pot minus 4 percent.</p>
          {rooms.map((r) => (
            <div key={"c" + r.id} className="miu-prow">
              <span>
                {r.id.slice(0, 6)} {r.status}
              </span>
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
        <p className="miu-note">
          {msg}{" "}
          {!token ? (
            <Link to="/auth">Log in to duel.</Link>
          ) : null}
        </p>
      </section>
    </SiteShell>
  );
}
