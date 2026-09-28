import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { ProductForm } from "@/components/vault/ProductForm";
import { ReceiptAnalysisProgress } from "@/components/vault/ReceiptAnalysisProgress";
import { ReceiptUploader } from "@/components/vault/ReceiptUploader";
import { useCriticalOperation } from "@/components/vault/AsyncOperationProvider";
import { Field, TextInput, VaultButton } from "@/components/vault/controls";
import { createReceiptWithImages } from "@/drive/receipt-functions";
import { analyzeReceipt } from "@/ocr/ocr-functions";
import type { ReceiptOcrRecord } from "@/ocr/ocr-types";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import {
  receiptAnalysisFormData,
  receiptImageFormData,
} from "@/lib/receipt-image-form-data";
import { releaseLocalReceiptImage } from "@/lib/receipt-image-preprocessing";
import { useVault } from "@/lib/vault-store";
import type { PendingReceiptImage, Product, Receipt } from "@/lib/vault-types";
import { addMonths, formatDate } from "@/lib/warranty";

export const Route = createFileRoute("/add")({
  beforeLoad: requireAuthenticatedRoute,
  head: () => ({
    meta: [
      { title: "Aggiungi acquisto — Warranty Vault" },
      {
        name: "description",
        content: "Fotografa lo scontrino, controlla i dati rilevati e salva la garanzia.",
      },
      { property: "og:title", content: "Aggiungi acquisto — Warranty Vault" },
      {
        property: "og:description",
        content: "Fotografa lo scontrino, controlla i dati rilevati e salva la garanzia.",
      },
    ],
  }),
  component: AddPage,
});

type Step = "capture" | "analysing" | "failed" | "review" | "saved";

const STEP_INDEX: Record<Step, number> = {
  capture: 0,
  analysing: 1,
  failed: 1,
  review: 2,
  saved: 2,
};

function newProduct(purchaseDate: string, months: number): Product {
  return {
    id: `p-${Date.now()}-${Math.round(Math.random() * 999)}`,
    name: "",
    price: 0,
    quantity: 1,
    warrantyMonths: months,
    warrantyExpiration: addMonths(purchaseDate, months),
    category: "altro",
  };
}

