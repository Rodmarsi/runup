import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto, WorkoutLogKind } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { distance, unitLabel, paceForUnits, paceUnitLabel } from "../format.js";
import { LoadError } from "../components/LoadError.js";

const KIND_LABEL: Record<WorkoutLogKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  bike: "Bike",
  walk: "Caminhada",
  other: "Outro",
};
const FILTERS: (WorkoutLogKind | "all")[] = ["all", "running", "strength", "bike", "walk"];

function filterLabel(f: WorkoutLogKind | "all"): string {
  return f === "all" ? "Todas" : KIND_LABEL[f];
}

export function AtividadesScreen() {
  const { navigate } = useNav();
  const { units } = useSettings();
  const [logs, setLogs] = useState<WorkoutLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<WorkoutLogKind | "all">("all");

  function load() {
    setLoading(true);
    setError(false);
    api
      .workoutLogs()
      .then(setLogs)
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

  const shown = filter === "all" ? logs : logs.filter((l) => l.kind === filter);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={text.screenTitle}>Atividades</Text>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={active ? styles.filterTextActive : styles.filterText}>
                {filterLabel(f)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {shown.map((log) => (
        <Pressable
          key={log.id}
          onPress={() => navigate({ name: "activity", log })}
          style={styles.row}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{KIND_LABEL[log.kind]}</Text>
            <Text style={text.muted}>{log.completedAt.slice(0, 10)}</Text>
          </View>
          <View style={styles.rowMetrics}>
            <Text style={styles.rowValue}>
              {log.distanceMeters ? `${distance(log.distanceMeters, units)} ${unitLabel(units)}` : "—"}
            </Text>
            <Text style={text.muted}>
              {log.avgPaceSecPerKm ? `${paceForUnits(log.avgPaceSecPerKm, units)}${paceUnitLabel(units)}` : ""}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      {shown.length === 0 && (
        <Text style={[text.secondary, styles.label]}>
          {filter === "all" ? "Nenhuma atividade registrada ainda." : "Nada por aqui ainda."}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  label: { marginTop: 14, marginBottom: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  filterChipActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  filterText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  filterTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginTop: 10,
  },
  rowTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary },
  rowMetrics: { alignItems: "flex-end" },
  rowValue: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
});
