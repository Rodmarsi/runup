import { View, StyleSheet } from "react-native";
import { color } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";

// Azul de recuperação — funcional, não é cor da marca (regra do farol reserva o laranja pro hero).
const RECOVERY_BLUE = "#5B9DFF";

function statusColor(status: WorkoutDayDto["status"]): string {
  if (status === "done" || status === "partial") return color.success;
  if (status === "skipped") return color.danger;
  return color.orange500;
}

/**
 * Bolinhas abaixo da data: uma por tipo de treino planejado naquele dia
 * (ex.: corrida + musculação = duas bolinhas), + uma azul se o dia é de
 * recuperação obrigatória.
 */
export function DayDots({ day }: { day?: WorkoutDayDto }) {
  if (!day) return <View style={styles.placeholder} />;
  const kinds = Array.from(new Set(day.blocks.map((b) => b.kind)));
  const dotColor = statusColor(day.status);
  return (
    <View style={styles.row}>
      {kinds.map((k, i) => (
        <View key={`${k}-${i}`} style={[styles.dot, { backgroundColor: dotColor }]} />
      ))}
      {day.mandatoryRecovery && (
        <View style={[styles.dot, { backgroundColor: RECOVERY_BLUE }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 99 },
  placeholder: { width: 6, height: 6, marginTop: 2 },
});
