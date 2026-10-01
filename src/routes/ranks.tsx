import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { RANKS, rankForXp } from "@/lib/miu-ranks";

export const Route = createFileRoute("/ranks")({
  component: Ranks,
});

function Ranks() {
  const { me } = useMiu();
  const cur = me ? rankForXp(me.xp) : RANKS[0];
  const idx = RANKS.findIndex((r) => r.id === cur.id);
  const next = RANKS[idx + 1];
  const pct = next ? Math.min(100, Math.round(((me?.xp ?? 0) / next.xpNeeded) * 100)) : 100;

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Progression</p>
        <h2>Ten ranks from Bronze to Legend</h2>
        {me ? (
          <div className="miu-port" style={{ marginBottom: 14 }}>
            <span>
              You are <strong>{cur.name}</strong> with {me.xp} XP
            </span>
            <div className="miu-bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <small className="miu-note">{next ? `${next.xpNeeded - me.xp} XP to ${next.name}` : "Max rank reached."}</small>
          </div>
        ) : (
          <p className="miu-note">Log in to track your climb.</p>
        )}
        <div className="miu-rankgrid miu-stagger">
          {RANKS.map((r) => (
            <div key={r.id} className="miu-rank" style={r.id === cur.id && me ? { borderColor: "#a855f7" } : undefined}>
              <strong>{r.name}</strong>
              <span>{r.capMiu == null ? "No cap" : `${r.capMiu.toLocaleString()} cap`}</span>
              <small>
                {r.xpNeeded} XP. Fee off {Math.round(r.feeDiscount * 100)} percent. {r.blurb}.
              </small>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
