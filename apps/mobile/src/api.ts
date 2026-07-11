import * as SecureStore from "expo-secure-store";
import { RunUpClient, type TokenStore } from "@runup/api-client";

const TOKEN_KEY = "runup.accessToken";
const REFRESH_KEY = "runup.refreshToken";

function secureStoreOf(key: string): TokenStore {
  return {
    get: () => SecureStore.getItemAsync(key),
    set: async (token) => {
      if (token) await SecureStore.setItemAsync(key, token);
      else await SecureStore.deleteItemAsync(key);
    },
  };
}

/** URL da API — ajuste para o IP da máquina ao rodar em device físico. */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

export const api = new RunUpClient({
  baseUrl: BASE_URL,
  tokens: secureStoreOf(TOKEN_KEY),
  refreshTokens: secureStoreOf(REFRESH_KEY),
});
