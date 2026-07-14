import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto, WorkoutDayDto, Stats, RacePredictionDto, GamificationSnapshot, CompletedPlanDto, StravaStatus } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useSettings } from "../settings.js";
import { distance, unitLabel, duration, daysLabel, isoToBr } from "../format.js";
import { LoadError } from "../components/LoadError.js";
import { HexagonMedal } from "../components/HexagonMedal.js";
import { isHealthConnectAvailable, requestHealthConnectPermissions, syncHealthConnect } from "../healthConnect.js";

const PREDICTION_LABEL: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "15k": "15 km",
  "21k": "21 km",
  "42k": "42 km",
};
const RACE_LABEL: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "21k": "21 km",
  "42k": "42 km",
};
const ACHIEVEMENT_LABEL: Record<string, string> = {
  first_5k: "Primeiro 5 km",
  first_10k: "Primeiro 10 km",
  first_half: "Primeira Meia",
  first_marathon: "Primeira Maratona",
  "100km_total": "100 km acumulados",
  "500km_total": "500 km acumulados",
};

type ViewMode = "semana" | "mes" | "ano";
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAY_MS = 24 * 60 * 60 * 1000;

function shortDayMonth(d: Date): string {
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}`;
}

function periodRange(mode: ViewMode, offset: number): [Date, Date] {
  const now = new Date();
  if (mode === "semana") {
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + offset * 7);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return [monday, sunday];
  }
  if (mode === "mes") {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return [first, last];
  }
  const first = new Date(now.getFullYear() + offset, 0, 1);
  const last = new Date(now.getFullYear() + offset, 11, 31);
  return [first, last];
}

function periodLabel(mode: ViewMode, [start, end]: [Date, Date]): string {
  if (mode === "semana") return `${shortDayMonth(start)} a ${shortDayMonth(end)}`;
  if (mode === "mes") {
    const name = start.toLocaleDateString("pt-BR", { month: "long" });
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${start.getFullYear()}`;
  }
  return String(start.getFullYear());
}

/** Soma km por bucket (dia/semana/mês, conforme o modo) dentro do período. */
function buildBuckets(
  logs: WorkoutLogDto[],
  mode: ViewMode,
  [start, end]: [Date, Date],
): { label: string; km: number }[] {
  if (mode === "semana") {
    const days = ["D", "S", "T", "Q", "Q", "S", "S"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const km = logs
        .filter((l) => l.completedAt.slice(0, 10) === iso)
        .reduce((s, l) => s + (l.distanceMeters ?? 0), 0) / 1000;
      return { label: days[d.getDay()]!, km };
    });
  }
  if (mode === "ano") {
    return MONTHS_SHORT.map((label, m) => {
      const km = logs
        .filter((l) => {
          const d = new Date(l.completedAt);
          return d.getFullYear() === start.getFullYear() && d.getMonth() === m;
        })
        .reduce((s, l) => s + (l.distanceMeters ?? 0), 0) / 1000;
      return { label, km };
    });
  }
  // mes: buckets de 7 dias corridos dentro do mês
  const totalDays = end.getDate();
  const buckets: { label: string; km: number }[] = [];
  for (let d0 = 1; d0 <= totalDays; d0 += 7) {
    const d1 = Math.min(d0 + 6, totalDays);
    const from = new Date(start.getFullYear(), start.getMonth(), d0);
    const to = new Date(start.getFullYear(), start.getMonth(), d1);
    const km = logs
      .filter((l) => {
        const d = new Date(l.completedAt);
        return d >= from && d <= new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
      })
      .reduce((s, l) => s + (l.distanceMeters ?? 0), 0) / 1000;
    buckets.push({ label: `${d0}`, km });
  }
  return buckets;
}

