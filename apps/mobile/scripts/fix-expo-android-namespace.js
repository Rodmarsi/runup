// A EAS Build ignora o campo "packageManager" e usa sua própria versão fixa
// do pnpm (confirmado: 9.15.5), que não aplica o pnpm patch declarado em
// pnpm-workspace.yaml/package.json (only-local, funciona com pnpm 11 mas não
// lá). Então corrigimos aqui, direto, depois do install: o pacote "expo"
// declara namespace "expo.core" no android/build.gradle, mas o código real
// vive no pacote "expo.modules" (ExpoModulesPackage.kt) — essa divergência
// faz o autolinking do React Native gerar um import inexistente
// ("expo.core.ExpoModulesPackage") e quebrar o build nativo Android.
const fs = require("fs");
const path = require("path");

const gradlePath = path.join(
  path.dirname(require.resolve("expo/package.json")),
  "android/build.gradle",
);

const contents = fs.readFileSync(gradlePath, "utf8");
const fixed = contents.replace(/namespace\s+"expo\.core"/, 'namespace "expo.modules"');

if (fixed !== contents) {
  fs.writeFileSync(gradlePath, fixed);
  console.log("Corrigido: namespace do expo/android/build.gradle (expo.core -> expo.modules)");
} else {
  console.log("Nada a corrigir: namespace do expo/android/build.gradle já está OK ou não encontrado");
}
