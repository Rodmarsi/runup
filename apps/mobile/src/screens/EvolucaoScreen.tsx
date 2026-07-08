import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import type {
  Stats,
  PersonalRecordDto,
  GoalDto,
  StravaStatus,
  ConversationDto,
} from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useAuth } from "../auth.js";
import { km, duration } from "../format.js";

const RACE_LABEL: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "21k": "21 km",
  "42k": "42 km",
  other: "Prova",
};

export function EvolucaoScreen() {
  const { navigate } = useNav();
  const { logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [prs, setPrs] = useState<PersonalRecordDto[]>([]);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [strava, setStrava] = useState<StravaStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [s, p, g, st, conv] = await Promise.all([
      api.stats(),
      api.personalRecords(),
      api.goals(),
      api.stravaStatus(),
      api.conversations(),
    ]);
    setStats(s);
    setPrs(p);
    setGoals(g);
    setStrava(st);
    setConversations(conv);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      await api.stravaSync();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function connectStrava() {
    const { url } = await api.stravaAuthorizeUrl();
    await Linking.openURL(url);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={text.screenTitle}>Evolução</Text>

      {/* Estatísticas */}
      <View style={styles.statGrid}>
        <Stat label="Distância total" value={`${km(stats?.totalDistanceMeters ?? 0)} km`} />
        <Stat label="Tempo total" value={duration(stats?.totalTimeSeconds ?? 0)} />
        <Stat label="Treinos" value={String(stats?.workoutCount ?? 0)} />
        <Stat label="Streak" value={`${stats?.streakDays ?? 0} dias`} />
      </View>

      {/* Treinador / chat */}
      {conversations.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>SEU TREINADOR</Text>
          {conversations.map((c) => (
            <Pressable
              key={c.linkId}
              onPress={() =>
                navigate({ name: "chat", linkId: c.linkId, withName: c.with.name })
              }
              style={styles.rowCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.with.name}</Text>
                <Text style={text.muted}>
                  {c.lastMessage?.text.slice(0, 40) ?? "Abrir conversa"}
                </Text>
              </View>
              {c.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{c.unread}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}

      {/* Meta */}
      {goals.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>SUA META</Text>
          {goals.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => navigate({ name: "goal", goalId: g.id })}
              style={styles.rowCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {g.raceName ?? RACE_LABEL[g.targetRace]}
                </Text>
                <Text style={text.muted}>{g.raceDate.slice(0, 10)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}

      {/* Recordes */}
      <Text style={[text.overline, styles.label]}>RECORDES PESSOAIS</Text>
      {prs.length === 0 ? (
        <Text style={text.muted}>Nenhum recorde ainda.</Text>
      ) : (
        <View style={styles.prGrid}>
          {prs.map((pr) => (
            <View key={pr.id} style={styles.prCard}>
              <Text style={text.muted}>{RACE_LABEL[pr.distance]}</Text>
              <Text style={styles.prTime}>{duration(pr.timeSeconds)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Strava */}
      <Text style={[text.overline, styles.label]}>STRAVA</Text>
      <View style={styles.rowCard}>
        <Text style={[text.body, { flex: 1 }]}>
          {strava?.connected ? "Conectado" : "Não conectado"}
        </Text>
        {strava?.connected ? (
          <Pressable onPress={sync} disabled={syncing} style={styles.syncBtn}>
            <Text style={styles.syncText}>{syncing ? "..." : "Sincronizar"}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={connectStrava} style={styles.syncBtn}>
            <Text style={styles.syncText}>Conectar</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={text.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { marginTop: 18, marginBottom: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  statCard: {
    width: "48%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  statValue: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginTop: 6 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  prGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prCard: {
    width: "48%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  prTime: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginTop: 4 },
  syncBtn: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncText: { fontFamily: font.semibold, fontSize: 11, color: color.orange400 },
  badge: {
    backgroundColor: color.orange500,
    borderRadius: 99,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: 6,
  },
  badgeText: { fontFamily: font.semibold, fontSize: 10, color: color.ink },
  logout: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  logoutText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
});
