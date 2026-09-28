import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth/denied")({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: search["reason"] === "invalid" ? "invalid" : "unauthorized",
  }),
  component: AccessDenied,
});

function AccessDenied() {
  const { reason } = Route.useSearch();
  const title = reason === "unauthorized" ? "Accesso non autorizzato" : "Accesso non completato";
  const description =
    reason === "unauthorized"
      ? "Questo account Google non è autorizzato ad accedere a Warranty Vault."
      : "Non è stato possibile completare l'accesso in modo sicuro. Riprova dalla pagina di accesso.";

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
          <h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-tight">{title}</h1>
          <p className="mt-4 max-w-[36ch] text-[14px] text-muted-foreground">{description}</p>
        </div>
        <div className="rise mt-auto pt-10" style={{ animationDelay: "80ms" }}>
          <div className="glass mb-3 flex items-start gap-3 rounded-2xl p-3.5 text-[13px] ring-1 ring-border">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-expired" aria-hidden />
            <span>La tua sessione non è stata creata.</span>
          </div>
          <Link
            to="/"
            className="flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-5 py-4 font-display text-[15px] font-medium text-background transition-transform active:scale-[0.99]"
          >
            <Lock className="size-4" aria-hidden /> Torna all'accesso
          </Link>
        </div>
      </div>
    </div>
  );
}
