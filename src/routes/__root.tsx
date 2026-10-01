import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";

const SITE_URL = "https://miu-trade.vercel.app";

function NotFoundComponent() {
  return (
    <main className="miu">
      <section className="miu-section">
        <h2>Page not found</h2>
        <p className="miu-note">This page does not exist.</p>
        <a href="/" className="miu-cta-a">Back home</a>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  return (
    <main className="miu">
      <section className="miu-section">
        <h2>Something broke</h2>
        <p className="miu-note">Try again or go home.</p>
        <div className="miu-cta-row">
          <button type="button" className="miu-cta-c" onClick={reset}>Try again</button>
          <a href="/" className="miu-cta-b">Go home</a>
        </div>
      </section>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MIU Trade League" },
      { name: "description", content: "Paper trading sim with live prices, ranks, shop and PvP duels." },
      { name: "theme-color", content: "#2447D6" },
      { property: "og:title", content: "MIU Trade League" },
      { property: "og:description", content: "Paper trading sim with live prices, ranks, shop and PvP duels." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: SITE_URL + "/og-cover.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MIU Trade League" },
      { name: "twitter:description", content: "Paper trading sim with live prices, ranks, shop and PvP duels." },
      { name: "twitter:image", content: SITE_URL + "/og-cover.svg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
