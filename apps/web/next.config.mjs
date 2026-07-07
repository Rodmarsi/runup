/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
