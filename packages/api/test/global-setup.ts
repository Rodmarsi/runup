import { execSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://runup:runup@localhost:5432/runup_test?schema=public";

/** Sincroniza o schema no banco de teste antes de rodar a suíte. */
export default function setup() {
  execSync("pnpm --filter @runup/db exec prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
