import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { GoalOverview } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { duration } from "../format.js";
import { LoadError } from "../components/LoadError.js";

const RACE_LABEL: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "21k": "21 km",
  "42k": "42 km",
  other: "Prova",
};

export function GoalScreen({ goalId }: { goalId: string }) {
  const { goHome } = useNav();
  const [data, setData] = useState<GoalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api
      .goalOverview(goalId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [goalId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, styles.scroll]}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>
        <LoadError onRetry={load} />
      </View>
    );
  }

  const { goal, weeks, estimate } = data;
  const completedWeeks = weeks.filter(
    (w) => w.totalDays > 0 && w.completedDays >= w.totalDays,
  ).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>

      {/* Prova alvo */}
      <Text style={[text.overline]}>PROVA ALVO</Text>
      <Text style={styles.raceName}>
        {goal.raceName ?? RACE_LABEL[goal.targetRace]}
      </Text>
      <Text style={[text.muted, styles.raceMeta]}>
        {RACE_LABEL[goal.targetRace]} · {goal.raceDate.slice(0, 10)}
      </Text>
      <View style={styles.metaRow}>
        <MetaCard label="Faltam" value={`${goal.daysUntilRace}`} unit="dias" />
        <MetaCard
          label="Meta"
          value={goal.targetTimeSeconds ? duration(goal.targetTimeSeconds) : "—"}
        />
        <MetaCard
          label="Estimativa"
          value={estimate.currentSeconds ? duration(estimate.currentSeconds) : "—"}
          accent
        />
      </View>

      {/* Progresso do plano */}
      <Text style={[text.overline, styles.section]}>PROGRESSO DO PLANO</Text>
      <View style={styles.card}>
        <View style={styles.segBar}>
          {weeks.map((w) => {
            const full = w.totalDays > 0 && w.completedDays >= w.totalDays;
            const some = w.completedDays > 0;
            return (
              <View
                key={w.week}
                style={[
                  styles.seg,
                  {
                    backgroundColor: full
                      ? color.orange500
                      : some
                        ? color.orange600
                        : color.surface4,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.bigRow}>
          <View>
            <Text style={text.muted}>Semanas concluídas</Text>
            <Text style={styles.big}>
              {completedWeeks}
              <Text style={styles.bigUnit}>/{weeks.length}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Estimativa */}
      <Text style={[text.overline, styles.section]}>ESTIMATIVA DE TEMPO</Text>
      <View style={styles.card}>
        {estimate.currentSeconds ? (
          <>
            <Text style={styles.estimate}>{duration(estimate.currentSeconds)}</Text>
            <Text style={text.muted}>
              Projeção para {RACE_LABEL[goal.targetRace]} — recalculada a cada treino
            </Text>
          </>
        ) : (
          <Text style={text.secondary}>
            Registre treinos com distância e tempo para gerar a estimativa.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function MetaCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.metaCard}>
      <Text style={text.muted}>{label}</Text>
      <Text style={[styles.metaValue, accent && { color: color.orange400 }]}>
        {value}
        {unit ? <Text style={styles.metaUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  raceName: { fontFamily: font.bold, fontSize: 22, color: color.textPrimary, marginTop: 4 },
  raceMeta: { marginTop: 3, marginBottom: 14 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaCard: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 10,
  },
  metaValue: { fontFamily: font.bold, fontSize: 17, color: color.textPrimary, marginTop: 2 },
  metaUnit: { fontFamily: font.regular, fontSize: 10, color: color.textMuted },
  section: { marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 16,
  },
  segBar: { flexDirection: "row", gap: 4, marginBottom: 16 },
  seg: { flex: 1, height: 7, borderRadius: 99 },
  bigRow: { flexDirection: "row", justifyContent: "space-between" },
  big: { fontFamily: font.bold, fontSize: 22, color: color.textPrimary, marginTop: 2 },
  bigUnit: { fontFamily: font.medium, fontSize: 14, color: color.textMuted },
  estimate: { fontFamily: font.bold, fontSize: 26, color: color.textPrimary, marginBottom: 4 },
});