export function AnalisesScreen() {
  const { units } = useSettings();
  const [logs, setLogs] = useState<WorkoutLogDto[]>([]);
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [predictions, setPredictions] = useState<RacePredictionDto[]>([]);
  const [gamification, setGamification] = useState<GamificationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<ViewMode>("semana");
  const [offset, setOffset] = useState(0);

  function load() {
    setLoading(true);
    setError(false);
    const since = new Date(Date.now() - 730 * DAY_MS).toISOString().slice(0, 10);
    Promise.all([
      api.workoutLogs({ since }),
      api.calendar(),
      api.stats(),
      api.racePredictions(),
      api.gamification(),
    ])
      .then(([l, d, s, pred, gam]) => {
        setLogs(l);
        setDays(d);
        setStats(s);
        setPredictions(pred);
        setGamification(gam);
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
        <LoadError onRetry={load} />
      </View>
    );
  }

  const range = periodRange(mode, offset);
  const [rangeStart, rangeEnd] = range;
  const inRange = logs.filter((l) => {
    const d = new Date(l.completedAt);
    return d >= rangeStart && d <= new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59);
  });
  const totalDistance = inRange.reduce((s, l) => s + (l.distanceMeters ?? 0), 0);
  const totalTime = inRange.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
  const buckets = buildBuckets(logs, mode, range);
  const maxBucket = Math.max(...buckets.map((b) => b.km), 1);
  const missedDays = days.filter((d) => d.status === "skipped").length;
  const avgTimePerWorkout = stats?.workoutCount ? stats.totalTimeSeconds / stats.workoutCount : 0;
  const longestWorkout = Math.max(0, ...logs.map((l) => l.distanceMeters ?? 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Seletor de período */}
      <View style={styles.periodNav}>
        <Pressable onPress={() => setOffset((o) => o - 1)} style={styles.periodArrow}>
          <Text style={styles.periodArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.periodLabel}>{periodLabel(mode, range)}</Text>
        <Pressable
          onPress={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          style={[styles.periodArrow, offset >= 0 && styles.periodArrowDisabled]}
        >
          <Text style={styles.periodArrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.segment}>
        {(["semana", "mes", "ano"] as ViewMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setOffset(0);
            }}
            style={[styles.segmentBtn, mode === m && styles.segmentBtnActive]}
          >
            <Text style={mode === m ? styles.segmentTextActive : styles.segmentText}>
              {m === "semana" ? "Semana" : m === "mes" ? "Mês" : "Ano"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Resumo do período */}
      <View style={styles.statGrid}>
        <Stat label="KM" value={`${distance(totalDistance, units)} ${unitLabel(units)}`} />
        <Stat label="Tempo" value={duration(totalTime)} />
        <Stat label="Treinos" value={String(inRange.length)} />
      </View>

      {/* Gráfico */}
      <View style={styles.card}>
        <View style={styles.chart}>
          {buckets.map((b, i) => (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(6, (b.km / maxBucket) * 100)}%` },
                  i === buckets.length - 1 && styles.barCurrent,
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.chartLabels}>
          {buckets.map((b, i) => (
            <Text key={i} style={styles.chartLabelText}>{b.label}</Text>
          ))}
        </View>
      </View>

      {/* Recordes pessoais */}
      <Text style={[text.overline, styles.label]}>RECORDES PESSOAIS</Text>
      <PersonalRecordsRow />

      {/* Planos concluídos */}
      <Text style={[text.overline, styles.label]}>PLANOS CONCLUÍDOS</Text>
      <CompletedPlansSection />

      {/* Conquistas */}
      {gamification && gamification.achievements.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>CONQUISTAS</Text>
          <View style={styles.achievementGrid}>
            {gamification.achievements.map((code) => (
              <View key={code} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>🏅</Text>
                <Text style={styles.achievementLabel}>{ACHIEVEMENT_LABEL[code] ?? code}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Estatísticas totais */}
      <Text style={[text.overline, styles.label]}>ESTATÍSTICAS TOTAIS</Text>
      <View style={styles.totalsList}>
        <TotalRow icon="📏" label="Distância total" value={`${distance(stats?.totalDistanceMeters ?? 0, units)} ${unitLabel(units)}`} />
        <TotalRow icon="🏁" label="Atividades totais" value={String(stats?.workoutCount ?? 0)} />
        <TotalRow icon="⏱️" label="Tempo total" value={duration(stats?.totalTimeSeconds ?? 0)} />
        <TotalRow icon="📈" label="Treino mais longo" value={longestWorkout ? `${distance(longestWorkout, units)} ${unitLabel(units)}` : "—"} />
        <TotalRow icon="🔥" label="Sequência atual" value={daysLabel(stats?.streakDays ?? 0)} />
        <TotalRow icon="💤" label="Dias perdidos" value={String(missedDays)} />
        <TotalRow icon="⏳" label="Tempo médio/treino" value={avgTimePerWorkout ? duration(Math.round(avgTimePerWorkout)) : "—"} />
      </View>

      {/* Fontes de dados */}
      <Text style={[text.overline, styles.label]}>FONTES DE DADOS</Text>
      <DataSourcesSection />

      {/* Previsão de tempo */}
      <Text style={[text.overline, styles.label]}>PREVISÃO DE TEMPO</Text>
      {predictions.every((p) => p.predictedSeconds === null) ? (
        <Text style={text.muted}>
          Registre corridas nos últimos 90 dias pra ver sua previsão de tempo nas distâncias.
        </Text>
      ) : (
        <View style={styles.statGrid}>
          {predictions.map((p) => (
            <Stat
              key={p.distance}
              label={PREDICTION_LABEL[p.distance] ?? p.distance}
              value={p.predictedSeconds !== null ? duration(p.predictedSeconds) : "—"}
            />
          ))}
        </View>
      )}
      <Text style={[text.muted, styles.predictionHint]}>
        Estimativa a partir das suas últimas corridas — não é garantia.
      </Text>
    </ScrollView>
  );
}

function PersonalRecordsRow() {
  const [prs, setPrs] = useState<{ distance: string; timeSeconds: number }[] | null>(null);

  useEffect(() => {
    api
      .personalRecords()
      .then((data) => setPrs(data.map((p) => ({ distance: p.distance, timeSeconds: p.timeSeconds }))))
      .catch(() => setPrs([]));
  }, []);

  const categories = ["5k", "10k", "21k", "42k"];
  const byCategory = new Map((prs ?? []).map((p) => [p.distance, p.timeSeconds]));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medalRow}>
      {categories.map((c) => {
        const time = byCategory.get(c);
        return (
          <HexagonMedal
            key={c}
            label={RACE_LABEL[c] ?? c}
            value={time ? duration(time) : null}
            achieved={!!time}
          />
        );
      })}
    </ScrollView>
  );
}

function CompletedPlansSection() {
  const [plans, setPlans] = useState<CompletedPlanDto[] | null>(null);

  useEffect(() => {
    api.completedPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  if (plans === null) return null;

  if (plans.length === 0) {
    return <Text style={text.muted}>Nenhum plano concluído ainda.</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {plans.map((p) => (
        <View key={p.id} style={styles.planCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{p.title}</Text>
            <Text style={text.muted}>
              {isoToBr(p.startDate.slice(0, 10))} a {isoToBr(p.endDate.slice(0, 10))}
              {p.madeByCoach && p.coachName ? ` · ${p.coachName}` : ""}
            </Text>
          </View>
          <View style={styles.planAdherence}>
            <Text style={styles.planAdherencePct}>{p.adherencePct}%</Text>
            <Text style={text.muted}>aderência</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DataSourcesSection() {
  const [strava, setStrava] = useState<StravaStatus | null>(null);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaLastSync, setStravaLastSync] = useState<string | null>(null);

  const [hcAvailable, setHcAvailable] = useState(false);
  const [hcConnected, setHcConnected] = useState(false);
  const [hcSyncing, setHcSyncing] = useState(false);
  const [hcLastSync, setHcLastSync] = useState<string | null>(null);

  useEffect(() => {
    api.stravaStatus().then(setStrava).catch(() => {});
    if (Platform.OS === "android") {
      isHealthConnectAvailable().then(setHcAvailable).catch(() => setHcAvailable(false));
    }
  }, []);

  async function syncStrava() {
    setStravaSyncing(true);
    try {
      await api.stravaSync();
      setStravaLastSync(new Date().toISOString());
    } catch {
      Alert.alert("Erro", "Não foi possível sincronizar com o Strava agora.");
    } finally {
      setStravaSyncing(false);
    }
  }

  async function connectAndSyncHealthConnect() {
    setHcSyncing(true);
    try {
      const granted = await requestHealthConnectPermissions();
      if (!granted) {
        Alert.alert("Permissão negada", "Autorize o acesso aos dados de exercício no Health Connect.");
        return;
      }
      setHcConnected(true);
      const count = await syncHealthConnect();
      setHcLastSync(new Date().toISOString());
      Alert.alert("Sincronizado!", `${count} atividade${count === 1 ? "" : "s"} importada${count === 1 ? "" : "s"} do Health Connect.`);
    } catch {
      Alert.alert("Erro", "Não foi possível sincronizar com o Health Connect agora.");
    } finally {
      setHcSyncing(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.sourceRow}>
        <Text style={styles.sourceIcon}>🟠</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sourceTitle}>Strava</Text>
          <Text style={text.muted}>
            {strava?.connected
              ? stravaLastSync
                ? `Sincronizado agora`
                : "Conectado"
              : "Não conectado"}
          </Text>
        </View>
        {strava?.connected && (
          <Pressable onPress={syncStrava} disabled={stravaSyncing} style={styles.sourceBtn}>
            <Text style={styles.sourceBtnText}>{stravaSyncing ? "..." : "Sincronizar"}</Text>
          </Pressable>
        )}
      </View>

      {Platform.OS === "android" && hcAvailable && (
        <View style={styles.sourceRow}>
          <Text style={styles.sourceIcon}>❤️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sourceTitle}>Health Connect</Text>
            <Text style={text.muted}>
              {hcLastSync ? "Sincronizado agora" : hcConnected ? "Conectado" : "Não conectado"}
            </Text>
          </View>
          <Pressable onPress={connectAndSyncHealthConnect} disabled={hcSyncing} style={styles.sourceBtn}>
            <Text style={styles.sourceBtnText}>
              {hcSyncing ? "..." : hcConnected ? "Sincronizar" : "Conectar"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
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

function TotalRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalIcon}>{icon}</Text>
      <Text style={[text.secondary, { flex: 1 }]}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { marginTop: 20, marginBottom: 8 },
  periodNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 10,
  },
  periodArrow: {
    width: 30,
    height: 30,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  periodArrowDisabled: { opacity: 0.35 },
  periodArrowText: { fontFamily: font.semibold, fontSize: 16, color: color.textSecondary },
  periodLabel: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginTop: 14,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
    gap: 6,
    marginBottom: 6,
  },
  barCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: color.surface4, borderRadius: 4, minHeight: 4 },
  barCurrent: { backgroundColor: color.orange500 },
  chartLabels: { flexDirection: "row", gap: 6 },
  chartLabelText: { flex: 1, textAlign: "center", fontFamily: font.regular, fontSize: 9, color: color.textFaint },
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
    flex: 1,
    minWidth: "30%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  statValue: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginTop: 6 },
  predictionHint: { marginTop: 8, fontSize: 11 },
  medalRow: { flexDirection: "row" },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  planTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary, marginBottom: 2 },
  planAdherence: { alignItems: "flex-end" },
  planAdherencePct: { fontFamily: font.bold, fontSize: 16, color: color.orange400 },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  sourceIcon: { fontSize: 20 },
  sourceTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary, marginBottom: 2 },
  sourceBtn: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sourceBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  achievementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  achievementCard: {
    width: "31%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    alignItems: "center",
  },
  achievementIcon: { fontSize: 22, marginBottom: 6 },
  achievementLabel: { fontFamily: font.medium, fontSize: 10, color: color.textSecondary, textAlign: "center" },
  totalsList: { gap: 4 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginBottom: 6,
  },
  totalIcon: { fontSize: 16 },
  totalValue: { fontFamily: font.bold, fontSize: 13, color: color.textPrimary },
});
