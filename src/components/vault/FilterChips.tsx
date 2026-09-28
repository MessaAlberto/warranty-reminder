export interface FilterOption {
  id: string;
  label: string;
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: readonly FilterOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtri"
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`min-h-9 shrink-0 rounded-full px-3.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              active
                ? "bg-foreground text-background"
                : "glass text-muted-foreground ring-1 ring-border"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
