import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site";
import { useMiu } from "@/lib/miu-client";
import { miuLogin, miuRegister } from "@/lib/miu.functions";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  const { token, me, saveToken, refresh } = useMiu();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");

  async function doRegister() {
    setMsg("");
    try {
      const r = await miuRegister({ data: { email, password: pass, name: nick || email.split("@")[0] } });
      saveToken(r.token);
      await refresh();
      setMsg("Account ready. 100K MIU added.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Register failed");
    }
  }

  async function doLogin() {
    setMsg("");
    try {
      const r = await miuLogin({ data: { email, password: pass } });
      saveToken(r.token);
      await refresh();
      setMsg("Welcome back.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <SiteShell>
      <section className="miu-section">
        <p className="miu-eyebrow">Wallet</p>
        <h2>{me ? `Playing as ${me.name}` : "Log in to your wallet"}</h2>
        <div className="miu-authcard miu-stagger">
          {me ? (
            <div>
              <div className="miu-statgrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="miu-stat">
                  <strong>{me.miu.toLocaleString()}</strong>
                  <small>MIU cash</small>
                </div>
                <div className="miu-stat">
                  <strong>{me.total.toLocaleString()}</strong>
                  <small>net worth</small>
                </div>
              </div>
              <p className="miu-note">
                Rank {me.rank.name} with {me.xp} XP.
              </p>
              <button
                type="button"
                className="miu-cta-d"
                onClick={() => {
                  saveToken(null);
                  setMsg("Logged out on this device.");
                }}
              >
                Log out
              </button>
              <p className="miu-note">{msg}</p>
            </div>
          ) : (
            <div>
              <div className="miu-grid2">
                <div>
                  <label className="miu-label" htmlFor="miu-email">
                    Email
                  </label>
                  <input id="miu-email" value={email} onChange={(e) => setEmail(e.target.value)} className="miu-input" autoComplete="email" />
                </div>
                <div>
                  <label className="miu-label" htmlFor="miu-pass">
                    Password
                  </label>
                  <input id="miu-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="miu-input" autoComplete="current-password" />
                </div>
              </div>
              <label className="miu-label" htmlFor="miu-nick">
                Display name for register
              </label>
              <input id="miu-nick" value={nick} onChange={(e) => setNick(e.target.value)} className="miu-input" />
              <div className="miu-cta-row">
                <button type="button" className="miu-cta-a" onClick={() => void doRegister()}>
                  Create wallet
                </button>
                <button type="button" className="miu-cta-b" onClick={() => void doLogin()}>
                  Log in
                </button>
              </div>
              <p className="miu-note">New wallets start with 100,000 MIU. {msg || (token ? "" : "")}</p>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
