/** Configuração da API a partir do ambiente, com defaults de desenvolvimento. */
export const config = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  /** TTL do access token (curto). */
  accessTokenTtl: "15m",
  /** TTL do refresh token em dias (longo). */
  refreshTokenTtlDays: 30,
  /** Para onde o Strava redireciona após a autorização. */
  stravaRedirectUri:
    process.env.STRAVA_REDIRECT_URI ?? "http://localhost:3333/strava/callback",
  /** Escopo pedido ao Strava (ler atividades). */
  stravaScope: "activity:read_all",
  /** OAuth do Google (login). */
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3333/auth/google/callback",
  /** Para onde o callback devolve o usuário (web) com os tokens. */
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  /** Deep link scheme do app mobile (Expo `scheme` em app.json). */
  mobileScheme: process.env.MOBILE_SCHEME ?? "runup://",
} as const;
