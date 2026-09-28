import { BottomSheet } from "./BottomSheet";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean | undefined;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="min-h-12 rounded-2xl bg-destructive font-display text-[15px] font-medium text-destructive-foreground disabled:opacity-60"
        >
          {busy ? "Eliminazione…" : confirmLabel}
        </button>
        <button
          onClick={onClose}
          className="min-h-12 rounded-2xl ring-1 ring-border font-display text-[15px] font-medium"
        >
          Annulla
        </button>
      </div>
    </BottomSheet>
  );
}
