import { fileURLToPath } from "node:url";
import path from "node:path";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Imagem enxuta para Docker: gera um servidor Node autocontido em .next/standalone.
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@runup/ui", "@runup/api-client", "@runup/types"],
  webpack(config) {
    // Os pacotes do workspace usam specifiers ESM ".js" apontando para ".ts".
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
