import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Archive, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { useCriticalOperation } from "@/components/vault/AsyncOperationProvider";
import { ConfirmDialog } from "@/components/vault/ConfirmDialog";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { ProductForm } from "@/components/vault/ProductForm";
import { ReceiptUploader } from "@/components/vault/ReceiptUploader";
import { ReceiptViewer } from "@/components/vault/ReceiptViewer";
import { SkeletonDetail, SkeletonImage } from "@/components/vault/Skeletons";
import { WarrantyProgress } from "@/components/vault/WarrantyProgress";
import { WarrantyStatusBadge } from "@/components/vault/WarrantyStatusBadge";
import { Field, TextInput, VaultButton } from "@/components/vault/controls";
import { moveReceiptToTrash, getReceipt, updateReceiptWithImages } from "@/drive/receipt-functions";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { useVault } from "@/lib/vault-store";
import { receiptImageFormData } from "@/lib/receipt-image-form-data";
import { releaseLocalReceiptImage } from "@/lib/receipt-image-preprocessing";
import type { PendingReceiptImage, Receipt } from "@/lib/vault-types";
import { CATEGORY_LABEL } from "@/lib/vault-types";
import {
  addMonths,
  deletionText,
  formatDate,
  formatPrice,
  progressOf,
  remainingText,
  statusOf,
} from "@/lib/warranty";

export const Route = createFileRoute("/purchase/$id")({
  beforeLoad: requireAuthenticatedRoute,
  head: () => ({
    meta: [
      { title: "Dettaglio acquisto — Warranty Vault" },
      {
        name: "description",
        content: "Stato della garanzia, dati d'acquisto e scontrino originale su richiesta.",
      },
      { property: "og:title", content: "Dettaglio acquisto — Warranty Vault" },
      {
        property: "og:description",
        content: "Stato della garanzia, dati d'acquisto e scontrino originale su richiesta.",
      },
    ],
  }),
  component: PurchasePage,
});

