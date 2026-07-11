import type { PrismaClient } from "@runup/db";
import type { UserRole } from "@runup/types";
import { config } from "../../config.js";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
  signGoogleState,
  verifyGoogleState,
  type GoogleAuthPlatform,
} from "../tokens.js";
import type { GoogleClient } from "./client.js";

export interface GoogleLoginResult {
  accessToken: string;
  refreshToken: string;
  created: boolean;
  platform: GoogleAuthPlatform;
}

export class GoogleAuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: GoogleClient,
  ) {}

  /** URL de autorização do Google, com o papel e a plataforma escolhidos no `state`. */
  buildAuthorizeUrl(role: UserRole, platform: GoogleAuthPlatform): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: config.googleRedirectUri,
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state: signGoogleState(role, platform),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Callback: valida o `state`, troca o código pelo perfil e faz login —
   * cria a conta (com o papel do state) se o email ainda não existir.
   */
  async handleCallback(code: string, state: string): Promise<GoogleLoginResult> {
    const { role, platform } = verifyGoogleState(state);
    const profile = await this.client.exchangeCode(code);

    let user = await this.db.user.findUnique({
      where: { email: profile.email },
    });
    let created = false;
    if (!user) {
      user = await this.db.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          role,
          authProvider: "google",
          avatarUrl: profile.picture,
        },
      });
      created = true;
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const { raw, hash } = generateRefreshToken();
    await this.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: refreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken: raw, created, platform };
  }
}
