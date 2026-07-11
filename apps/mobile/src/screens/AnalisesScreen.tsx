import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto, WorkoutDayDto, Stats } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { distance, unitLabel, duration } from "../format.js";
import { LoadError } from "../components/LoadError.js";

type Period = 30 | 90 | 365;
const PERIODS: { value: Period; label: string }[] = [
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 365, label: "Ano" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Soma km por semana (últimas 8), a partir das datas de execução. */
function weeklyBuckets(logs: WorkoutLogDto[], weeks = 8): number[] {
  const now = Date.now();
  const buckets = Array(weeks).fill(0) as number[];
  for (const log of logs) {
    const ageDays = (now - new Date(log.completedAt).getTime()) / DAY_MS;
    const weekIndex = weeks - 1 - Math.floor(ageDays / 7);
    if (weekIndex >= 0 && weekIndex < weeks) {
      buckets[weekIndex] += log.distanceMeters ?? 0;
    }
  }
  return buckets;
}

function periodSummary(logs: WorkoutLogDto[], days: Period) {
  const since = Date.now() - days * DAY_MS;
  const inPeriod = logs.filter((l) => new Date(l.completedAt).getTime() >= since);
  const totalDistance = inPeriod.reduce((s, l) => s + (l.distanceMeters ?? 0), 0);
  const totalTime = inPeriod.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
  const activeDays = new Set(inPeriod.map((l) => l.completedAt.slice(0, 10))).size;
  return { count: inPeriod.length, totalDistance, totalTime, activeDays };
}

export function AnalisesScreen() {
  const { goHome } = useNav();
  const { units } = useSettings();
  const [logs, setLogs] = useState<WorkoutLogDto[]>([]);
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>(30);

  function load() {
    setLoading(true);
    setError(false);
    const since = new Date(Date.now() - 365 * DAY_MS).toISOString().slice(0, 10);
    Promise.all([api.workoutLogs({ since }), api.calendar(), api.stats()])
      .then(([l, d, s]) => {
        setLogs(l);
        setDays(d);
        setStats(s);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.scroll]}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>
        <LoadError onRetry={load} />
      </View>
    );
  }

  const buckets = weeklyBuckets(logs);
  const maxBucket = Math.max(...buckets, 1);
  const summary = periodSummary(logs, period);
  const missedDays = days.filter((d) => d.status === "skipped").length;
  const avgTimePerWorkout = stats?.workoutCount ? stats.totalTimeSeconds / stats.workoutCount : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>
      <Text style={text.screenTitle}>Análises</Text>

      <Text style={[text.overline, styles.label]}>KM POR SEMANA</Text>
      <View style={styles.card}>
        <View style={styles.chart}>
          {buckets.map((km, i) => (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(6, (km / maxBucket) * 100)}%` },
                  i === buckets.length - 1 && styles.barCurrent,
                ]}
              />
            </View>
          ))}
        </View>
        <Text style={text.muted}>Últimas 8 semanas</Text>
      </View>

      <Text style={[text.overline, styles.label]}>COMPARAÇÃO POR PERÍODO</Text>
      <View style={styles.segment}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            onPress={() => setPeriod(p.value)}
            style={[styles.segmentBtn, period === p.value && styles.segmentBtnActive]}
          >
            <Text style={period === p.value ? styles.segmentTextActive : styles.segmentText}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.statGrid}>
        <Stat label="Distância" value={`${distance(summary.totalDistance, units)} ${unitLabel(units)}`} />
        <Stat label="Treinos" value={String(summary.count)} />
        <Stat label="Dias ativos" value={String(summary.activeDays)} />
        <Stat label="Tempo total" value={duration(summary.totalTime)} />
      </View>

      <Text style={[text.overline, styles.label]}>GERAL</Text>
      <View style={styles.statGrid}>
        <Stat label="Sequência atual" value={`${stats?.streakDays ?? 0} dias`} />
        <Stat label="Dias perdidos" value={String(missedDays)} />
        <Stat label="Tempo médio/treino" value={avgTimePerWorkout ? duration(Math.round(avgTimePerWorkout)) : "—"} />
      </View>
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
  scroll: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  label: { marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
    gap: 6,
    marginBottom: 8,
  },
  barCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: color.surface4, borderRadius: 4, minHeight: 4 },
  barCurrent: { backgroundColor: color.orange500 },
  segment: { flexDirection: "row", gap: 6 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  segmentBtnActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  segmentText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  segmentTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
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
});
