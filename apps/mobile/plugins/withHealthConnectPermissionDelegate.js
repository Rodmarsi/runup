const { withMainActivity, mergeContents } = require("@expo/config-plugins");

/**
 * O plugin oficial do react-native-health-connect só mexe no
 * AndroidManifest — o registro do permission delegate na MainActivity (pra
 * receber o resultado do diálogo de permissões do Health Connect) tem que
 * ser feito à mão, e a MainActivity é regenerada a cada `expo prebuild`,
 * então precisa ser um plugin, não uma edição manual do arquivo.
 */
module.exports = function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error(
        "withHealthConnectPermissionDelegate só suporta MainActivity em Kotlin.",
      );
    }

    let contents = config.modResults.contents;

    contents = mergeContents({
      src: contents,
      newSrc: "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate",
      tag: "health-connect-import",
      anchor: /^import com\.facebook\.react\.ReactActivity$/m,
      offset: 0,
      comment: "//",
    }).contents;

    contents = mergeContents({
      src: contents,
      newSrc: "    HealthConnectPermissionDelegate.setPermissionDelegate(this)",
      tag: "health-connect-permission-delegate",
      anchor: /super\.onCreate\(null\)/,
      offset: 1,
      comment: "//",
    }).contents;

    config.modResults.contents = contents;
    return config;
  });
};
