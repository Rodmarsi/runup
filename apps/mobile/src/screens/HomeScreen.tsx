import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutDayDto, Stats } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { useAuth } from "../auth.js";
import { useNav } from "../nav.js";
import { api } from "../api.js";
import { km, pace } from "../format.js";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Descreve o primeiro item de corrida de um dia, para o card hero. */
function summarize(day: WorkoutDayDto): { title: string; sub: string } {
  const running = day.blocks
    .flatMap((b) => b.items)
    .find((i) => i.kind === "running");
  if (running && running.kind === "running") {
    const dist = running.distanceMeters ? `${km(running.distanceMeters)} km` : null;
    const p = running.targetPaceSecPerKm
      ? `pace ${pace(running.targetPaceSecPerKm)}/km`
      : null;
    return {
      title: running.interval
        ? `Tiros · ${running.interval.reps}× ${running.interval.repDistanceMeters ?? ""}m`
        : "Corrida",
      sub: [dist, p].filter(Boolean).join(" · ") || "Treino do dia",
    };
  }
  return { title: "Treino do dia", sub: "Força / mobilidade" };
}

export function HomeScreen() {
  const { user } = useAuth();
  const { navigate } = useNav();
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.calendar(), api.stats()])
      .then(([cal, st]) => {
        setDays(cal);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }

  const today = isoToday();
  const todayDay = days.find((d) => d.date.slice(0, 10) === today);
  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const weekDates = currentWeek();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <View>
              <Text style={text.muted}>Bom dia,</Text>
              <Text style={text.cardTitle}>{user?.name ?? ""}</Text>
            </View>
          </View>
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 {stats?.streakDays ?? 0}</Text>
          </View>
        </View>

        {/* Sua semana */}
        <Text style={[text.overline, styles.section]}>SUA SEMANA</Text>
        <View style={styles.week}>
          {weekDates.map((iso) => {
            const d = byDate.get(iso);
            const isToday = iso === today;
            const dow = WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
            return (
              <View key={iso} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                <Text style={[styles.dayDow, isToday && styles.dayTextToday]}>{dow}</Text>
                <Text style={[styles.dayNum, isToday && styles.dayTextToday]}>
                  {iso.slice(8, 10)}
                </Text>
                <View style={[styles.dot, dotStyle(d?.status)]} />
              </View>
            );
          })}
        </View>

        {/* Treino de hoje (farol) */}
        {todayDay ? (
          <Pressable onPress={() => navigate({ name: "day", dayId: todayDay.id })}>
            <LinearGradient
              colors={gradients.brasaRadiante}
              start={{ x: 0.18, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroOverline}>HOJE</Text>
              <Text style={styles.heroTitle}>{summarize(todayDay).title}</Text>
              <Text style={styles.heroSub}>{summarize(todayDay).sub}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={[styles.card, styles.restCard]}>
            <Text style={text.secondary}>Sem treino hoje — dia de descanso.</Text>
          </View>
        )}

        {/* Métricas da semana */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={text.muted}>Distância da semana</Text>
            <Text style={styles.metricValue}>
              {km(stats?.weeklyDistanceMeters ?? 0)}{" "}
              <Text style={styles.metricUnit}>km</Text>
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={text.muted}>Pace médio</Text>
            <Text style={styles.metricValue}>
              {pace(stats?.avgPaceSecPerKm ?? null)}{" "}
              <Text style={styles.metricUnit}>/km</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Tab bar */}
      <View style={styles.tabbar}>
        {["Hoje", "Treinos", "Agenda", "Evolução"].map((label, i) => (
          <View key={label} style={[styles.tab, i === 0 && styles.tabActive]}>
            <Text style={i === 0 ? styles.tabActiveText : styles.tabText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function currentWeek(): string[] {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (utc.getUTCDay() + 6) % 7; // segunda = 0
  utc.setUTCDate(utc.getUTCDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(utc);
    d.setUTCDate(utc.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function dotStyle(status?: WorkoutDayDto["status"]) {
  if (status === "done" || status === "partial") return { backgroundColor: color.success };
  if (status === "skipped") return { backgroundColor: color.danger };
  return { backgroundColor: "transparent" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.orange400 },
  streak: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  streakText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  section: { marginBottom: 8 },
  week: { flexDirection: "row", gap: 5, marginBottom: 14 },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: color.surface2,
  },
  dayCellToday: { backgroundColor: color.orange500 },
  dayDow: { fontFamily: font.regular, fontSize: 9, color: color.textFaint },
  dayNum: { fontFamily: font.regular, fontSize: 12, color: color.textSecondary, marginVertical: 1 },
  dayTextToday: { color: color.ink, fontFamily: font.semibold },
  dot: { width: 4, height: 4, borderRadius: 99 },
  hero: { borderRadius: 14, padding: 16, marginBottom: 12 },
  heroOverline: {
    fontFamily: font.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
  },
  heroTitle: { fontFamily: font.bold, fontSize: 18, color: "#fff" },
  heroSub: { fontFamily: font.regular, fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 16,
  },
  restCard: { marginBottom: 12 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricCard: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  metricValue: { fontFamily: font.bold, fontSize: 20, color: color.textPrimary, marginTop: 6 },
  metricUnit: { fontFamily: font.medium, fontSize: 11, color: color.textMuted },
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
