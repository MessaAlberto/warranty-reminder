import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
        content: "Scontrini archiviati e ancora recuperabili prima della cancellazione definitiva.",
      },
      { property: "og:title", content: "Archivio — Warranty Vault" },
      {
        property: "og:description",
        content: "Scontrini archiviati e ancora recuperabili prima della cancellazione definitiva.",
      },
    ],
  }),
  component: ArchivePage,
});

function ArchivePending() {
  return (
    <AppShell>
      <PageHeader eyebrow="Cestino interno" title="Archivio" />
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
  const { loading, addReceipt } = useVault();
  const { busy, runCritical } = useCriticalOperation();
  const initialTrash = Route.useLoaderData();
  const [trash, setTrash] = useState(initialTrash ?? []);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  return (
    <AppShell>
      <PageHeader eyebrow="Cestino interno" title="Archivio" />

      <section className="relative z-10 space-y-3 px-5 pb-32">
        {loading ? (
          <SkeletonList count={2} />
        ) : trash.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Archivio vuoto"
            description="Gli scontrini restano nella lista normale per 90 giorni dopo la scadenza dell'ultima garanzia. Solo dopo vengono spostati qui."
          />
        ) : (
          <>
            <NoticeBanner
              tone="info"
              title="30 giorni per ripristinare"
              description="Gli acquisti presenti qui vengono eliminati definitivamente dopo 30 giorni, salvo ripristino."
            />
            <div className="space-y-3 pt-1">
              {trash.map((receipt) => (
                <div key={receipt.id} className="space-y-2">
                  <WarrantyCard receipt={receipt} />
                  <VaultButton
                    variant="outline"
                    disabled={restoringId === receipt.id || busy}
                    onClick={async () => {
                      setRestoringId(receipt.id);
                      try {
                        await runCritical({ message: "Ripristino..." }, async () => {
                          const restored = await restoreReceipt({ data: { id: receipt.id } });
                          addReceipt(restored);
                          setTrash((current) =>
                            current.filter((entry) => entry.id !== receipt.id),
                          );
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
                    {restoringId === receipt.id ? (
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
          </>
        )}
      </section>
    </AppShell>
  );
}
