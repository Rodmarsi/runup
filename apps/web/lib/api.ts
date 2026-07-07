import { RunUpClient, type TokenStore } from "@runup/api-client";

const TOKEN_KEY = "runup.accessToken";

/** Token no localStorage (guardado contra SSR). */
const tokenStore: TokenStore = {
  get: () =>
    typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY),
  set: (token) => {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export const api = new RunUpClient({ baseUrl: BASE_URL, tokens: tokenStore });

export function hasToken(): boolean {
  return typeof window !== "undefined" && !!window.localStorage.getItem(TOKEN_KEY);
}
