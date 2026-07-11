import { View, Text, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import {
  pace,
  duration,
  distance,
  paceForUnits,
  unitLabel,
  paceUnitLabel,
  splitBarWidth,
  type Units,
} from "../format.js";

/** Card com o resultado real de um treino (distância/tempo/pace, splits, feedback). */
export function WorkoutLogResult({ log, units }: { log: WorkoutLogDto; units: Units }) {
  return (
    <View style={[styles.card, styles.resultCard]}>
      <View style={styles.resultRow}>
        <View style={styles.resultCol}>
          <Text style={text.muted}>Distância</Text>
          <Text style={styles.resultValue}>
            {log.distanceMeters ? `${distance(log.distanceMeters, units)} ${unitLabel(units)}` : "—"}
          </Text>
        </View>
        <View style={styles.resultCol}>
          <Text style={text.muted}>Tempo</Text>
          <Text style={styles.resultValue}>
            {log.durationSeconds ? duration(log.durationSeconds) : "—"}
          </Text>
        </View>
        <View style={styles.resultCol}>
          <Text style={text.muted}>Ritmo médio</Text>
          <Text style={styles.resultValue}>
            {paceForUnits(log.avgPaceSecPerKm, units)}{paceUnitLabel(units)}
          </Text>
        </View>
      </View>

      {(log.elevationGainM || log.avgHeartRate || log.cadence) && (
        <View style={[styles.resultRow, styles.secondRow]}>
          {log.elevationGainM !== null && log.elevationGainM !== undefined && (
            <View style={styles.resultCol}>
              <Text style={text.muted}>Elevação</Text>
              <Text style={styles.resultValueSm}>{log.elevationGainM} m</Text>
            </View>
          )}
          {log.avgHeartRate && (
            <View style={styles.resultCol}>
              <Text style={text.muted}>FC média</Text>
              <Text style={styles.resultValueSm}>{log.avgHeartRate} bpm</Text>
            </View>
          )}
          {log.cadence && (
            <View style={styles.resultCol}>
              <Text style={text.muted}>Cadência</Text>
              <Text style={styles.resultValueSm}>{log.cadence} spm</Text>
            </View>
          )}
        </View>
      )}

      {log.splits && log.splits.length > 0 && (
        <View style={styles.splitsTable}>
          <Text style={[text.overline, styles.splitsLabel]}>SPLITS</Text>
          {log.splits.map((s) => (
            <View key={s.km} style={styles.splitRow}>
              <Text style={styles.splitKm}>{s.km} km</Text>
              <View style={styles.splitBarTrack}>
                <View
                  style={[styles.splitBar, { width: `${splitBarWidth(s.paceSecPerKm, log.splits!)}%` }]}
                />
              </View>
              <Text style={styles.splitPace}>{pace(s.paceSecPerKm)}/km</Text>
            </View>
          ))}
        </View>
      )}

      {(log.perceivedEffort || log.notes || (log.pain && log.pain !== "Nenhuma")) && (
        <View style={styles.feedbackBlock}>
          {log.perceivedEffort && (
            <Text style={text.secondary}>Esforço percebido: {log.perceivedEffort}/10</Text>
          )}
          {log.pain && log.pain !== "Nenhuma" && (
            <Text style={[text.secondary, { color: color.danger }]}>Dor relatada: {log.pain}</Text>
          )}
          {log.notes && <Text style={text.secondary}>"{log.notes}"</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  resultCard: { marginBottom: 8, gap: 4 },
  resultRow: { flexDirection: "row", justifyContent: "space-between" },
  secondRow: { marginTop: 10 },
  resultCol: { flex: 1 },
  resultValue: { fontFamily: font.bold, fontSize: 16, color: color.textPrimary, marginTop: 2 },
  resultValueSm: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary, marginTop: 2 },
  splitsTable: { marginTop: 14 },
  splitsLabel: { marginBottom: 8 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  splitKm: { fontFamily: font.medium, fontSize: 11, color: color.textMuted, width: 34 },
  splitBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: color.surface3,
    overflow: "hidden",
  },
  splitBar: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  splitPace: { fontFamily: font.medium, fontSize: 11, color: color.textSecondary, width: 56, textAlign: "right" },
  feedbackBlock: { marginTop: 12, gap: 4 },
});
