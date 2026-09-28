import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_RECEIPTS } from "./mock-data";
import type { AuthenticatedUser } from "../auth/auth-types";
import type { Receipt } from "./vault-types";

export type ThemeMode = "light" | "dark" | "system";

export interface Preferences {
  theme: ThemeMode;
  defaultWarrantyMonths: number;
  autoDeleteExpired: boolean;
  warningDays: number;
}

interface VaultContextValue {
  receipts: Receipt[];
  loading: boolean;
  user: AuthenticatedUser | undefined;
  prefs: Preferences;
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (receipt: Receipt) => void;
  removeReceipt: (id: string) => void;
  setPrefs: (next: Partial<Preferences>) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

const DEFAULT_PREFS: Preferences = {
  theme: "system",
  defaultWarrantyMonths: 24,
  autoDeleteExpired: true,
  warningDays: 60,
};

export function VaultProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthenticatedUser | undefined;
}) {
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 750);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = prefs.theme === "dark" || (prefs.theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs.theme]);

  const value = useMemo<VaultContextValue>(
    () => ({
      receipts,
      loading,
      user,
      prefs,
      addReceipt: (receipt) => setReceipts((prev) => [receipt, ...prev]),
      updateReceipt: (receipt) =>
        setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? receipt : r))),
      removeReceipt: (id) => setReceipts((prev) => prev.filter((r) => r.id !== id)),
      setPrefs: (next) => setPrefsState((prev) => ({ ...prev, ...next })),
    }),
    [receipts, loading, user, prefs],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
}

/** True once the component has hydrated on the client. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Simulates a short data fetch so skeletons are visible. */
export function useSimulatedLoad(ms = 650) {
  const [ready, setReady] = useState(false);
  const start = useCallback(() => setReady(false), []);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return { ready, start };
}
