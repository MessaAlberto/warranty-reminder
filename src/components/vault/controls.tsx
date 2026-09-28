import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "accent";

const VARIANT: Record<Variant, string> = {
  primary: "bg-foreground text-background",
  accent: "bg-accent text-accent-foreground shadow-accent",
  outline: "glass ring-1 ring-border text-foreground",
  ghost: "text-muted-foreground",
};

export function VaultButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-display text-[15px] font-medium tracking-tight transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:opacity-50 ${VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 w-full rounded-xl bg-background/60 px-3.5 text-[15px] ring-1 ring-border outline-none focus:ring-accent ${props.className ?? ""}`}
    />
  );
}