function PurchasePage() {
  const { id } = useParams({ from: "/purchase/$id" });
  const navigate = useNavigate();
  const { receipts, loading, updateReceipt, removeReceipt } = useVault();
  const { busy, runCritical } = useCriticalOperation();
  const receipt = receipts.find((r) => r.id === id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<
    (Omit<Receipt, "images"> & { images: PendingReceiptImage[] }) | null
  >(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageRequested, setImageRequested] = useState(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string>>(() => new Set());
  const [detailedReceipt, setDetailedReceipt] = useState<Receipt | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [kept, setKept] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetailedReceipt(null);
    setShowImages(false);
    setImageRequested(false);
    setImageLoading(false);
    setLoadedImageIds(new Set());
    setViewer(false);
    setEditing(false);
    setLoadingMetadata(true);
    void getReceipt({ data: { id } })
      .then((result) => {
        if (!cancelled && result) setDetailedReceipt(result);
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossibile caricare i dati dello scontrino");
      })
      .finally(() => {
        if (!cancelled) setLoadingMetadata(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!imageRequested || loadingMetadata) return;
    if (!detailedReceipt) {
      setImageRequested(false);
      setImageLoading(false);
      toast.error("Impossibile preparare l'immagine dello scontrino. Riprova.");
      return;
    }
    if (detailedReceipt.images.length === 0) {
      setImageRequested(false);
      setImageLoading(false);
      toast.info("L'immagine dello scontrino non è ancora archiviata");
      return;
    }
    setLoadedImageIds(new Set());
    setShowImages(true);
    setImageLoading(true);
  }, [detailedReceipt, imageRequested, loadingMetadata]);

  if (loading) {
    return (
      <AppShell>
        <PageHeader eyebrow="Acquisto" title="Caricamento" back="/home" />
        <SkeletonDetail />
      </AppShell>
    );
  }

  if (!receipt) {
    return (
      <AppShell>
        <PageHeader eyebrow="Acquisto" title="Non trovato" back="/home" />
        <div className="px-5">
          <NoticeBanner
            tone="error"
            title="Acquisto non disponibile"
            description="Questa garanzia è stata eliminata o non esiste più."
          />
        </div>
      </AppShell>
    );
  }

  const detail = detailedReceipt?.id === id ? detailedReceipt : receipt;
  const product = detail.products[0]!;
  const status = statusOf(product);
  const current = draft ?? detail;

  const openReceipt = () => {
    setImageRequested(true);
    setImageLoading(true);
  };

  const completeImageLoad = (imageId: string) => {
    setLoadedImageIds((current) => {
      const next = new Set(current).add(imageId);
      if (next.size === detail.images.length) setImageLoading(false);
      return next;
    });
  };

  const failImageLoad = () => {
    setShowImages(false);
    setImageRequested(false);
    setImageLoading(false);
    setLoadedImageIds(new Set());
    toast.error("Impossibile caricare l'immagine dello scontrino. Riprova.");
  };

  const startEdit = () => {
    if (loadingMetadata) return;
    setDraft(structuredClone(detail));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await runCritical({ message: "Salvataggio e caricamento foto..." }, async () => {
        const saved = await updateReceiptWithImages({
          data: receiptImageFormData(draft),
        });
        updateReceipt(saved);
        draft.images.filter((image) => image.file).forEach(releaseLocalReceiptImage);
        setDetailedReceipt(saved);
        setEditing(false);
        setDraft(null);
        toast.success("Modifiche salvate");
      });
    } catch (error) {
      toast.error("Modifica non riuscita", {
        description: error instanceof Error ? error.message : "Riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await runCritical({ message: "Eliminazione..." }, async () => {
        await moveReceiptToTrash({ data: { id: detail.id } });
        removeReceipt(detail.id);
        setConfirming(false);
        toast.success("Acquisto spostato nell'archivio");
        navigate({ to: "/home" });
      });
    } catch (error) {
      toast.error("Spostamento non riuscito", {
        description: error instanceof Error ? error.message : "Riprova.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow={detail.store} title={product.name} back="/home" />

      <div className="relative z-10 space-y-5 px-5 pb-32">
        {!editing ? (
          <>
            <div className="rise glass rounded-2xl p-5 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg tracking-tight">
                    {status === "expired"
                      ? "Garanzia terminata"
                      : remainingText(product.warrantyExpiration)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    Scadenza {formatDate(product.warrantyExpiration)}
                  </p>
                </div>
                <WarrantyStatusBadge status={status} />
              </div>
              <WarrantyProgress
                value={progressOf(product, detail.purchaseDate)}
                status={status}
                label={`Garanzia di ${product.name}`}
              />
            </div>

            {status === "expired" ? (
              <NoticeBanner
                tone={kept ? "info" : "warn"}
                title={kept ? "Scontrino conservato" : "Garanzia scaduta"}
                description={
                  kept
                    ? "Questo scontrino non verrà eliminato automaticamente."
                    : deletionText(product.warrantyExpiration)
                }
                actions={
                  kept ? null : (
                    <VaultButton
                      variant="outline"
                      onClick={() => {
                        setKept(true);
                        toast.success("Scontrino conservato");
                      }}
                    >
                      <Archive className="size-4" aria-hidden /> Conserva scontrino
                    </VaultButton>
                  )
                }
              />
            ) : null}

            <div className="glass space-y-3 rounded-2xl p-5 ring-1 ring-border">
              <Row label="Negozio" value={detail.store} />
              <Row label="Data acquisto" value={formatDate(detail.purchaseDate)} />
              {detail.notes ? <Row label="Note" value={detail.notes} /> : null}
            </div>

            <div className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Prodotti sullo scontrino
              </h2>
              {detail.products.map((p) => (
                <div key={p.id} className="glass rounded-2xl p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px] tracking-tight">{p.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {CATEGORY_LABEL[p.category]} · {formatPrice(p.price)}
                      </p>
                    </div>
                    <WarrantyStatusBadge status={statusOf(p)} />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {p.warrantyMonths} mesi · scade il {formatDate(p.warrantyExpiration)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Scontrino
              </h2>
              <div className="relative glass rounded-2xl p-4 ring-1 ring-border">
                {showImages ? (
                  <>
                    {imageLoading ? (
                      <div className="space-y-3" aria-busy="true">
                        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" aria-hidden /> Caricamento
                          scontrino…
                        </p>
                        <SkeletonImage />
                      </div>
                    ) : null}
                    <div
                      className={`grid grid-cols-3 gap-2 ${
                        imageLoading ? "pointer-events-none absolute opacity-0" : ""
                      }`}
                    >
                      {detail.images.map((img, i) => (
                        <button
                          key={img.id}
                          onClick={() => setViewer(true)}
                          className="overflow-hidden rounded-xl ring-1 ring-border"
                          aria-label={`Apri ${img.label} a schermo intero`}
                        >
                          <img
                            src={img.url}
                            alt={img.label}
                            loading="lazy"
                            width={768}
                            height={1536}
                            className="h-28 w-full object-cover object-top"
                            onLoad={() => completeImageLoad(img.id)}
                            onError={failImageLoad}
                          />
                          <span className="sr-only">Pagina {i + 1}</span>
                        </button>
                      ))}
                    </div>
                    <VaultButton
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => setViewer(true)}
                    >
                      Apri a schermo intero
                    </VaultButton>
                  </>
                ) : imageLoading ? (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Caricamento scontrino…
                    </p>
                    <SkeletonImage />
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-muted-foreground">
                      Le foto restano archiviate e vengono scaricate solo quando le apri.
                    </p>
                    <VaultButton
                      variant="accent"
                      className="mt-3 w-full"
                      onClick={openReceipt}
                      disabled={busy}
                    >
                      <FileText className="size-4" aria-hidden /> Visualizza scontrino originale
                    </VaultButton>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <VaultButton variant="outline" onClick={startEdit} disabled={loadingMetadata || busy}>
                <Pencil className="size-4" aria-hidden /> Modifica acquisto
              </VaultButton>
              <VaultButton
                variant="ghost"
                onClick={() => setConfirming(true)}
                className="text-expired"
              >
                <Trash2 className="size-4" aria-hidden /> Elimina acquisto
              </VaultButton>
            </div>
          </>
        ) : (
          <div className="rise space-y-5">
            <div className="glass space-y-4 rounded-2xl p-4 ring-1 ring-border">
              <Field label="Negozio">
                {(fid) => (
                  <TextInput
                    id={fid}
                    value={current.store}
                    onChange={(e) => setDraft({ ...current, store: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Data acquisto">
                {(fid) => (
                  <TextInput
                    id={fid}
                    type="date"
                    value={current.purchaseDate.slice(0, 10)}
                    onChange={(e) =>
                      setDraft({
                        ...current,
                        purchaseDate: e.target.value,
                        products: current.products.map((p) => ({
                          ...p,
                          warrantyExpiration: addMonths(e.target.value, p.warrantyMonths || 24),
                        })),
                      })
                    }
                  />
                )}
              </Field>
              <Field label="Note">
                {(fid) => (
                  <TextInput
                    id={fid}
                    value={current.notes ?? ""}
                    onChange={(e) => setDraft({ ...current, notes: e.target.value })}
                  />
                )}
              </Field>
            </div>

            {current.products.map((p, i) => (
              <ProductForm
                key={p.id}
                product={p}
                index={i}
                purchaseDate={current.purchaseDate}
                onChange={(next) =>
                  setDraft({
                    ...current,
                    products: current.products.map((x) => (x.id === p.id ? next : x)),
                  })
                }
              />
            ))}

            <div className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Foto dello scontrino
              </h2>
              <ReceiptUploader
                images={current.images}
                onChange={(images) => setDraft({ ...current, images })}
                disabled={saving || busy}
              />
            </div>

            <div className="flex flex-col gap-2">
              <VaultButton variant="accent" onClick={saveEdit} disabled={saving || busy}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Salvataggio…
                  </>
                ) : (
                  "Salva modifiche"
                )}
              </VaultButton>
              <VaultButton
                variant="ghost"
                onClick={() => {
                  draft?.images.filter((image) => image.file).forEach(releaseLocalReceiptImage);
                  setEditing(false);
                  setDraft(null);
                }}
                disabled={saving || busy}
              >
                Annulla
              </VaultButton>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Eliminare questo acquisto?"
        description="Verranno rimossi anche le foto dello scontrino collegate. L'operazione non è reversibile."
        confirmLabel="Elimina acquisto e scontrino"
        busy={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirming(false)}
      />

      {viewer && detail.images.length ? (
        <ReceiptViewer images={detail.images} onClose={() => setViewer(false)} />
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-[14px]">{value}</span>
    </div>
  );
}
