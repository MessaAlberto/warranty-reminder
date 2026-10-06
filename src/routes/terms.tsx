import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termini di servizio — Warranty Vault" },
      {
        name: "description",
        content: "Termini di servizio di Warranty Vault.",
      },
    ],
  }),
  component: TermsOfService,
});

function TermsOfService() {
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
          Termini di servizio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Ultimo aggiornamento: 6 ottobre 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-muted-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              1. Uso del servizio
            </h2>
            <p className="mt-2">
              Warranty Vault è un'app privata destinata alla gestione domestica di scontrini e
              garanzie. L'accesso è limitato agli account Google esplicitamente autorizzati dal
              proprietario dell'app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              2. Responsabilità dell'utente
            </h2>
            <p className="mt-2">
              L'utente è responsabile dei contenuti caricati e deve avere il diritto di conservarli
              e trattarli. Le informazioni estratte automaticamente dagli scontrini devono essere
              controllate prima di essere considerate corrette.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              3. Informazioni sulle garanzie
            </h2>
            <p className="mt-2">
              Le date e le durate delle garanzie mostrate dall'app sono strumenti organizzativi e
              non costituiscono consulenza legale né una conferma della validità di una garanzia.
              Fanno fede i documenti originali, le condizioni del venditore e la normativa
              applicabile.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              4. Servizi di terze parti
            </h2>
            <p className="mt-2">
              Alcune funzionalità dipendono da servizi esterni, tra cui Google, Vercel e Groq.
              Interruzioni, modifiche o limitazioni di tali servizi possono rendere temporaneamente
              indisponibili alcune funzioni dell'app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              5. Disponibilità e modifiche
            </h2>
            <p className="mt-2">
              L'app viene fornita per uso privato senza garanzia di disponibilità continua. Le
              funzionalità e questi termini possono essere aggiornati quando necessario per
              mantenere o modificare il servizio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">6. Contatti</h2>
            <p className="mt-2">
              Per richieste relative al servizio puoi scrivere a{" "}
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
          <a className="text-foreground underline underline-offset-4" href="/privacy">
            Informativa sulla privacy
          </a>
        </div>
      </article>
    </main>
  );
}
