import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { AppHeader } from "../components/AppHeader.js";
import { HomeScreen } from "./HomeScreen.js";
import { PlanoScreen } from "./PlanoScreen.js";
import { AtividadesScreen } from "./AtividadesScreen.js";
import { ProfileScreen } from "./ProfileScreen.js";
import { DayDetailScreen } from "./DayDetailScreen.js";
import { RacesScreen } from "./RacesScreen.js";
import { RaceDetailScreen } from "./RaceDetailScreen.js";
import { BodyInfoScreen } from "./BodyInfoScreen.js";
import { EquipmentScreen } from "./EquipmentScreen.js";
import { ShoeDetailScreen } from "./ShoeDetailScreen.js";
import { SettingsScreen } from "./SettingsScreen.js";
import { NotificationsScreen } from "./NotificationsScreen.js";
import { ActivityDetailScreen } from "./ActivityDetailScreen.js";

type Tab = "hoje" | "plano" | "atividades" | "perfil";

const TABS: { key: Tab; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "plano", label: "Plano" },
  { key: "atividades", label: "Atividades" },
];

// Telas que ocupam a tela inteira, sem o header/tab bar globais (o próprio
// avatar de perfil ou a lista de notificações não precisam de outro sino).
const FULLSCREEN_ROUTES = new Set(["notifications", "settings"]);

/**
 * Aba ativa + qualquer tela "de detalhe" aberta a partir dela (dia, prova,
 * informações...). Essas telas renderizam aqui dentro — não no Router de
 * nível superior — pra manter a tab bar visível e fazer "voltar" retornar
 * pra aba de onde a navegação partiu.
 */
export function MainTabs() {
  const [tab, setTab] = useState<Tab>("hoje");
  const [streakDays, setStreakDays] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const { route, navigate, goHome } = useNav();

  function loadHeaderData() {
    api.stats().then((s) => setStreakDays(s.streakDays)).catch(() => {});
    api.unreadNotificationCount().then((r) => setUnreadCount(r.count)).catch(() => {});
  }

  useEffect(loadHeaderData, []);
  // Sino zera a contagem ao entrar — atualiza de volta ao sair da tela.
  useEffect(() => {
    if (route.name !== "notifications") loadHeaderData();
  }, [route.name]);

  function selectTab(t: Tab) {
    setTab(t);
    if (route.name !== "home") goHome();
  }

  const showGlobalChrome = !FULLSCREEN_ROUTES.has(route.name);

  return (
    <View style={styles.container}>
      {showGlobalChrome && (
        <AppHeader
          streakDays={streakDays}
          unreadCount={unreadCount}
          onOpenProfile={() => selectTab("perfil")}
          onOpenNotifications={() => navigate({ name: "notifications" })}
        />
      )}
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
        ) : route.name === "notifications" ? (
          <NotificationsScreen />
        ) : route.name === "activity" ? (
          <ActivityDetailScreen log={route.log} />
        ) : (
          <>
            {tab === "hoje" && <HomeScreen />}
            {tab === "plano" && <PlanoScreen />}
            {tab === "atividades" && <AtividadesScreen />}
            {tab === "perfil" && <ProfileScreen />}
          </>
        )}
      </View>

      {showGlobalChrome && (
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
      )}
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
