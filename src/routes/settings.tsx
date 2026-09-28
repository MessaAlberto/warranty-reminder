import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, HardDrive, Loader2, TriangleAlert, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/vault/AppShell";
import { PageHeader } from "@/components/vault/PageHeader";
import { VaultButton } from "@/components/vault/controls";
import { logout } from "@/auth/auth-functions";
import { requireAuthenticatedRoute } from "@/auth/route-guards";
import { getDriveSettings, testConfiguredDriveConnection } from "@/drive/drive-functions";
import type { DriveStorageStatus } from "@/drive/drive-types";
import { useVault, type ThemeMode } from "@/lib/vault-store";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuthenticatedRoute,
  loader: async () => await getDriveSettings(),
  head: () => ({
    meta: [
      { title: "Impostazioni — Warranty Vault" },
      {
        name: "description",
        content: "Account, vault condiviso e preferenze di garanzia predefinite.",
      },
      { property: "og:title", content: "Impostazioni — Warranty Vault" },
      {
        property: "og:description",
        content: "Account, vault condiviso e preferenze di garanzia predefinite.",
      },
    ],
  }),
  component: SettingsPage,
});

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Chiaro" },
  { id: "dark", label: "Scuro" },
  { id: "system", label: "Sistema" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="glass space-y-4 rounded-2xl p-4 ring-1 ring-border">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { user, prefs, setPrefs } = useVault();
  const navigate = useNavigate();
  const driveSettings = Route.useLoaderData();

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader eyebrow="Il tuo spazio" title="Impostazioni" />

      <div className="relative z-10 space-y-5 px-5 pb-32">
        <Section title="Account">
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-11 place-items-center rounded-full bg-accent/12 font-display text-[14px] font-bold text-accent">
                {user.initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-display text-[16px] tracking-tight">{user.name}</p>
              <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </Section>

        <Section title="Vault condiviso">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 text-accent" aria-hidden />
            <div>
              <p className="font-display text-[15px] tracking-tight">Warranty Vault</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Condiviso con Alberto e Partner. Gli scontrini restano in un'unica cartella privata.
              </p>
            </div>
          </div>
        </Section>

        <DriveStorageSection
          initialStatus={driveSettings.status}
          canConfigure={driveSettings.canConfigure}
        />

        <Section title="Preferenze">
          <div>
            <p className="text-[14px]">Tema</p>
            <div className="mt-2 flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPrefs({ theme: t.id })}
                  aria-pressed={prefs.theme === t.id}
                  className={`min-h-10 flex-1 rounded-full font-mono text-[10px] uppercase tracking-wider ${
                    prefs.theme === t.id
                      ? "bg-foreground text-background"
                      : "ring-1 ring-border text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-[14px]">Garanzia predefinita</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[24, 36, 48, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setPrefs({ defaultWarrantyMonths: m })}
                  aria-pressed={prefs.defaultWarrantyMonths === m}
                  className={`min-h-10 rounded-full px-4 font-mono text-[10px] uppercase tracking-wider ${
                    prefs.defaultWarrantyMonths === m
                      ? "bg-foreground text-background"
                      : "ring-1 ring-border text-muted-foreground"
                  }`}
                >
                  {m} mesi
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span>
              <span className="block text-[14px]">Elimina automaticamente gli scaduti</span>
              <span className="block text-[12px] text-muted-foreground">
                Gli scontrini vengono rimossi 90 giorni dopo la scadenza.
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs.autoDeleteExpired}
              onChange={(e) => setPrefs({ autoDeleteExpired: e.target.checked })}
              className="size-6 shrink-0 accent-[var(--color-accent)]"
            />
          </label>

          <div className="border-t border-border pt-4">
            <label htmlFor="warning-days" className="flex items-center justify-between text-[14px]">
              Avviso di scadenza
              <span className="font-mono text-[12px] text-muted-foreground">
                {prefs.warningDays} giorni prima
              </span>
            </label>
            <input
              id="warning-days"
              type="range"
              min={15}
              max={180}
              step={15}
              value={prefs.warningDays}
              onChange={(e) => setPrefs({ warningDays: Number(e.target.value) })}
              className="mt-3 w-full accent-[var(--color-accent)]"
            />
          </div>
        </Section>

        <VaultButton
          variant="outline"
          className="w-full"
          onClick={async () => {
            await logout();
            navigate({ to: "/" });
          }}
        >
          Esci
        </VaultButton>
      </div>
    </AppShell>
  );
}

function DriveStorageSection({
  initialStatus,
  canConfigure,
}: {
  initialStatus: DriveStorageStatus;
  canConfigure: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      await testConfiguredDriveConnection();
      setStatus("connected");
      toast.success("Connessione a Google Drive riuscita");
    } catch (error) {
      setStatus("connection_error");
      const description =
        error instanceof Error && error.message
          ? error.message
          : "Controlla la configurazione e riprova.";
      toast.error("Connessione a Google Drive non riuscita", { description });
    } finally {
      setTesting(false);
    }
  };

  const statusCopy = {
    connected: {
      label: "Connesso",
      detail: "La cartella Drive Ã¨ pronta per l'uso.",
      icon: CheckCircle2,
    },
    not_configured: {
      label: "Non configurato",
      detail: "La cartella Drive non Ã¨ stata ancora collegata.",
      icon: HardDrive,
    },
    connection_error: {
      label: "Errore di connessione",
      detail: "Controlla la configurazione o ripeti il test.",
      icon: TriangleAlert,
    },
  }[status];
  const StatusIcon = statusCopy.icon;

  return (
    <Section title="Archiviazione Drive">
      <div className="flex items-start gap-3">
        <StatusIcon className="mt-0.5 size-4 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] tracking-tight">{statusCopy.label}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{statusCopy.detail}</p>
        </div>
      </div>
      <div className="flex gap-2 border-t border-border pt-4">
        {canConfigure && status !== "connected" ? (
          <button
            type="button"
            onClick={() => window.location.assign("/auth/drive/start")}
            className="min-h-10 rounded-full bg-foreground px-4 font-mono text-[10px] uppercase tracking-wider text-background"
          >
            Configura archiviazione
          </button>
        ) : null}
        {status !== "not_configured" ? (
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="min-h-10 rounded-full px-4 font-mono text-[10px] uppercase tracking-wider ring-1 ring-border disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              "Testa connessione"
            )}
          </button>
        ) : null}
      </div>
    </Section>
  );
}
