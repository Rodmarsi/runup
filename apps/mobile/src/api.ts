import * as SecureStore from "expo-secure-store";
import { RunUpClient, type TokenStore } from "@runup/api-client";

const TOKEN_KEY = "runup.accessToken";

/** Guarda o token no armazenamento seguro do dispositivo. */
const tokenStore: TokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: async (token) => {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

/** URL da API — ajuste para o IP da máquina ao rodar em device físico. */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

export const api = new RunUpClient({ baseUrl: BASE_URL, tokens: tokenStore });
