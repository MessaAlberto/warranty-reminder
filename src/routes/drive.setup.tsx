import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Copy, FolderOpen, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import {
  cancelDriveSetup,
  completeDriveSetup,
  getDrivePickerConfiguration,
} from "@/drive/drive-functions";
import { requireStorageOwnerRoute } from "@/drive/drive-route-guards";
import type { DrivePickerConfiguration, DriveSetupResult } from "@/drive/drive-types";

export const Route = createFileRoute("/drive/setup")({
  beforeLoad: requireStorageOwnerRoute,
  loader: async () => await getDrivePickerConfiguration(),
  component: DriveSetupPage,
});

type PickerDocument = { id?: string };
type PickerResponse = { action?: string; docs?: PickerDocument[] };
type PickerView = {
  setIncludeFolders: (included: boolean) => PickerView;
  setSelectFolderEnabled: (enabled: boolean) => PickerView;
  setMode: (mode: string) => PickerView;
};
type PickerBuilder = {
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (projectNumber: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  addView: (view: PickerView) => PickerBuilder;
  setCallback: (callback: (response: PickerResponse) => void) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};
type GooglePicker = {
  ViewId: { FOLDERS: string };
  DocsViewMode: { LIST: string };
  Action: { PICKED: string; CANCEL: string };
  DocsView: new (viewId: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
};
type PickerWindow = Window & {
  gapi?: { load: (library: string, callback: () => void) => void };
  google?: { picker?: GooglePicker };
};

function loadPickerLibrary(): Promise<GooglePicker> {
  return new Promise((resolve, reject) => {
    const pickerWindow = window as PickerWindow;
    const finish = () => {
      const picker = pickerWindow.google?.picker;
      if (picker) resolve(picker);
      else reject(new Error("Google Picker could not be loaded."));
    };
    if (pickerWindow.google?.picker) {
      finish();
      return;
    }

    const loadGapi = () => pickerWindow.gapi?.load("picker", finish);
    if (pickerWindow.gapi) {
      loadGapi();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = loadGapi;
    script.onerror = () => reject(new Error("Google Picker could not be loaded."));
    document.head.appendChild(script);
  });
}

function DriveSetupPage() {
  const pickerConfiguration = Route.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<DriveSetupResult>();

  if (!pickerConfiguration) return null;

  const cancelSetup = async () => {
    try {
      await cancelDriveSetup();
    } finally {
      setBusy(false);
    }
  };

  const selectFolder = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const picker = await loadPickerLibrary();
      openPicker(
        picker,
        pickerConfiguration,
        async (folderId) => {
          try {
            const setupResult = await completeDriveSetup({ data: { folderId } });
            setResult(setupResult);
          } catch {
            setError(
              "La cartella non ha superato il test di connessione. Riprova la configurazione.",
            );
          } finally {
            setBusy(false);
          }
        },
        () => void cancelSetup(),
      );
    } catch {
      setError("Google Picker is unavailable. Check the Google Cloud configuration.");
      await cancelSetup();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <section className="glass w-full max-w-lg space-y-5 rounded-2xl p-6 ring-1 ring-border">
        {result ? (
          <SetupResult result={result} onDone={() => navigate({ to: "/settings" })} />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-accent/12 text-accent">
                <FolderOpen className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Configurazione proprietario
                </p>
                <h1 className="font-display text-xl tracking-tight">Collega Drive</h1>
              </div>
            </div>
            <p className="text-[14px] text-muted-foreground">
              Scegli la cartella esistente WarrantyVault. Sara verificata creando, leggendo ed
              eliminando un file temporaneo.
            </p>
            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
            <button
              type="button"
              onClick={selectFolder}
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 font-display text-[14px] text-background disabled:opacity-70"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FolderOpen className="size-4" aria-hidden />
              )}
              Scegli cartella Drive
            </button>
            <button
              type="button"
              onClick={async () => {
                await cancelSetup();
                navigate({ to: "/settings" });
              }}
              className="block w-full text-center text-[13px] text-muted-foreground underline"
            >
              Cancel
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function openPicker(
  picker: GooglePicker,
  configuration: DrivePickerConfiguration,
  onFolderSelected: (folderId: string) => void,
  onCancel: () => void,
) {
  const view = new picker.DocsView(picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setMode(picker.DocsViewMode.LIST);
  const dialog = new picker.PickerBuilder()
    .setDeveloperKey(configuration.apiKey)
    .setAppId(configuration.projectNumber)
    .setOAuthToken(configuration.accessToken)
    .addView(view)
    .setCallback((response) => {
      if (response.action === picker.Action.PICKED) {
        const folderId = response.docs?.[0]?.id;
        if (folderId) onFolderSelected(folderId);
        else onCancel();
      } else if (response.action === picker.Action.CANCEL) {
        onCancel();
      }
    })
    .build();
  dialog.setVisible(true);
}

function SetupResult({ result, onDone }: { result: DriveSetupResult; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyFolderId = async () => {
    await navigator.clipboard.writeText(result.folderId);
    setCopied(true);
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-accent/12 text-accent">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Test passed
          </p>
          <h1 className="font-display text-xl tracking-tight">Configuration ready</h1>
        </div>
      </div>
      <p className="text-[14px] text-muted-foreground">
        The server saved the one-time values in local drive-setup.env. Copy them to .env.local and
        Vercel, then delete that file.
      </p>
      <div className="rounded-xl border border-border p-3">
        <p className="font-mono text-[10px] text-muted-foreground">GOOGLE_DRIVE_ROOT_FOLDER_ID</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate text-[12px]">{result.folderId}</code>
          <button type="button" onClick={copyFolderId} className="shrink-0 text-[12px] text-accent">
            <Copy className="mr-1 inline size-3" aria-hidden /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 font-display text-[14px] text-background"
      >
        <ShieldCheck className="size-4" aria-hidden /> Done
      </button>
    </>
  );
}
