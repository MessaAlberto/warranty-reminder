import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { AppShell } from "@/components/vault/AppShell";
import { EmptyState } from "@/components/vault/EmptyState";
import { FilterChips, type FilterOption } from "@/components/vault/FilterChips";
import { PageHeader } from "@/components/vault/PageHeader";
import { SearchBar } from "@/components/vault/SearchBar";
import { SkeletonList } from "@/components/vault/Skeletons";
import { WarrantyCard } from "@/components/vault/WarrantyCard";
import { useVault } from "@/lib/vault-store";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { daysLeft, formatShortDate } from "@/lib/warranty";

const FILTERS: readonly FilterOption[] = [
  { id: "all", label: "Tutte" },
  { id: "soon", label: "In scadenza" },
  { id: "elettrodomestici", label: "Elettrodomestici" },
  { id: "elettronica", label: "Elettronica" },
  { id: "recent", label: "Aggiunti di recente" },
];

export const Route = createFileRoute("/search")({
  beforeLoad: requireAuthenticatedRoute,
  head: () => ({
    meta: [
      { title: "Cerca — Warranty Vault" },
      {
        name: "description",
        content: "Cerca un acquisto per prodotto, modello, negozio o data.",
      },
      { property: "og:title", content: "Cerca — Warranty Vault" },
      {
        property: "og:description",
        content: "Cerca un acquisto per prodotto, modello, negozio o data.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { receipts, loading } = useVault();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts.filter((r) => {
      const haystack = [
        r.store,
        formatShortDate(r.purchaseDate),
        ...r.products.flatMap((p) => [p.name, p.model ?? ""]),
      ]
        .join(" ")
        .toLowerCase();
      if (q && !haystack.includes(q)) return false;

      if (filter === "soon") {
        return r.products.some((p) => {
          const d = daysLeft(p.warrantyExpiration);
          return d > 0 && d <= 183;
        });
      }
      if (filter === "recent") {
        return daysLeft(r.createdAt) > -60;
      }
      if (filter === "elettrodomestici" || filter === "elettronica") {
        return r.products.some((p) => p.category === filter);
      }
      return true;
    });
  }, [receipts, query, filter]);

  return (
    <AppShell>
      <PageHeader eyebrow="Archivio garanzie" title="Cerca" />

      <div className="relative z-10 space-y-3 px-5">
        <SearchBar value={query} onChange={setQuery} />
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <section className="relative z-10 mt-4 space-y-3 px-5 pb-32">
        {loading ? (
          <SkeletonList count={3} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nessun risultato"
            description="Prova con il nome del prodotto, il modello o il negozio dove hai acquistato."
          />
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {results.length} {results.length === 1 ? "risultato" : "risultati"}
            </p>
            {results.map((r, i) => (
              <WarrantyCard key={r.id} receipt={r} delay={i * 50} />
            ))}
          </>
        )}
      </section>
    </AppShell>
  );
}
