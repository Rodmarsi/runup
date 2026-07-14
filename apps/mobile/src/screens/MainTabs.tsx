import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";
import { useNav } from "../nav.js";
import { HomeScreen } from "./HomeScreen.js";
import { PlanoScreen } from "./PlanoScreen.js";
import { AtividadesScreen } from "./AtividadesScreen.js";
import { ProfileScreen } from "./ProfileScreen.js";
import { DayDetailScreen } from "./DayDetailScreen.js";
import { RacesScreen } from "./RacesScreen.js";
import { RaceDetailScreen } from "./RaceDetailScreen.js";
import { AnalisesScreen } from "./AnalisesScreen.js";
import { BodyInfoScreen } from "./BodyInfoScreen.js";
import { EquipmentScreen } from "./EquipmentScreen.js";
import { ShoeDetailScreen } from "./ShoeDetailScreen.js";
import { SettingsScreen } from "./SettingsScreen.js";
import { ActivityDetailScreen } from "./ActivityDetailScreen.js";

type Tab = "hoje" | "plano" | "atividades" | "analises" | "perfil";

const TABS: { key: Tab; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "plano", label: "Plano" },
  { key: "atividades", label: "Atividades" },
  { key: "analises", label: "Análises" },
];

/**
 * Aba ativa + qualquer tela "de detalhe" aberta a partir dela (dia, prova,
 * análises, informações...). Essas telas renderizam aqui dentro — não no
 * Router de nível superior — pra manter a tab bar visível e fazer "voltar"
 * retornar pra aba de onde a navegação partiu.
 */
export function MainTabs() {
  const [tab, setTab] = useState<Tab>("hoje");
  const { route, goHome } = useNav();

  function selectTab(t: Tab) {
    setTab(t);
    if (route.name !== "home") goHome();
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {route.name === "day" ? (
          <DayDetailScreen date={route.date} />
        ) : route.name === "races" ? (
          <RacesScreen />
        ) : route.name === "raceDetail" ? (
          <RaceDetailScreen race={route.race} />
        ) : route.name === "bodyInfo" ? (
          <BodyInfoScreen />
        ) : route.name === "equipment" ? (
          <EquipmentScreen />
        ) : route.name === "shoeDetail" ? (
          <ShoeDetailScreen shoe={route.shoe} />
        ) : route.name === "settings" ? (
          <SettingsScreen />
        ) : route.name === "activity" ? (
          <ActivityDetailScreen log={route.log} />
        ) : (
          <>
            {tab === "hoje" && <HomeScreen onOpenProfile={() => selectTab("perfil")} />}
            {tab === "plano" && <PlanoScreen />}
            {tab === "atividades" && <AtividadesScreen />}
            {tab === "analises" && <AnalisesScreen />}
            {tab === "perfil" && <ProfileScreen />}
          </>
        )}
      </View>

      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => selectTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={active ? styles.tabActiveText : styles.tabText}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: "row",
    gap: 4,
    margin: 14,
    padding: 6,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 99 },
  tabActive: { backgroundColor: color.orangeDim },
  tabText: { fontFamily: font.regular, fontSize: 11, color: color.textMuted },
  tabActiveText: { fontFamily: font.semibold, fontSize: 11, color: color.orange400 },
});
