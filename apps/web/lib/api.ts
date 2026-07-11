import { RunUpClient, type TokenStore } from "@runup/api-client";

const TOKEN_KEY = "runup.accessToken";
const REFRESH_KEY = "runup.refreshToken";

/** Token no localStorage (guardado contra SSR). */
function localStorageOf(key: string): TokenStore {
  return {
    get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(key)),
    set: (token) => {
      if (typeof window === "undefined") return;
      if (token) window.localStorage.setItem(key, token);
      else window.localStorage.removeItem(key);
    },
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export const api = new RunUpClient({
  baseUrl: BASE_URL,
  tokens: localStorageOf(TOKEN_KEY),
  refreshTokens: localStorageOf(REFRESH_KEY),
});

export function hasToken(): boolean {
  return typeof window !== "undefined" && !!window.localStorage.getItem(TOKEN_KEY);
}