function AddPage() {
  const navigate = useNavigate();
  const { addReceipt, prefs } = useVault();
  const { busy, runCritical } = useCriticalOperation();

  const [step, setStep] = useState<Step>("capture");
  const [images, setImages] = useState<PendingReceiptImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [ocr, setOcr] = useState<ReceiptOcrRecord | null>(null);

  const [store, setStore] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const startAnalysis = async () => {
    if (!images.length || saving || busy) return;

    setAnalysisError(null);
    setOcr(null);
    setStep("analysing");

    try {
      const analysis = await analyzeReceipt({ data: receiptAnalysisFormData(images) });
      const detectedDate = analysis.result.purchaseDate ?? "";

      setStore(analysis.result.storeName ?? "");
      setPurchaseDate(detectedDate);
      setProducts(
        analysis.result.items.length
          ? analysis.result.items.map((item, index) => ({
              id: `p-${Date.now()}-${index}`,
              name: item.name ?? "",
              price: item.price ?? 0,
              quantity: item.quantity,
              warrantyMonths: prefs.defaultWarrantyMonths,
              warrantyExpiration: addMonths(detectedDate, prefs.defaultWarrantyMonths),
              category: "altro" as const,
            }))
          : [newProduct(detectedDate, prefs.defaultWarrantyMonths)],
      );
      setOcr(analysis.ocr);
      setStep("review");

      if (analysis.warnings.length) {
        toast.warning("Analisi completata con un avviso", {
          description: analysis.warnings.join(" "),
        });
      } else if (
        !analysis.result.storeName ||
        !analysis.result.purchaseDate ||
        analysis.result.items.length === 0
      ) {
        toast.info("Analisi parziale", {
          description: "Alcuni campi non sono stati riconosciuti. Controllali prima di salvare.",
        });
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Impossibile analizzare lo scontrino.",
      );
      setStep("failed");
    }
  };

  const startManual = () => {
    setOcr(null);
    setAnalysisError(null);
    setProducts([newProduct(purchaseDate, prefs.defaultWarrantyMonths)]);
    setStep("review");
  };

  const changeDate = (value: string) => {
    setPurchaseDate(value);
    setProducts((previous) =>
      previous.map((product) => ({
        ...product,
        warrantyExpiration: addMonths(value, product.warrantyMonths || 24),
      })),
    );
  };

  const save = async () => {
    if (
      !store.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ||
      products.some((product) => !product.name.trim())
    ) {
      toast.error("Controlla negozio, data di acquisto e nome dei prodotti");
      return;
    }

    setSaving(true);
    const receipt: Receipt = {
      id: `r-${Date.now()}`,
      store: store.trim(),
      purchaseDate,
      notes: notes.trim() || undefined,
      images,
      products,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    try {
      await runCritical(
        {
          message:
            images.length > 1
              ? `Salvataggio e caricamento di ${images.length} foto...`
              : "Salvataggio e caricamento foto...",
        },
        async () => {
          const saved = await createReceiptWithImages({
            data: receiptImageFormData(receipt, ocr ?? undefined),
          });
          addReceipt(saved);
          images.forEach(releaseLocalReceiptImage);
          setStep("saved");
          setTimeout(() => navigate({ to: "/home" }), 1400);
        },
      );
    } catch (error) {
      toast.error("Salvataggio non riuscito", {
        description: error instanceof Error ? error.message : "Riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Nuovo acquisto" title="Aggiungi" back="/home" />

      <div className="relative z-10 px-5">
        <ol className="flex items-center gap-2" aria-label="Avanzamento">
          {["Scontrino", "Analisi", "Controllo"].map((label, index) => {
            const state =
              index < STEP_INDEX[step]
                ? "done"
                : index === STEP_INDEX[step]
                  ? "current"
                  : "todo";
            return (
              <li key={label} className="flex flex-1 flex-col gap-1.5">
                <span
                  className={`h-1 rounded-full ${
                    state === "todo" ? "bg-foreground/10" : "bg-accent"
                  }`}
                />
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    state === "current" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <section className="relative z-10 mt-6 space-y-5 px-5 pb-32">
        {step === "capture" ? (
          <div className="rise space-y-5">
            <div>
              <h2 className="font-display text-xl tracking-tight">Foto dello scontrino</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Aggiungi una foto panoramica oppure più pagine dello stesso scontrino.
              </p>
            </div>
            <ReceiptUploader images={images} onChange={setImages} disabled={saving || busy} />
            <div className="flex flex-col gap-2">
              <VaultButton
                variant="primary"
                disabled={images.length === 0 || saving || busy}
                onClick={() => void startAnalysis()}
              >
                Analizza scontrino
              </VaultButton>
              <VaultButton variant="ghost" onClick={startManual} disabled={saving || busy}>
                Inserisci i dati manualmente
              </VaultButton>
            </div>
          </div>
        ) : null}

        {step === "analysing" ? (
          <ReceiptAnalysisProgress imageUrl={images[0]?.url} imageCount={images.length} />
        ) : null}

        {step === "failed" ? (
          <div className="rise space-y-4">
            <NoticeBanner
              tone="error"
              title="Analisi non riuscita"
              description={
                analysisError ??
                "Non è stato possibile riconoscere automaticamente i dati dello scontrino."
              }
            />
            <div className="flex flex-col gap-2">
              <VaultButton variant="accent" onClick={() => void startAnalysis()}>
                Riprova l'analisi
              </VaultButton>
              <VaultButton variant="outline" onClick={() => setStep("capture")}>
                Modifica le foto
              </VaultButton>
              <VaultButton variant="ghost" onClick={startManual}>
                Inserisci i dati manualmente
              </VaultButton>
            </div>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="rise space-y-5">
            <NoticeBanner
              tone="warn"
              title="Controlla i dati rilevati"
              description="Sono suggerimenti automatici: modifica o rimuovi liberamente ciò che non ti interessa prima di salvare."
            />

            <div className="glass space-y-4 rounded-2xl p-4 ring-1 ring-border">
              <Field label="Negozio">
                {(id) => (
                  <TextInput id={id} value={store} onChange={(event) => setStore(event.target.value)} />
                )}
              </Field>
              <Field label="Data acquisto">
                {(id) => (
                  <TextInput
                    id={id}
                    type="date"
                    value={purchaseDate}
                    onChange={(event) => changeDate(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Note (facoltative)">
                {(id) => (
                  <TextInput id={id} value={notes} onChange={(event) => setNotes(event.target.value)} />
                )}
              </Field>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Acquisto del {formatDate(purchaseDate)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg tracking-tight">Prodotti</h2>
                <button
                  onClick={() =>
                    setProducts((previous) => [
                      ...previous,
                      newProduct(purchaseDate, prefs.defaultWarrantyMonths),
                    ])
                  }
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 font-mono text-[10px] uppercase tracking-wider ring-1 ring-border"
                >
                  <Plus className="size-3.5" aria-hidden /> Aggiungi
                </button>
              </div>
              {products.map((product, index) => (
                <ProductForm
                  key={product.id}
                  product={product}
                  index={index}
                  purchaseDate={purchaseDate}
                  onChange={(next) =>
                    setProducts((previous) =>
                      previous.map((entry) => (entry.id === product.id ? next : entry)),
                    )
                  }
                  onRemove={
                    products.length > 1
                      ? () =>
                          setProducts((previous) =>
                            previous.filter((entry) => entry.id !== product.id),
                          )
                      : undefined
                  }
                />
              ))}
            </div>

            <VaultButton
              variant="accent"
              className="w-full"
              onClick={save}
              disabled={saving || busy}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Salvataggio…
                </>
              ) : (
                "Salva garanzia"
              )}
            </VaultButton>
          </div>
        ) : null}

        {step === "saved" ? (
          <div className="rise glass flex flex-col items-center rounded-2xl px-6 py-12 text-center ring-1 ring-border">
            <span className="grid size-14 place-items-center rounded-full bg-healthy/12 text-healthy">
              <Check className="size-7" strokeWidth={2.4} aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-xl tracking-tight">Garanzia salvata</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {products.length === 1
                ? `${products[0]?.name} è stato salvato.`
                : `${products.length} prodotti sono stati salvati con lo stesso scontrino.`}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
