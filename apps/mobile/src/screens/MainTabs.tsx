import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";
import { HomeScreen } from "./HomeScreen.js";
import { PlanoScreen } from "./PlanoScreen.js";
import { AtividadesScreen } from "./AtividadesScreen.js";
import { ProfileScreen } from "./ProfileScreen.js";

type Tab = "hoje" | "plano" | "atividades" | "perfil";

const TABS: { key: Tab; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "plano", label: "Plano" },
  { key: "atividades", label: "Atividades" },
  { key: "perfil", label: "Perfil" },
];

export function MainTabs() {
  const [tab, setTab] = useState<Tab>("hoje");

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {tab === "hoje" && <HomeScreen onOpenProfile={() => setTab("perfil")} />}
        {tab === "plano" && <PlanoScreen />}
        {tab === "atividades" && <AtividadesScreen />}
        {tab === "perfil" && <ProfileScreen />}
      </View>

      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
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
