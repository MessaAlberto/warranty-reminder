import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { EmptyState } from "@/components/vault/EmptyState";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { SkeletonList } from "@/components/vault/Skeletons";
import { WarrantyCard } from "@/components/vault/WarrantyCard";
import { VaultButton } from "@/components/vault/controls";
import { useVault } from "@/lib/vault-store";
import { deletionText, receiptStatus } from "@/lib/warranty";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archivio — Warranty Vault" },
      {
        name: "description",
        content: "Garanzie scadute e scontrini in attesa di eliminazione automatica.",
      },
      { property: "og:title", content: "Archivio — Warranty Vault" },
      {
        property: "og:description",
        content: "Garanzie scadute e scontrini in attesa di eliminazione automatica.",
      },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { receipts, loading } = useVault();
  const [kept, setKept] = useState<string[]>([]);

  const expired = useMemo(() => receipts.filter((r) => receiptStatus(r) === "expired"), [receipts]);

  return (
    <AppShell>
      <PageHeader eyebrow="Garanzie terminate" title="Archivio" />

      <section className="relative z-10 space-y-3 px-5 pb-32">
        {loading ? (
          <SkeletonList count={2} />
        ) : expired.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nessuna garanzia scaduta"
            description="Tutti gli acquisti registrati sono ancora coperti. L'archivio resta vuoto finché una garanzia non termina."
          />
        ) : (
          expired.map((r, i) => {
            const exp = r.products[0]?.warrantyExpiration;
            const keep = kept.includes(r.id);
            return (
              <div key={r.id} className="space-y-2">
                <WarrantyCard receipt={r} delay={i * 60} />
                <NoticeBanner
                  tone={keep ? "info" : "warn"}
                  title={keep ? "Scontrino conservato" : "In attesa di eliminazione"}
                  description={
                    keep
                      ? "Questo scontrino resterà nel vault anche dopo la scadenza."
                      : exp
                        ? deletionText(exp)
                        : undefined
                  }
                  actions={
                    keep ? null : (
                      <VaultButton
                        variant="outline"
                        onClick={() => {
                          setKept((k) => [...k, r.id]);
                          toast.success("Scontrino conservato");
                        }}
                      >
                        <Archive className="size-4" aria-hidden /> Conserva scontrino
                      </VaultButton>
                    )
                  }
                />
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
