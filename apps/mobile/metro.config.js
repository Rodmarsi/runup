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
config.resolver.disableHierarchicalLookup = true;
// Metro ignora o campo "exports" do package.json por padrão — precisamos
// dele pra resolver subpaths como "@runup/ui/tokens".
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
