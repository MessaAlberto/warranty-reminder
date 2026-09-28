import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { NoticeBanner } from "@/components/vault/NoticeBanner";
import { PageHeader } from "@/components/vault/PageHeader";
import { ProductForm } from "@/components/vault/ProductForm";
import { ReceiptAnalysisProgress } from "@/components/vault/ReceiptAnalysisProgress";
import { ReceiptUploader } from "@/components/vault/ReceiptUploader";
import { Field, TextInput, VaultButton } from "@/components/vault/controls";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";
import { mockReceiptService } from "@/lib/mock-services";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { useVault } from "@/lib/vault-store";
import type { Product, Receipt, ReceiptImage } from "@/lib/vault-types";
import { addMonths, formatDate, formatPrice } from "@/lib/warranty";

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
    model: "",
    price: 0,
    warrantyMonths: months,
    warrantyExpiration: addMonths(purchaseDate, months),
    category: "elettrodomestici",
  };
}

function AddPage() {
  const navigate = useNavigate();
  const { addReceipt, prefs } = useVault();

  const [step, setStep] = useState<Step>("capture");
  const [images, setImages] = useState<ReceiptImage[]>([]);
  const [failMode, setFailMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [store, setStore] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const applyAnalysis = useCallback(() => {
    if (failMode) {
      setStep("failed");
      return;
    }
    const a = MOCK_ANALYSIS_RESULT;
    setStore(a.store);
    setPurchaseDate(a.purchaseDate);
    setTotal(a.total);
    setProducts(
      a.products.map((p, i) => ({
        id: `p-${Date.now()}-${i}`,
        name: p.name,
        model: p.model,
        price: p.price,
        warrantyMonths: prefs.defaultWarrantyMonths,
        warrantyExpiration: addMonths(a.purchaseDate, prefs.defaultWarrantyMonths),
        category: p.category,
      })),
    );
    setStep("review");
  }, [failMode, prefs.defaultWarrantyMonths]);

  const startManual = () => {
    setProducts([newProduct(purchaseDate, prefs.defaultWarrantyMonths)]);
    setStep("review");
  };

  const changeDate = (value: string) => {
    setPurchaseDate(value);
    setProducts((prev) =>
      prev.map((p) => ({ ...p, warrantyExpiration: addMonths(value, p.warrantyMonths || 24) })),
    );
  };

  const save = async () => {
    if (!store.trim() || products.some((p) => !p.name.trim())) {
      toast.error("Controlla negozio e nome dei prodotti");
      return;
    }
    setSaving(true);
    const receipt: Receipt = {
      id: `r-${Date.now()}`,
      store: store.trim(),
      purchaseDate,
      total: total || products.reduce((s, p) => s + p.price, 0),
      notes: notes.trim() || undefined,
      images,
      products,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await mockReceiptService.saveReceipt(receipt);
    addReceipt(receipt);
    setSaving(false);
    setStep("saved");
    setTimeout(() => navigate({ to: "/home" }), 1400);
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Nuovo acquisto" title="Aggiungi" back="/home" />

      <div className="relative z-10 px-5">
        <ol className="flex items-center gap-2" aria-label="Avanzamento">
          {["Scontrino", "Analisi", "Controllo"].map((label, i) => {
            const state =
              i < STEP_INDEX[step] ? "done" : i === STEP_INDEX[step] ? "current" : "todo";
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
            <ReceiptUploader images={images} onChange={setImages} />
            <div className="flex flex-col gap-2">
              <VaultButton
                variant="primary"
                disabled={images.length === 0}
                onClick={() => setStep("analysing")}
              >
                Analizza scontrino
              </VaultButton>
              <VaultButton variant="ghost" onClick={startManual}>
                Inserisci i dati manualmente
              </VaultButton>
              <label className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={failMode}
                  onChange={(e) => setFailMode(e.target.checked)}
                  className="size-4 rounded"
                />
                Simula una lettura non riuscita
              </label>
            </div>
          </div>
        ) : null}

        {step === "analysing" ? (
          <ReceiptAnalysisProgress imageUrl={images[0]?.url} onDone={applyAnalysis} />
        ) : null}

        {step === "failed" ? (
          <div className="rise space-y-4">
            <NoticeBanner
              tone="error"
              title="Scontrino non leggibile"
              description="La qualità dell'immagine è troppo bassa per riconoscere i dati d'acquisto."
            />
            <div className="flex flex-col gap-2">
              <VaultButton
                variant="accent"
                onClick={() => {
                  setFailMode(false);
                  setStep("capture");
                }}
              >
                Prova con un'altra foto
              </VaultButton>
              <VaultButton variant="outline" onClick={() => setStep("capture")}>
                Aggiungi un'altra pagina
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
              description="I dati sono stati letti automaticamente: verificali prima di salvare."
            />

            <div className="glass space-y-4 rounded-2xl p-4 ring-1 ring-border">
              <Field label="Negozio">
                {(id) => (
                  <TextInput id={id} value={store} onChange={(e) => setStore(e.target.value)} />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data acquisto">
                  {(id) => (
                    <TextInput
                      id={id}
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => changeDate(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Totale (€)">
                  {(id) => (
                    <TextInput
                      id={id}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={total}
                      onChange={(e) => setTotal(Number(e.target.value))}
                    />
                  )}
                </Field>
              </div>
              <Field label="Note (facoltative)">
                {(id) => (
                  <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />
                )}
              </Field>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Acquisto del {formatDate(purchaseDate)} · {formatPrice(total)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg tracking-tight">Prodotti</h2>
                <button
                  onClick={() =>
                    setProducts((p) => [
                      ...p,
                      newProduct(purchaseDate, prefs.defaultWarrantyMonths),
                    ])
                  }
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 font-mono text-[10px] uppercase tracking-wider ring-1 ring-border"
                >
                  <Plus className="size-3.5" aria-hidden /> Aggiungi
                </button>
              </div>
              {products.map((p, i) => (
                <ProductForm
                  key={p.id}
                  product={p}
                  index={i}
                  purchaseDate={purchaseDate}
                  onChange={(next) =>
                    setProducts((prev) => prev.map((x) => (x.id === p.id ? next : x)))
                  }
                  onRemove={
                    products.length > 1
                      ? () => setProducts((prev) => prev.filter((x) => x.id !== p.id))
                      : undefined
                  }
                />
              ))}
            </div>

            <VaultButton variant="accent" className="w-full" onClick={save} disabled={saving}>
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
              {products[0]?.name} è protetto fino al{" "}
              {products[0] ? formatDate(products[0].warrantyExpiration) : ""}.
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
