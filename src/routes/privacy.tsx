import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Warranty Vault" },
      {
        name: "description",
        content: "Informativa sulla privacy di Warranty Vault.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">
        <a
          href="/"
          className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          Warranty Vault
        </a>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">
          Informativa sulla privacy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Ultimo aggiornamento: 6 ottobre 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-muted-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              1. Finalità dell'app
            </h2>
            <p className="mt-2">
              Warranty Vault è un'app privata per conservare scontrini e informazioni sulle garanzie
              dei prodotti e per condividerli esclusivamente tra gli utenti autorizzati.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">2. Dati trattati</h2>
            <p className="mt-2">
              L'app può trattare l'indirizzo email e le informazioni di base necessarie
              all'autenticazione con Google, oltre ai dati inseriti o ricavati dagli scontrini, come
              immagini, negozio, data di acquisto, prodotti, prezzi, note e informazioni relative
              alla garanzia.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              3. Accesso a Google Drive
            </h2>
            <p className="mt-2">
              L'app usa lo scope Google Drive <code>drive.file</code>. L'accesso è utilizzato
              esclusivamente per gestire i file e le cartelle che l'utente crea, seleziona o usa con
              Warranty Vault. Gli scontrini e i relativi metadati vengono conservati nel Google
              Drive dell'account configurato come proprietario dell'archivio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              4. Servizi utilizzati
            </h2>
            <p className="mt-2">
              Google Drive viene utilizzato per l'archiviazione. Google Cloud Vision può elaborare
              le immagini degli scontrini per il riconoscimento ottico del testo. Il testo OCR può
              essere inviato a Groq per estrarre dati strutturati; l'immagine originale dello
              scontrino non viene inviata a Groq. Vercel ospita l'applicazione e il relativo
              backend.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              5. Uso e condivisione dei dati
            </h2>
            <p className="mt-2">
              I dati vengono utilizzati solo per fornire le funzionalità dell'app. Non vengono
              venduti, utilizzati per pubblicità o condivisi con terzi per finalità commerciali.
              Possono essere trattati dai fornitori tecnici indicati sopra solo nella misura
              necessaria al funzionamento del servizio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              6. Conservazione e cancellazione
            </h2>
            <p className="mt-2">
              I dati degli scontrini restano nel Google Drive configurato finché non vengono
              eliminati dall'utente o dalle funzioni di gestione e pulizia previste dall'app.
              L'utente che controlla il Drive può inoltre eliminare direttamente i file archiviati.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">7. Dati Google</h2>
            <p className="mt-2">
              L'uso delle informazioni ricevute dalle API di Google è limitato alle funzionalità
              dichiarate dell'app ed è soggetto alla Google API Services User Data Policy, inclusi i
              requisiti di Limited Use.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">8. Contatti</h2>
            <p className="mt-2">
              Per richieste relative alla privacy puoi scrivere a{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href="mailto:albertomessa143@gmail.com"
              >
                albertomessa143@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm">
          <a className="text-foreground underline underline-offset-4" href="/terms">
            Termini di servizio
          </a>
        </div>
      </article>
    </main>
  );
}
