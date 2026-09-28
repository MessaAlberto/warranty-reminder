import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Cerca prodotto, negozio, modello…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="glass flex items-center gap-2 rounded-2xl px-4 ring-1 ring-border focus-within:ring-accent">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <label className="sr-only" htmlFor="vault-search">
        Cerca nelle garanzie
      </label>
      <input
        id="vault-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Cancella ricerca"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
