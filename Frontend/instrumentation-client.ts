import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV ?? "production",
    sendDefaultPii: false,
    // Ignora erros de rede e de reprodução de áudio (não são bugs do app)
    ignoreErrors: [
      "NotAllowedError",       // autoplay bloqueado pelo browser
      "AbortError",            // fetch cancelado pelo usuário
      "NetworkError",
      "Failed to fetch",
    ],
  });
}
