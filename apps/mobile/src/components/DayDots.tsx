import { View, Text, StyleSheet } from "react-native";
import { color } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";

// Azul de recuperação — funcional, não é cor da marca (regra do farol reserva o laranja pro hero).
const RECOVERY_BLUE = "#5B9DFF";

// Quando a bolinha fica sobre um fundo já laranja (dia atual destacado), o
// laranja normal ficaria invisível — usa tinta escura pra continuar visível.
function statusColor(status: WorkoutDayDto["status"], onAccent?: boolean): string {
  if (status === "done" || status === "partial") return color.success;
  if (status === "skipped") return color.danger;
  return onAccent ? color.ink : color.orange500;
}

/**
 * Indicadores abaixo da data: medalha se há prova no dia, senão uma bolinha
 * por tipo de treino planejado (ex.: corrida + musculação = duas bolinhas),
 * + uma azul se o dia é de recuperação obrigatória.
 */
export function DayDots({
  day,
  hasRace,
  onAccent,
}: {
  day?: WorkoutDayDto;
  hasRace?: boolean;
  /** A bolinha está sobre um fundo já laranja (célula do dia atual/selecionado). */
  onAccent?: boolean;
}) {
  if (hasRace) return <Text style={styles.medal}>🏅</Text>;
  if (!day) return <View style={styles.placeholder} />;
  const kinds = Array.from(new Set(day.blocks.map((b) => b.kind)));
  const dotColor = statusColor(day.status, onAccent);
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
  medal: { fontSize: 10, marginTop: 1 },
});
