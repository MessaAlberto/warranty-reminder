import { useEffect, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in glass-strong relative w-full max-w-[430px] rounded-t-3xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] ring-1 ring-border md:max-w-md md:mb-6 md:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/15" />
        <h2 className="font-display text-lg tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
