import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Preparazione immagine",
  "Lettura scontrino",
  "Ricerca dati d'acquisto",
  "Rilevamento prodotti",
  "Controllo garanzia",
];

export function ReceiptAnalysisProgress({
  imageUrl,
  onDone,
}: {
  imageUrl?: string | undefined;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, onDone]);

  const pct = Math.round((step / STEPS.length) * 100);

  return (
    <div className="space-y-5">
      <div className="glass relative overflow-hidden rounded-2xl ring-1 ring-border">
        <div className="relative h-56 w-full overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Scontrino in analisi"
              loading="lazy"
              width={768}
              height={1536}
              className="w-full object-cover object-top opacity-80"
            />
          ) : null}
          <div className="scan-line absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-accent/35 to-transparent" />
          <div className="absolute inset-0 ring-1 ring-inset ring-accent/30" />
        </div>
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="skeleton block h-2 rounded-full"
              style={{ width: `${70 - i * 18}%`, opacity: step > i ? 0.25 : 1 }}
            >
              <span className="skeleton-sheen" />
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg tracking-tight">Analisi dello scontrino</p>
          <span className="font-mono text-[11px] text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/8">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2" aria-live="polite">
        {STEPS.map((label, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity ${
                done || active ? "opacity-100" : "opacity-40"
              } ${active ? "glass ring-1 ring-border" : ""}`}
            >
              {done ? (
                <Check className="size-4 text-healthy" aria-hidden />
              ) : active ? (
                <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
              ) : (
                <span className="size-4 rounded-full ring-1 ring-border" aria-hidden />
              )}
              <span className="text-[14px]">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
