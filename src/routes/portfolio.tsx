import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { miuPortfolio } from "@/lib/miu.functions";

export const Route = createFileRoute("/portfolio")({
  component: Portfolio,
});

type Row = { symbol: string; qty: number; price: number; value: number; pnl: number };

function Portfolio() {
  const { token } = useMiu();
  const [rows, setRows] = useState<Row[]>([]);
  const [miu, setMiu] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!token) return;
    void miuPortfolio({ data: { token } })
      .then((p) => {
        setRows(p.rows);
        setMiu(p.miu);
        setTotal(p.total);
      })
      .catch(() => undefined);
  }, [token]);

  if (!token) {
    return (
      <SiteShell>
        <section className="miu-section">
          <h2>Portfolio needs a wallet</h2>
          <p className="miu-sub">
            <Link to="/auth">Log in</Link> to see your holdings.
          </p>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Holdings</p>
        <h2>Your portfolio</h2>
        <div className="miu-statgrid miu-stagger">
          <div className="miu-stat">
            <strong>{Math.round(miu).toLocaleString()}</strong>
            <small>MIU cash</small>
          </div>
          <div className="miu-stat">
            <strong>{Math.round(total).toLocaleString()}</strong>
            <small>net worth</small>
          </div>
          <div className="miu-stat">
            <strong>{rows.length}</strong>
            <small>positions</small>
          </div>
        </div>
        <div className="miu-port miu-stagger" style={{ marginTop: 14 }}>
          {rows.length === 0 ? (
            <p className="miu-note">
              Empty. <Link to="/trade">Buy BTC or AAPL</Link> to start.
            </p>
          ) : (
            <table className="miu-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Value</th>
                  <th>P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol}>
                    <td>{r.symbol}</td>
                    <td>{r.qty.toFixed(4)}</td>
                    <td>{Math.round(r.value).toLocaleString()} MIU</td>
                    <td className={r.pnl >= 0 ? "miu-up" : "miu-down"}>
                      {r.pnl >= 0 ? "+" : ""}
                      {r.pnl.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
