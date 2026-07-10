// Metro configurado para o monorepo pnpm — resolve pacotes @runup/* dos workspaces.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Metro ignora o campo "exports" do package.json por padrão — precisamos
// dele pra resolver subpaths como "@runup/ui/tokens".
config.resolver.unstable_enablePackageExports = true;

// O código usa specifiers ESM ".js" apontando pra arquivos ".ts"/".tsx"
// (mesma convenção do resto do monorepo). Metro só tenta o arquivo literal
// "*.js", então caímos pro resolver padrão (já disponível em `context`,
// sem precisar importar "metro-resolver" — que não é resolvível a partir
// de apps/mobile no isolamento estrito do pnpm) trocando a extensão quando
// o import é relativo e termina em ".js".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    for (const ext of [".tsx", ".ts", ".js"]) {
      try {
        return context.resolveRequest(
          context,
          moduleName.slice(0, -3) + ext,
          platform,
        );
      } catch (error) {
        // tenta a próxima extensão
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
