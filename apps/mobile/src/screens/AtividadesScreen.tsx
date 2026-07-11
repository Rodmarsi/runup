import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { color } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";
import { text } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { DayRow } from "../components/DayRow.js";
import { LoadError } from "../components/LoadError.js";
import { localIsoDate } from "../format.js";

export function AtividadesScreen() {
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

  const today = localIsoDate();
  const past = [...days]
    .filter((d) => d.date.slice(0, 10) < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={text.screenTitle}>Atividades</Text>

      {past.map((d) => (
        <DayRow key={d.id} day={d} onPress={() => navigate({ name: "day", date: d.date.slice(0, 10) })} />
      ))}

      {past.length === 0 && (
        <Text style={[text.secondary, styles.label]}>
          Nenhuma atividade registrada ainda.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16 },
  label: { marginTop: 14, marginBottom: 8 },
});
