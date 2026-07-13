import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutDayDto } from "@runup/api-client";
import { font } from "../theme.js";
import { km, pace, isoToBr } from "../format.js";

function title(day: WorkoutDayDto): string {
  const run = day.blocks.flatMap((b) => b.items).find((i) => i.kind === "running");
  if (run && run.kind === "running") {
    if (run.interval) return `Tiros · ${run.interval.reps}× ${run.interval.repDistanceMeters ?? ""}m`;
    if (run.distanceMeters) return `Corrida · ${km(run.distanceMeters)} km`;
    return "Corrida";
  }
  const free = day.blocks.flatMap((b) => b.items).find((i) => i.kind === "free");
  if (free && free.kind === "free") return free.notes.slice(0, 40);
  return "Treino";
}

function subtitle(day: WorkoutDayDto): string {
  const run = day.blocks.flatMap((b) => b.items).find((i) => i.kind === "running");
  if (run && run.kind === "running" && run.targetPaceSecPerKm) {
    return `pace ${pace(run.targetPaceSecPerKm)}/km`;
  }
  return isoToBr(day.date.slice(0, 10));
}

function statusMark(status: WorkoutDayDto["status"]): { icon: string; color: string } {
  switch (status) {
    case "done":
      return { icon: "✓", color: color.success };
    case "partial":
      return { icon: "~", color: color.orange400 };
    case "skipped":
      return { icon: "✕", color: color.danger };
    default:
      return { icon: "", color: color.surface4 };
  }
}

export function DayRow({
  day,
  onPress,
}: {
  day: WorkoutDayDto;
  onPress: () => void;
}) {
  const mark = statusMark(day.status);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.mark, { borderColor: mark.color }]}>
        <Text style={[styles.markText, { color: mark.color }]}>{mark.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title(day)}</Text>
        <Text style={styles.sub}>{subtitle(day)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginBottom: 8,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 99,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontFamily: font.bold, fontSize: 12 },
  title: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary },
  sub: { fontFamily: font.regular, fontSize: 11, color: color.textMuted },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
});
