import { AppError } from "../../errors.js";
import { config } from "../../config.js";
import type { GoogleClient, GoogleProfile } from "./client.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

interface TokenResponse {
  access_token?: string;
  error_description?: string;
}
interface UserInfo {
  email?: string;
  name?: string;
  picture?: string;
}

/** Implementação real do cliente Google (troca de código + userinfo). */
export class HttpGoogleClient implements GoogleClient {
  constructor(
    private readonly clientId = process.env.GOOGLE_CLIENT_ID,
    private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET,
  ) {
    if (!clientId || !clientSecret) {
      throw new AppError(
        500,
        "GOOGLE_NOT_CONFIGURED",
        "Login com Google indisponível: defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET",
      );
    }
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: config.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenRes.json().catch(() => ({}))) as TokenResponse;
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(
        502,
        "GOOGLE_ERROR",
        `Falha na troca de código: ${token.error_description ?? tokenRes.status}`,
      );
    }

    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const info = (await infoRes.json().catch(() => ({}))) as UserInfo;
    if (!infoRes.ok || !info.email) {
      throw new AppError(502, "GOOGLE_ERROR", "Não foi possível ler o perfil Google");
    }

    return {
      email: info.email,
      name: info.name ?? info.email.split("@")[0]!,
      picture: info.picture,
    };
  }
}
