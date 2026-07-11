import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import type { Block, BlockItem } from "@runup/types";
import type { WorkoutDayDetailDto, WorkoutDayDto } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { km, pace, localIsoDate } from "../format.js";
import { LoadError } from "../components/LoadError.js";
import { WorkoutLogResult } from "../components/WorkoutLogResult.js";

const ROLE_LABEL: Record<Block["role"], string> = {
  warmup: "AQUECIMENTO",
  main: "PRINCIPAL",
  cooldown: "DESAQUECIMENTO",
};
const ROLE_ORDER: Block["role"][] = ["warmup", "main", "cooldown"];
const WEEKDAY_NAMES = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];
const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function describeItem(item: BlockItem): string {
  if (item.kind === "running") {
    if (item.interval) {
      const rec = item.interval.recoverySeconds
        ? ` · rec ${item.interval.recoverySeconds}s`
        : "";
      const p = item.targetPaceSecPerKm ? ` @ ${pace(item.targetPaceSecPerKm)}/km` : "";
      return `${item.interval.reps}× ${item.interval.repDistanceMeters ?? ""}m${p}${rec}`;
    }
    const dist = item.distanceMeters ? `${km(item.distanceMeters)} km` : "";
    const p = item.targetPaceSecPerKm ? ` @ ${pace(item.targetPaceSecPerKm)}/km` : "";
    return `${dist}${p}`.trim() || "Corrida";
  }
  if (item.kind === "free") return item.notes;
  return `${item.sets ?? ""}×${item.reps ?? ""}`.replace(/^×$/, "Exercício");
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso: string, delta: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + delta);
  return localIsoDate(d);
}

function formatDateLabel(iso: string): string {
  const d = parseLocalDate(iso);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

export function DayDetailScreen({ date }: { date: string }) {
  const { goHome, navigate } = useNav();
  const { units } = useSettings();
  const [currentDate, setCurrentDate] = useState(date);
  const [calendar, setCalendar] = useState<WorkoutDayDto[] | null>(null);
  const [detail, setDetail] = useState<WorkoutDayDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Carrega o calendário uma vez, pra saber quais dias têm treino.
  function loadCalendar() {
    setLoading(true);
    setError(false);
    api
      .calendar()
      .then(setCalendar)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(loadCalendar, []);

  const matching = calendar?.find((d) => d.date.slice(0, 10) === currentDate) ?? null;

  // Detalhe (blocos/comentários) só quando o dia atual tiver um treino.
  useEffect(() => {
    if (!matching) {
      setDetail(null);
      return;
    }
    api.workoutDay(matching.id).then(setDetail).catch(() => setDetail(null));
  }, [matching?.id]);

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
        <LoadError onRetry={loadCalendar} />
      </View>
    );
  }

  const blocks = detail
    ? [...detail.blocks].sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
      )
    : [];
  const mainItem = blocks.find((b) => b.role === "main")?.items[0];
  const liveTitle = mainItem ? describeItem(mainItem) : "Treino do dia";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>

        <View style={styles.dateNav}>
          <Pressable
            onPress={() => setCurrentDate((d) => addDays(d, -1))}
            style={styles.dateNavBtn}
          >
            <Text style={styles.dateNavText}>‹</Text>
          </Pressable>
          <Text style={[text.muted, styles.date]}>{formatDateLabel(currentDate)}</Text>
          <Pressable
            onPress={() => setCurrentDate((d) => addDays(d, 1))}
            style={styles.dateNavBtn}
          >
            <Text style={styles.dateNavText}>›</Text>
          </Pressable>
        </View>

        {matching && detail ? (
          <>
            {detail.logs.length > 0 && (
              <View style={styles.blockGroup}>
                <Text style={[text.overline, styles.blockLabel]}>RESULTADO</Text>
                {detail.logs.map((log) => (
                  <WorkoutLogResult key={log.id} log={log} units={units} />
                ))}
              </View>
            )}

            {blocks.map((block, bi) => (
              <View key={bi} style={styles.blockGroup}>
                <Text style={[text.overline, styles.blockLabel]}>
                  {ROLE_LABEL[block.role]}
                </Text>
                <View
                  style={[styles.card, block.role === "main" && styles.mainCard]}
                >
                  {block.items.map((item, ii) => (
                    <Text key={ii} style={styles.item}>
                      {describeItem(item)}
                    </Text>
                  ))}
                </View>
              </View>
            ))}

            {detail.comments.length > 0 && (
              <View style={styles.blockGroup}>
                <Text style={[text.overline, styles.blockLabel]}>
                  COMENTÁRIOS DO TREINADOR
                </Text>
                {detail.comments.map((c) => (
                  <View key={c.id} style={styles.comment}>
                    <Text style={text.body}>{c.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : matching ? (
          <View style={[styles.center, { paddingVertical: 40 }]}>
            <ActivityIndicator color={color.orange500} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={text.secondary}>Sem treino registrado neste dia.</Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() => navigate({ name: "createWorkout", initialDate: currentDate })}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Criar treino</Text>
              </Pressable>
              <Pressable
                onPress={() => navigate({ name: "aiPlanWizard" })}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>✨ Criar com IA</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {matching && (
        <View style={styles.footer}>
          <Pressable
            onPress={() => navigate({ name: "liveWorkout", dayId: matching.id, title: liveTitle })}
            style={styles.cta}
          >
            <LinearGradient
              colors={gradients.brasa}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Iniciar treino</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  back: { marginBottom: 8 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateNavBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  dateNavText: { fontFamily: font.semibold, fontSize: 20, color: color.textSecondary },
  date: { flex: 1, textAlign: "center", textTransform: "capitalize" },
  blockGroup: { marginBottom: 14 },
  blockLabel: { marginBottom: 6 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  mainCard: { borderColor: "rgba(255,85,0,0.35)" },
  emptyActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  emptyBtn: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  item: { fontFamily: font.regular, fontSize: 13, color: color.textPrimary, marginVertical: 2 },
  comment: {
    backgroundColor: color.surface3,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  footer: { padding: 16 },
  cta: { borderRadius: 99, overflow: "hidden" },
  ctaGradient: { paddingVertical: 14, alignItems: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
});
