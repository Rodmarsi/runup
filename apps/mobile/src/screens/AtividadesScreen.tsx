import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto, WorkoutLogKind } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { distance, unitLabel, duration, paceForUnits, paceUnitLabel, monthYearLabel, longDateTime } from "../format.js";
import { LoadError } from "../components/LoadError.js";
import { Dropdown } from "../components/Dropdown.js";
import { AnalisesScreen } from "./AnalisesScreen.js";

const KIND_LABEL: Record<WorkoutLogKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  bike: "Bike",
  walk: "Caminhada",
  other: "Outro",
};
const KIND_ICON: Record<WorkoutLogKind, string> = {
  running: "🏃",
  strength: "🏋️",
  mobility: "🧘",
  bike: "🚴",
  walk: "🚶",
  other: "⚡",
};

type SubTab = "treinos" | "desempenho";

/** Histórico de treinos e Desempenho, como abas internas de uma só tela (padrão Runna). */
export function AtividadesScreen() {
  const { navigate } = useNav();
  const [subTab, setSubTab] = useState<SubTab>("treinos");
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={text.screenTitle}>Atividades</Text>
        <View style={styles.topBarActions}>
          {subTab === "treinos" && (
            <Pressable onPress={() => setFiltersOpen((v) => !v)} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>{filtersOpen ? "✕" : "☰"}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => navigate({ name: "logWorkout" })} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.subTabRow}>
        <Pressable
          onPress={() => setSubTab("treinos")}
          style={[styles.subTabBtn, subTab === "treinos" && styles.subTabBtnActive]}
        >
          <Text style={subTab === "treinos" ? styles.subTabTextActive : styles.subTabText}>
            Treinos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSubTab("desempenho")}
          style={[styles.subTabBtn, subTab === "desempenho" && styles.subTabBtnActive]}
        >
          <Text style={subTab === "desempenho" ? styles.subTabTextActive : styles.subTabText}>
            Desempenho
          </Text>
        </Pressable>
      </View>

      {subTab === "treinos" ? (
        <TreinosTab filtersOpen={filtersOpen} />
      ) : (
        <AnalisesScreen />
      )}
    </View>
  );
}

function TreinosTab({ filtersOpen }: { filtersOpen: boolean }) {
  const { navigate } = useNav();
  const { units } = useSettings();
  const [logs, setLogs] = useState<WorkoutLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [kindFilter, setKindFilter] = useState<WorkoutLogKind | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

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

  const years = useMemo(() => {
    const set = new Set(logs.map((l) => l.completedAt.slice(0, 4)));
    return [...set].sort().reverse();
  }, [logs]);

  const shown = logs.filter((l) => {
    if (kindFilter !== "all" && l.kind !== kindFilter) return false;
    if (yearFilter !== "all" && l.completedAt.slice(0, 4) !== yearFilter) return false;
    if (monthFilter !== "all" && l.completedAt.slice(5, 7) !== monthFilter) return false;
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map<string, WorkoutLogDto[]>();
    for (const log of shown) {
      const key = log.completedAt.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {filtersOpen && (
        <View style={styles.filters}>
          <Dropdown
            label="Tipo"
            value={kindFilter}
            onChange={setKindFilter}
            options={[
              { value: "all", label: "Todos" },
              ...(Object.keys(KIND_LABEL) as WorkoutLogKind[]).map((k) => ({
                value: k,
                label: KIND_LABEL[k],
              })),
            ]}
          />
          <Dropdown
            label="Ano"
            value={yearFilter}
            onChange={setYearFilter}
            options={[{ value: "all", label: "Todos" }, ...years.map((y) => ({ value: y, label: y }))]}
          />
          <Dropdown
            label="Mês"
            value={monthFilter}
            onChange={setMonthFilter}
            options={[
              { value: "all", label: "Todos" },
              ...Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1).padStart(2, "0"),
                label: monthYearLabel(`2000-${String(i + 1).padStart(2, "0")}`).split(" de ")[0]!,
              })),
            ]}
          />
        </View>
      )}

      {groups.map(([yearMonth, monthLogs]) => {
        const totalKm = monthLogs.reduce((s, l) => s + (l.distanceMeters ?? 0), 0) / 1000;
        return (
          <View key={yearMonth} style={styles.monthGroup}>
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{monthYearLabel(yearMonth)}</Text>
              <Text style={text.muted}>
                {monthLogs.length} atividade{monthLogs.length > 1 ? "s" : ""} · {totalKm.toFixed(1).replace(".", ",")} km
              </Text>
            </View>
            {monthLogs.map((log) => (
              <Pressable
                key={log.id}
                onPress={() => navigate({ name: "activity", log })}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardIcon}>{KIND_ICON[log.kind]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{log.stravaName ?? KIND_LABEL[log.kind]}</Text>
                    <Text style={text.muted}>{longDateTime(log.completedAt)}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
                <View style={styles.cardMetrics}>
                  <View style={styles.metricCol}>
                    <Text style={text.muted}>Distância</Text>
                    <Text style={styles.metricValue}>
                      {log.distanceMeters ? `${distance(log.distanceMeters, units)} ${unitLabel(units)}` : "—"}
                    </Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={text.muted}>Tempo</Text>
                    <Text style={styles.metricValue}>
                      {log.durationSeconds ? duration(log.durationSeconds) : "—"}
                    </Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={text.muted}>Ritmo médio</Text>
                    <Text style={styles.metricValue}>
                      {log.avgPaceSecPerKm
                        ? `${paceForUnits(log.avgPaceSecPerKm, units)}${paceUnitLabel(units)}`
                        : "—"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        );
      })}

      {shown.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhuma atividade encontrada.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  label: { marginTop: 14, marginBottom: 8 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  topBarActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontFamily: font.semibold, fontSize: 14, color: color.textSecondary },
  subTabRow: {
    flexDirection: "row",
    gap: 4,
    margin: 16,
    marginBottom: 0,
    padding: 4,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  subTabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 99 },
  subTabBtnActive: { backgroundColor: color.orangeDim },
  subTabText: { fontFamily: font.medium, fontSize: 13, color: color.textMuted },
  subTabTextActive: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  monthGroup: { marginTop: 18 },
  monthHeader: { marginBottom: 10 },
  monthTitle: { fontFamily: font.bold, fontSize: 16, color: color.textPrimary, marginBottom: 2 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginTop: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  cardMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: border.hairline,
  },
  metricCol: { flex: 1 },
  metricValue: { fontFamily: font.bold, fontSize: 14, color: color.textPrimary, marginTop: 2 },
});
