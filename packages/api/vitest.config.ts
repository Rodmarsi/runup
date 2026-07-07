import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://runup:runup@localhost:5432/runup_test?schema=public";

export default defineConfig({
  test: {
    globalSetup: "./test/global-setup.ts",
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret",
    },
    // Testes de integração compartilham o banco — evita corridas entre arquivos.
    fileParallelism: false,
  },
});
