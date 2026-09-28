import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { useCriticalOperation } from "@/components/vault/AsyncOperationProvider";
import { EmptyState } from "@/components/vault/EmptyState";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { SkeletonList } from "@/components/vault/Skeletons";
import { WarrantyCard } from "@/components/vault/WarrantyCard";
import { VaultButton } from "@/components/vault/controls";
import { useVault } from "@/lib/vault-store";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { listTrashReceipts, restoreReceipt } from "@/drive/receipt-functions";
import { deletionText, receiptStatus } from "@/lib/warranty";

export const Route = createFileRoute("/archive")({
  beforeLoad: requireAuthenticatedRoute,
  loader: async () => await listTrashReceipts(),
  pendingMs: 0,
  pendingComponent: ArchivePending,
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

function ArchivePending() {
  return (
    <AppShell>
      <PageHeader eyebrow="Garanzie terminate" title="Archivio" />
      <section className="relative z-10 space-y-3 px-5 pb-32" aria-busy="true">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Caricamento archivio…
        </p>
        <SkeletonList count={2} />
      </section>
    </AppShell>
  );
}

function ArchivePage() {
  const { receipts, loading, addReceipt } = useVault();
  const { busy, runCritical } = useCriticalOperation();
  const initialTrash = Route.useLoaderData();
  const [trash, setTrash] = useState(initialTrash ?? []);
  const [kept, setKept] = useState<string[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const expired = useMemo(() => receipts.filter((r) => receiptStatus(r) === "expired"), [receipts]);

  return (
    <AppShell>
      <PageHeader eyebrow="Garanzie terminate" title="Archivio" />

      <section className="relative z-10 space-y-3 px-5 pb-32">
        {loading ? (
          <SkeletonList count={2} />
        ) : expired.length === 0 && trash.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nessuna garanzia scaduta"
            description="Tutti gli acquisti registrati sono ancora coperti. L'archivio resta vuoto finché una garanzia non termina."
          />
        ) : (
          <>
            {expired.map((r, i) => {
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
            })}
            {trash.length ? (
              <div className="space-y-3 pt-4">
                <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Nel cestino
                </h2>
                {trash.map((r) => (
                  <div key={r.id} className="space-y-2">
                    <WarrantyCard receipt={r} />
                    <VaultButton
                      variant="outline"
                      disabled={restoringId === r.id || busy}
                      onClick={async () => {
                        setRestoringId(r.id);
                        try {
                          await runCritical({ message: "Ripristino..." }, async () => {
                            const restored = await restoreReceipt({ data: { id: r.id } });
                            addReceipt(restored);
                            setTrash((current) => current.filter((entry) => entry.id !== r.id));
                            toast.success("Acquisto ripristinato");
                          });
                        } catch (error) {
                          toast.error("Ripristino non riuscito", {
                            description: error instanceof Error ? error.message : "Riprova.",
                          });
                        } finally {
                          setRestoringId(null);
                        }
                      }}
                    >
                      {restoringId === r.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden /> Ripristino…
                        </>
                      ) : (
                        "Ripristina acquisto"
                      )}
                    </VaultButton>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}
