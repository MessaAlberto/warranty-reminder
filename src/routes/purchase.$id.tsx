import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { ConfirmDialog } from "@/components/vault/ConfirmDialog";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { ProductForm } from "@/components/vault/ProductForm";
import { ReceiptViewer } from "@/components/vault/ReceiptViewer";
import { SkeletonDetail, SkeletonImage } from "@/components/vault/Skeletons";
import { WarrantyProgress } from "@/components/vault/WarrantyProgress";
import { WarrantyStatusBadge } from "@/components/vault/WarrantyStatusBadge";
import { Field, TextInput, VaultButton } from "@/components/vault/controls";
import { mockReceiptService } from "@/lib/mock-services";
import { useVault } from "@/lib/vault-store";
import type { Receipt, ReceiptImage } from "@/lib/vault-types";
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
  const receipt = receipts.find((r) => r.id === id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Receipt | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [images, setImages] = useState<ReceiptImage[] | null>(null);
  const [viewer, setViewer] = useState(false);
  const [kept, setKept] = useState(false);

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

  const product = receipt.products[0]!;
  const status = statusOf(product);
  const current = draft ?? receipt;

  const openReceipt = async () => {
    setLoadingReceipt(true);
    const files = await mockReceiptService.fetchOriginalImages(receipt);
    setImages(files);
    setLoadingReceipt(false);
  };

  const startEdit = () => {
    setDraft(structuredClone(receipt));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    await mockReceiptService.saveReceipt(draft);
    updateReceipt(draft);
    setEditing(false);
    setDraft(null);
    toast.success("Modifiche salvate");
  };

  const doDelete = async () => {
    setDeleting(true);
    await mockReceiptService.deleteReceipt(receipt.id);
    removeReceipt(receipt.id);
    setDeleting(false);
    setConfirming(false);
    toast.success("Acquisto eliminato");
    navigate({ to: "/home" });
  };

  return (
    <AppShell>
      <PageHeader eyebrow={receipt.store} title={product.name} back="/home" />

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
                value={progressOf(product, receipt.purchaseDate)}
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
              <Row label="Negozio" value={receipt.store} />
              <Row label="Data acquisto" value={formatDate(receipt.purchaseDate)} />
              <Row label="Totale scontrino" value={formatPrice(receipt.total)} />
              {receipt.notes ? <Row label="Note" value={receipt.notes} /> : null}
            </div>

            <div className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Prodotti sullo scontrino
              </h2>
              {receipt.products.map((p) => (
                <div key={p.id} className="glass rounded-2xl p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px] tracking-tight">{p.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {p.model ? `${p.model} · ` : ""}
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
              <div className="glass rounded-2xl p-4 ring-1 ring-border">
                {images ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, i) => (
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
                ) : loadingReceipt ? (
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
                    <VaultButton variant="accent" className="mt-3 w-full" onClick={openReceipt}>
                      <FileText className="size-4" aria-hidden /> Visualizza scontrino originale
                    </VaultButton>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <VaultButton variant="outline" onClick={startEdit}>
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
              <div className="grid grid-cols-2 gap-3">
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
                <Field label="Totale (€)">
                  {(fid) => (
                    <TextInput
                      id={fid}
                      type="number"
                      step="0.01"
                      value={current.total}
                      onChange={(e) => setDraft({ ...current, total: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>
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

            <div className="flex flex-col gap-2">
              <VaultButton variant="accent" onClick={saveEdit}>
                Salva modifiche
              </VaultButton>
              <VaultButton
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(null);
                }}
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

      {viewer && images ? <ReceiptViewer images={images} onClose={() => setViewer(false)} /> : null}
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
