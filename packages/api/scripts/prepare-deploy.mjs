import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(apiDir, "package.json"), "utf-8"));

const runtimeDeps = Object.fromEntries(
  Object.entries(pkg.dependencies).filter(([name]) => !name.startsWith("@runup/")),
);
// CLI usada só em runtime (CMD do Docker) para `prisma migrate deploy`, não é
// importada pelo código — não fica em "dependencies" do package.json normal.
runtimeDeps.prisma = pkg.dependencies["@prisma/client"];

mkdirSync(path.join(apiDir, "deploy"), { recursive: true });
writeFileSync(
  path.join(apiDir, "deploy", "package.json"),
  JSON.stringify(
    { name: "runup-api-runtime", private: true, type: "module", dependencies: runtimeDeps },
    null,
    2,
  ) + "\n",
);
