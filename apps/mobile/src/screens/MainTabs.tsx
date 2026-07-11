import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";
import { HomeScreen } from "./HomeScreen.js";
import { TreinosScreen } from "./TreinosScreen.js";
import { AgendaScreen } from "./AgendaScreen.js";
import { EvolucaoScreen } from "./EvolucaoScreen.js";

type Tab = "hoje" | "treinos" | "agenda" | "evolucao";

const TABS: { key: Tab; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "treinos", label: "Treinos" },
  { key: "agenda", label: "Agenda" },
  { key: "evolucao", label: "Evolução" },
];

export function MainTabs() {
  const [tab, setTab] = useState<Tab>("hoje");

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {tab === "hoje" && <HomeScreen onOpenProfile={() => setTab("evolucao")} />}
        {tab === "treinos" && <TreinosScreen />}
        {tab === "agenda" && <AgendaScreen />}
        {tab === "evolucao" && <EvolucaoScreen />}
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
