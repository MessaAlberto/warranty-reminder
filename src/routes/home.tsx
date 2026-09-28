import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PackageOpen } from "lucide-react";
import { AppShell } from "@/components/vault/AppShell";
import { EmptyState } from "@/components/vault/EmptyState";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { SkeletonList } from "@/components/vault/Skeletons";
import { WarrantyCard } from "@/components/vault/WarrantyCard";
import { VaultButton } from "@/components/vault/controls";
import { useVault } from "@/lib/vault-store";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { daysLeft, statusOf } from "@/lib/warranty";

export const Route = createFileRoute("/home")({
  beforeLoad: requireAuthenticatedRoute,
  head: () => ({
    meta: [
      { title: "Le tue garanzie — Warranty Vault" },
      {
        name: "description",
        content:
          "Tutte le garanzie attive, quelle in scadenza e il valore degli acquisti protetti.",
      },
      { property: "og:title", content: "Le tue garanzie — Warranty Vault" },
      {
        property: "og:description",
        content:
          "Tutte le garanzie attive, quelle in scadenza e il valore degli acquisti protetti.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { receipts, loading, user } = useVault();

  const stats = useMemo(() => {
    const products = receipts.flatMap((r) => r.products);
    const active = products.filter((p) => statusOf(p) !== "expired");
    const soon = products.filter((p) => {
      const d = daysLeft(p.warrantyExpiration);
      return d > 0 && d <= 183;
    });
    const total = active.reduce((s, p) => s + p.price, 0);
    return { active: active.length, soon: soon.length, total };
  }, [receipts]);

  const sorted = useMemo(
    () =>
      [...receipts].sort((a, b) => {
        const ea = a.products[0]?.warrantyExpiration ?? "";
        const eb = b.products[0]?.warrantyExpiration ?? "";
        return ea.localeCompare(eb);
      }),
    [receipts],
  );

  return (
    <AppShell>
      <header className="rise relative z-10 flex items-start justify-between px-5 pt-6 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Ciao, {user?.name}
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-none tracking-tight">
            Le tue garanzie
          </h1>
        </div>
        <Link
          to="/settings"
          aria-label="Impostazioni e profilo"
          className="grid size-10 place-items-center rounded-full bg-surface font-display text-[13px] font-bold ring-1 ring-border"
        >
          {user?.initials}
        </Link>
      </header>

      <section className="rise relative z-10 px-5" style={{ animationDelay: "80ms" }}>
        <div className="glass grid grid-cols-2 rounded-2xl p-4 ring-1 ring-border">
          <div className="text-center">
            <p className="font-display text-2xl leading-none tracking-tight">{stats.active}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Attive
            </p>
          </div>
          <div className="border-l border-border text-center">
            <p className="font-display text-2xl leading-none tracking-tight text-expiring">
              {stats.soon}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              In scadenza
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-4 space-y-3 px-5 pb-32">
        {loading ? (
          <SkeletonList />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Qui compariranno le tue garanzie"
            description="Fotografa uno scontrino: i dati vengono riconosciuti e la garanzia parte da 24 mesi."
            action={
              <Link to="/add">
                <VaultButton variant="accent">Aggiungi il primo acquisto</VaultButton>
              </Link>
            }
          />
        ) : (
          <>
            {stats.soon > 0 ? (
              <NoticeBanner
                tone="expiring"
                title="Garanzie in scadenza"
                description={`${stats.soon} ${stats.soon === 1 ? "prodotto ha" : "prodotti hanno"} meno di 6 mesi di copertura.`}
              />
            ) : (
              <NoticeBanner
                tone="info"
                title="Tutto tranquillo"
                description="Nessuna garanzia in scadenza nei prossimi sei mesi."
              />
            )}
            {sorted.map((r, i) => (
              <WarrantyCard key={r.id} receipt={r} delay={120 + i * 60} />
            ))}
          </>
        )}
      </section>
    </AppShell>
  );
}
