import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutDayDto, Stats, RaceDto, Insight } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { useAuth } from "../auth.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { api } from "../api.js";
import { km, pace, localIsoDate, greeting, distance, paceForUnits, unitLabel, paceUnitLabel } from "../format.js";
import { LoadError } from "../components/LoadError.js";
import { DayDots } from "../components/DayDots.js";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

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
  // Treino criado manualmente ou por IA: o nome vive num item "free".
  const free = day.blocks.flatMap((b) => b.items).find((i) => i.kind === "free");
  if (free && free.kind === "free") {
    const [title, ...rest] = free.notes.split(" — ");
    return { title: title || "Treino do dia", sub: rest.join(" — ") || "Treino do dia" };
  }
  return { title: "Treino do dia", sub: "Força / mobilidade" };
}

export function HomeScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { user } = useAuth();
  const { navigate } = useNav();
  const { units } = useSettings();
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | undefined>(undefined);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(localIsoDate());

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([api.calendar(), api.stats(), api.races(), api.insights()])
      .then(([cal, st, rc, ins]) => {
        setDays(cal);
        setStats(st);
        setRaces(rc);
        setInsights(ins);
      })
      .catch((e) => {
        setError(true);
        // DEBUG temporário — remover depois de achar a causa do erro no dev client.
        setErrorDetail(String(e?.message ?? e));
      })
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
        <LoadError onRetry={load} detail={errorDetail} />
      </View>
    );
  }

  const today = localIsoDate();
  const todayDay = days.find((d) => d.date.slice(0, 10) === today);
  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const raceDates = new Set(races.map((r) => r.raceDate.slice(0, 10)));
  const nextRace = races
    .filter((r) => r.raceDate.slice(0, 10) >= today)
    .sort((a, b) => a.raceDate.localeCompare(b.raceDate))[0];
  const targetRace = races.find((r) => r.isTarget);
  const daysUntilRace = nextRace
    ? Math.round(
        (new Date(nextRace.raceDate.slice(0, 10)).getTime() - new Date(today).getTime()) /
          86400000,
      )
    : null;
  const weekDates = currentWeek(weekOffset);
  const selectedDay = byDate.get(selectedDate);
  const selectedDateLabel =
    selectedDate === today
      ? "HOJE"
      : `${WEEKDAYS[new Date(`${selectedDate}T12:00:00Z`).getUTCDay()]} · ${selectedDate.slice(8, 10)}/${selectedDate.slice(5, 7)}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Pressable onPress={onOpenProfile} style={styles.headerLeft}>
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name.charAt(0).toUpperCase() ?? "?"}
                </Text>
              )}
            </View>
            <View>
              <Text style={text.muted}>{greeting()},</Text>
              <Text style={text.cardTitle}>{user?.name ?? ""}</Text>
            </View>
          </Pressable>
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 {stats?.streakDays ?? 0}</Text>
          </View>
        </View>

        {/* Sua semana */}
        <View style={styles.weekHeader}>
          <Text style={[text.overline, styles.section]}>SUA SEMANA</Text>
          <View style={styles.weekNav}>
            <Pressable onPress={() => setWeekOffset((w) => w - 1)} style={styles.weekNavBtn}>
              <Text style={styles.weekNavText}>‹</Text>
            </Pressable>
            {weekOffset !== 0 && (
              <Pressable onPress={() => setWeekOffset(0)} style={styles.weekNavBtn}>
                <Text style={styles.weekNavToday}>hoje</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setWeekOffset((w) => w + 1)} style={styles.weekNavBtn}>
              <Text style={styles.weekNavText}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.week}>
          {weekDates.map((iso) => {
            const d = byDate.get(iso);
            const isToday = iso === today;
            const isSelected = iso === selectedDate;
            const dow = WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
            return (
              <Pressable
                key={iso}
                onPress={() => setSelectedDate(iso)}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  !isToday && isSelected && styles.dayCellSelected,
                ]}
              >
                <Text style={[styles.dayDow, isToday && styles.dayTextToday]}>{dow}</Text>
                <Text style={[styles.dayNum, isToday && styles.dayTextToday]}>
                  {iso.slice(8, 10)}
                </Text>
                <DayDots day={d} hasRace={raceDates.has(iso)} onAccent={isToday} />
              </Pressable>
            );
          })}
        </View>

        {/* Dia selecionado — card inline (farol só quando é hoje) */}
        {selectedDate === today && todayDay ? (
          <Pressable onPress={() => navigate({ name: "day", date: today })}>
            <LinearGradient
              colors={gradients.brasaRadiante}
              start={{ x: 0.18, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroOverline}>HOJE</Text>
              <Text style={styles.heroTitle}>{summarize(todayDay).title}</Text>
              <Text style={styles.heroSub}>{summarize(todayDay).sub}</Text>
              {targetRace && <Text style={styles.heroRace}>🎯 {targetRace.name}</Text>}
            </LinearGradient>
          </Pressable>
        ) : selectedDate === today && days.length === 0 && stats?.lastWorkoutDate && localIsoDate(new Date(stats.lastWorkoutDate)) === today ? (
          <View style={[styles.card, styles.restCard]}>
            <Text style={text.secondary}>✓ Treino de hoje já registrado. Bom trabalho!</Text>
            <Pressable
              onPress={() => navigate({ name: "logWorkout" })}
              style={styles.logWorkoutBtn}
            >
              <Text style={styles.logWorkoutText}>Registrar outro treino</Text>
            </Pressable>
          </View>
        ) : selectedDate === today && days.length === 0 ? (
          <View style={[styles.card, styles.restCard]}>
            <Text style={text.secondary}>
              Você ainda não tem um treinador vinculado, então não há plano por
              aqui. Enquanto isso, registre os treinos que fizer por conta
              própria.
            </Text>
            <Pressable
              onPress={() => navigate({ name: "logWorkout" })}
              style={styles.logWorkoutBtn}
            >
              <Text style={styles.logWorkoutText}>Registrar treino avulso</Text>
            </Pressable>
          </View>
        ) : selectedDay ? (
          <Pressable
            onPress={() => navigate({ name: "day", date: selectedDate })}
            style={[styles.card, styles.restCard, styles.selectedCard]}
          >
            <Text style={[text.overline, styles.selectedOverline]}>
              {selectedDateLabel}
            </Text>
            <Text style={styles.selectedTitle}>{summarize(selectedDay).title}</Text>
            <Text style={text.muted}>{summarize(selectedDay).sub}</Text>
          </Pressable>
        ) : selectedDate === today ? (
          <View style={[styles.card, styles.restCard]}>
            <Text style={[text.overline, styles.selectedOverline]}>
              {selectedDateLabel}
            </Text>
            <Text style={styles.selectedTitle}>Você vai correr ou correu hoje?</Text>
            <Text style={text.secondary}>{restMessage(stats?.streakDays ?? 0)}</Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() => navigate({ name: "logWorkout" })}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Registrar atividade</Text>
              </Pressable>
              <Pressable
                onPress={() => navigate({ name: "createWorkout", initialDate: today })}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Criar treino</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.restCard]}>
            <Text style={[text.overline, styles.selectedOverline]}>
              {selectedDateLabel}
            </Text>
            <Text style={text.secondary}>Sem treino neste dia.</Text>
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.insights}>
            {insights.map((insight) => (
              <View key={insight.id} style={[styles.insightCard, insightStyle(insight.severity)]}>
                <Text style={styles.insightText}>{insight.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Métricas da semana */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={text.muted}>Distância da semana</Text>
            <Text style={styles.metricValue}>
              {distance(stats?.weeklyDistanceMeters ?? 0, units)}{" "}
              <Text style={styles.metricUnit}>{unitLabel(units)}</Text>
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={text.muted}>Pace médio</Text>
            <Text style={styles.metricValue}>
              {paceForUnits(stats?.avgPaceSecPerKm ?? null, units)}{" "}
              <Text style={styles.metricUnit}>{paceUnitLabel(units)}</Text>
            </Text>
          </View>
        </View>

        {nextRace && (
          <Pressable
            onPress={() => navigate({ name: "raceDetail", race: nextRace })}
            style={[styles.card, styles.raceCard]}
          >
            <Text style={[text.overline, styles.raceLabel]}>PRÓXIMA PROVA</Text>
            <Text style={styles.raceName}>{nextRace.name}</Text>
            <Text style={styles.raceCountdown}>
              Faltam <Text style={styles.raceCountdownNum}>{daysUntilRace}</Text> dias
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const REST_MESSAGES = [
  "Hoje é dia de descanso. A recuperação também faz parte da evolução.",
  "Sem treino hoje — seu corpo agradece a pausa.",
  "Dia livre. Aproveite pra alongar e dormir bem.",
];

/** Mensagem do dia de descanso — varia conforme a sequência atual do aluno. */
function restMessage(streakDays: number): string {
  if (streakDays >= 7) {
    return `Você está numa sequência de ${streakDays} dias — hoje é pra descansar e voltar ainda mais forte.`;
  }
  if (streakDays >= 3) {
    return `${streakDays} dias seguidos treinando. Aproveite o descanso de hoje.`;
  }
  return REST_MESSAGES[new Date().getDate() % REST_MESSAGES.length]!;
}

function insightStyle(severity: Insight["severity"]) {
  if (severity === "warning") return { borderColor: color.orange500 };
  if (severity === "success") return { borderColor: color.success };
  return {};
}

/** Datas (segunda a domingo) da semana atual + `weekOffset` semanas, no fuso local. */
function currentWeek(weekOffset = 0): string[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // segunda = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return localIsoDate(d);
  });
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
  avatarImage: { width: 36, height: 36, borderRadius: 99 },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.orange400 },
  streak: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  streakText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  section: { marginBottom: 8 },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekNav: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  weekNavBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  weekNavText: { fontFamily: font.semibold, fontSize: 16, color: color.textSecondary },
  weekNavToday: { fontFamily: font.medium, fontSize: 11, color: color.orange400 },
  week: { flexDirection: "row", gap: 5, marginBottom: 14 },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: color.surface2,
  },
  dayCellToday: { backgroundColor: color.orange500 },
  dayCellSelected: { borderWidth: 1, borderColor: color.orange500 },
  dayDow: { fontFamily: font.regular, fontSize: 9, color: color.textFaint },
  dayNum: { fontFamily: font.regular, fontSize: 12, color: color.textSecondary, marginVertical: 1 },
  dayTextToday: { color: color.ink, fontFamily: font.semibold },
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
  heroRace: { fontFamily: font.medium, fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 8 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 16,
  },
  restCard: { marginBottom: 12 },
  selectedCard: { borderColor: color.orange600 },
  selectedOverline: { color: color.orange400, marginBottom: 6 },
  selectedTitle: { fontFamily: font.bold, fontSize: 15, color: color.textPrimary, marginBottom: 2 },
  logWorkoutBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logWorkoutText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  emptyActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  emptyBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
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
  raceCard: { marginTop: 12, marginBottom: 0 },
  raceLabel: { marginBottom: 6 },
  raceName: { fontFamily: font.bold, fontSize: 15, color: color.textPrimary, marginBottom: 4 },
  raceCountdown: { fontFamily: font.regular, fontSize: 12, color: color.textSecondary },
  raceCountdownNum: { fontFamily: font.bold, color: color.orange400 },
  insights: { gap: 8, marginBottom: 12 },
  insightCard: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  insightText: { fontFamily: font.regular, fontSize: 12, color: color.textSecondary, lineHeight: 17 },
});
