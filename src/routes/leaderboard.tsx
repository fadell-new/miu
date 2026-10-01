import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";

export const Route = createFileRoute("/leaderboard")({
  component: Board,
});

function Board() {
  const { board } = useMiu();
  const top = board[0]?.total ?? 1;

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Season</p>
        <h2>Leaderboard by net worth</h2>
        <div className="miu-list miu-stagger">
          {board.map((b, i) => (
            <div key={b.name + i} className="miu-lrow" style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {i + 1}. {b.name} ({b.rank})
                </span>
                <span>{b.total.toLocaleString()} MIU</span>
              </div>
              <div className="miu-bar">
                <i style={{ width: `${Math.max(3, Math.round((b.total / top) * 100))}%` }} />
              </div>
            </div>
          ))}
          {board.length === 0 ? <p className="miu-note">No traders yet. Be the first.</p> : null}
        </div>
      </section>
    </SiteShell>
  );
}
