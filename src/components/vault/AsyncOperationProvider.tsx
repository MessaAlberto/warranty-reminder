import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";

type CriticalOperation = { message: string };
type AsyncOperationContextValue = {
  busy: boolean;
  runCritical: <T>(operation: CriticalOperation, action: () => Promise<T>) => Promise<T>;
};

const AsyncOperationContext = createContext<AsyncOperationContextValue | null>(null);

export function AsyncOperationProvider({ children }: { children: React.ReactNode }) {
  const [operation, setOperation] = useState<CriticalOperation | null>(null);
  const operationInProgress = useRef(false);

  useEffect(() => {
    if (!operation) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [operation]);

  const runCritical = useCallback(
    async <T,>(nextOperation: CriticalOperation, action: () => Promise<T>): Promise<T> => {
      if (operationInProgress.current) throw new Error("An operation is already in progress.");
      operationInProgress.current = true;
      setOperation(nextOperation);
      try {
        return await action();
      } finally {
        operationInProgress.current = false;
        setOperation(null);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ busy: operation !== null, runCritical }),
    [operation, runCritical],
  );

  return (
    <AsyncOperationContext.Provider value={value}>
      {children}
      {operation ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
          aria-label={operation.message}
          className="fixed inset-0 z-[100] grid place-items-center bg-foreground/30 px-5 backdrop-blur-sm"
        >
          <div className="glass-strong flex min-w-56 items-center gap-3 rounded-2xl px-5 py-4 text-foreground shadow-glass ring-1 ring-border">
            <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
            <p className="font-display text-[15px] tracking-tight">{operation.message}</p>
          </div>
        </div>
      ) : null}
    </AsyncOperationContext.Provider>
  );
}

export function useCriticalOperation(): AsyncOperationContextValue {
  const context = useContext(AsyncOperationContext);
  if (!context) throw new Error("useCriticalOperation must be used within AsyncOperationProvider.");
  return context;
}
