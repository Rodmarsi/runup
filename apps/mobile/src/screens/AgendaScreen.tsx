import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { color } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";
import { text } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { DayRow } from "../components/DayRow.js";
import { LoadError } from "../components/LoadError.js";

export function AgendaScreen() {
  const { navigate } = useNav();
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const byWeek = new Map<number, WorkoutDayDto[]>();
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const list = byWeek.get(d.week) ?? [];
    list.push(d);
    byWeek.set(d.week, list);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={text.screenTitle}>Agenda</Text>
      {[...byWeek.entries()].map(([week, list]) => (
        <View key={week} style={styles.weekGroup}>
          <Text style={[text.overline, styles.label]}>SEMANA {week}</Text>
          {list.map((d) => (
            <DayRow key={d.id} day={d} onPress={() => navigate({ name: "day", dayId: d.id })} />
          ))}
        </View>
      ))}
      {days.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhum treino na agenda.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16 },
  weekGroup: { marginTop: 6 },
  label: { marginTop: 10, marginBottom: 8 },
});
