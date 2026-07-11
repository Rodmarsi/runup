import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { DayRow } from "../components/DayRow.js";
import { LoadError } from "../components/LoadError.js";
import { localIsoDate } from "../format.js";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Grade do mês (dom-sáb), com dias do mês anterior/seguinte como `null`. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0 = domingo
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function AgendaScreen() {
  const { navigate } = useNav();
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  function load() {
    setLoading(true);
    setError(false);
    api
      .calendar()
      .then(setDays)
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

  const today = localIsoDate();
  const now = new Date();
  const shown = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const grid = monthGrid(year, month);

  const monthDays = [...days]
    .filter((d) => d.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={text.screenTitle}>Agenda</Text>

      <View style={styles.monthHeader}>
        <Pressable onPress={() => setMonthOffset((m) => m - 1)} style={styles.monthNavBtn}>
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setMonthOffset(0)}>
          <Text style={styles.monthLabel}>
            {MONTHS[month]} {year}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMonthOffset((m) => m + 1)} style={styles.monthNavBtn}>
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayLabel}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const iso = localIsoDate(date);
          const d = byDate.get(iso);
          const isToday = iso === today;
          return (
            <Pressable
              key={i}
              onPress={() => d && navigate({ name: "day", dayId: d.id })}
              disabled={!d}
              style={[styles.cell, isToday && styles.cellToday]}
            >
              <Text style={[styles.cellText, isToday && styles.cellTextToday]}>
                {date.getDate()}
              </Text>
              <View style={[styles.cellDot, dotStyle(d?.status)]} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[text.overline, styles.label]}>TREINOS DO MÊS</Text>
      {monthDays.map((d) => (
        <DayRow key={d.id} day={d} onPress={() => navigate({ name: "day", dayId: d.id })} />
      ))}
      {monthDays.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhum treino neste mês.</Text>
      )}
    </ScrollView>
  );
}

function dotStyle(status?: WorkoutDayDto["status"]) {
  if (status === "done" || status === "partial") return { backgroundColor: color.success };
  if (status === "skipped") return { backgroundColor: color.danger };
  if (status) return { backgroundColor: color.orange500 };
  return { backgroundColor: "transparent" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  monthNavBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  monthNavText: { fontFamily: font.semibold, fontSize: 20, color: color.textSecondary },
  monthLabel: { fontFamily: font.semibold, fontSize: 15, color: color.textPrimary, minWidth: 140, textAlign: "center" },
  weekdaysRow: { flexDirection: "row" },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 11,
    color: color.textFaint,
    marginBottom: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cellToday: {
    backgroundColor: color.orangeDim,
    borderRadius: 10,
  },
  cellText: { fontFamily: font.regular, fontSize: 13, color: color.textSecondary },
  cellTextToday: { fontFamily: font.semibold, color: color.orange400 },
  cellDot: { width: 4, height: 4, borderRadius: 99 },
  label: { marginTop: 18, marginBottom: 8 },
});
