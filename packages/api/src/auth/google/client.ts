export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

/** Troca o código OAuth do Google pelo perfil do usuário. Isolado para testes. */
export interface GoogleClient {
  exchangeCode(code: string): Promise<GoogleProfile>;
}
