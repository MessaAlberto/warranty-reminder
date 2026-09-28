import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { getCurrentUserServerFn } from "@/auth/auth-functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (await getCurrentUserServerFn()) throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Warranty Vault — scontrini e garanzie di casa" },
      {
        name: "description",
        content:
          "Uno spazio privato condiviso per conservare scontrini e tenere sotto controllo le garanzie.",
      },
      { property: "og:title", content: "Warranty Vault — scontrini e garanzie di casa" },
      {
        property: "og:description",
        content:
          "Uno spazio privato condiviso per conservare scontrini e tenere sotto controllo le garanzie.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const [busy, setBusy] = useState(false);

  const handle = () => {
    setBusy(true);
    window.location.assign("/auth/start");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="sweep absolute -top-16 -right-10 h-72 w-72 rounded-full bg-accent/12 blur-2xl" />
        <div className="sweep absolute bottom-10 -left-16 h-80 w-80 rounded-full bg-accent/6 blur-2xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="rise">
          <div className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-accent">
            <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Warranty Vault
          </p>
          <h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-tight">
            Gli scontrini di casa,
            <br />
            al sicuro fino alla scadenza.
          </h1>
          <p className="mt-4 max-w-[36ch] text-[14px] text-muted-foreground">
            Fotografa lo scontrino, lascia che i dati vengano riconosciuti e tieni sotto controllo
            quanto manca a ogni garanzia.
          </p>
        </div>

        <ul className="rise mt-10 space-y-2" style={{ animationDelay: "80ms" }}>
          {[
            "Riconoscimento automatico di negozio, data e prodotti",
            "Garanzia di 24 mesi assegnata di default, modificabile",
            "Gli scontrini si aprono solo quando servono davvero",
          ].map((t) => (
            <li
              key={t}
              className="glass flex items-start gap-3 rounded-2xl p-3.5 text-[13px] ring-1 ring-border"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10">
          <button
            onClick={handle}
            disabled={busy}
            className="flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-5 py-4 font-display text-[15px] font-medium text-background transition-transform active:scale-[0.99] disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Accesso in corso…
              </>
            ) : (
              <>
                <GoogleMark /> Continua con Google
              </>
            )}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12px] text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            Spazio privato condiviso tra due persone.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span
      aria-hidden
      className="grid size-5 place-items-center rounded-full bg-background font-display text-[12px] font-bold text-foreground"
    >
      G
    </span>
  );
}
