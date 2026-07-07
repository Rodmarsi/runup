import type { PrismaClient } from "@runup/db";
import type { User } from "@runup/types";
import { errors } from "../errors.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "./tokens.js";
import type { RegisterInput, LoginInput } from "./schemas.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: Pick<User, "id" | "name" | "email" | "role">;
}

/** Serviço de autenticação. Recebe o Prisma client por injeção (testável). */
export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.db.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw errors.emailInUse();

    const passwordHash = await hashPassword(input.password);
    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        authProvider: "email",
        passwordHash,
      },
    });

    return this.issue(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.passwordHash) throw errors.invalidCredentials();

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw errors.invalidCredentials();

    return this.issue(user);
  }

  /** Rotaciona o refresh token: revoga o antigo e emite um novo par. */
  async refresh(rawToken: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(rawToken);
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw errors.invalidRefreshToken();
    }

    await this.db.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.userId, stored.user.role);
  }

  /** Revoga um refresh token (logout). */
  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawToken);
    await this.db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: {
    id: string;
    name: string;
    email: string;
    role: "student" | "coach";
  }): Promise<AuthResult> {
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      ...tokens,
      user: {
        id: user.id as User["id"],
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async issueTokens(
    userId: string,
    role: "student" | "coach",
  ): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: userId, role });
    const { raw, hash } = generateRefreshToken();
    await this.db.refreshToken.create({
      data: { userId, tokenHash: hash, expiresAt: refreshTokenExpiry() },
    });
    return { accessToken, refreshToken: raw };
  }
}
