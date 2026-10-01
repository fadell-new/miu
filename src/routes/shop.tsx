import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { SHOP_SEED } from "@/lib/miu-ranks";
import { miuShopBuy } from "@/lib/miu.functions";

export const Route = createFileRoute("/shop")({
  component: Shop,
});

function Shop() {
  const { token, refresh } = useMiu();
  const [msg, setMsg] = useState("");

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Show off</p>
        <h2>Spend MIU, flex harder</h2>
        <div className="miu-bento miu-stagger">
          {SHOP_SEED.map((s) => (
            <div key={s.id} className="miu-cell">
              <h3>{s.name}</h3>
              <p className="miu-note">
                {s.kind} {s.perk ? `plus ${s.perk.toLowerCase()}` : ""}.
              </p>
              <div className="miu-prow">
                <span>{s.price_miu.toLocaleString()} MIU</span>
                <button
                  type="button"
                  className="miu-mini"
                  onClick={() => {
                    if (!token) {
                      setMsg("Login first.");
                      return;
                    }
                    void miuShopBuy({ data: { token, itemId: s.id } })
                      .then(() => {
                        setMsg(`Bought ${s.name}.`);
                        void refresh();
                      })
                      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Shop failed"));
                  }}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="miu-note">
          {msg}{" "}
          {!token ? (
            <Link to="/auth">Log in to shop.</Link>
          ) : null}
        </p>
      </section>
    </SiteShell>
  );
}
