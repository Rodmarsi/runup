import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { WorkoutLogDto, WorkoutLogKind, AthleteProfileDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import { WorkoutLogResult } from "../components/WorkoutLogResult.js";

const KIND_LABEL: Record<WorkoutLogKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  bike: "Bike",
  walk: "Caminhada",
  other: "Outro",
};

const WEEKDAY_NAMES = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];
const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Zona de FC (%1-5) a partir da FC média e da FC máxima cadastrada no perfil. */
function hrZone(avgHeartRate: number, hrMaxBpm: number): { zone: number; pct: number } {
  const pct = Math.round((avgHeartRate / hrMaxBpm) * 100);
  if (pct < 60) return { zone: 1, pct };
  if (pct < 70) return { zone: 2, pct };
  if (pct < 80) return { zone: 3, pct };
  if (pct < 90) return { zone: 4, pct };
  return { zone: 5, pct };
}

export function ActivityDetailScreen({ log }: { log: WorkoutLogDto }) {
  const { goHome } = useNav();
  const { units } = useSettings();
  const [profile, setProfile] = useState<AthleteProfileDto | null>(null);

  useEffect(() => {
    api.athleteProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const zone =
    log.avgHeartRate && profile?.hrMaxBpm
      ? hrZone(log.avgHeartRate, profile.hrMaxBpm)
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>

      <Text style={[text.overline, styles.kind]}>{KIND_LABEL[log.kind].toUpperCase()}</Text>
      <Text style={text.screenTitle}>{formatDateTime(log.completedAt)}</Text>

      <View style={styles.spacer} />
      <WorkoutLogResult log={log} units={units} />

      {zone && (
        <View style={[styles.card, styles.zoneCard]}>
          <Text style={[text.overline, styles.zoneLabel]}>ZONA CARDÍACA</Text>
          <View style={styles.zoneTrack}>
            <View style={[styles.zoneFill, { width: `${Math.min(zone.pct, 100)}%` }]} />
          </View>
          <Text style={text.muted}>Zona {zone.zone} · {zone.pct}% da FC máxima</Text>
        </View>
      )}

      <Text style={[text.muted, styles.note]}>
        Mapa, fotos e compartilhamento chegam numa próxima etapa.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 32 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  kind: { color: color.orange400, marginBottom: 4 },
  spacer: { height: 12 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  zoneCard: { marginTop: 8 },
  zoneLabel: { marginBottom: 8 },
  zoneTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: color.surface3,
    overflow: "hidden",
    marginBottom: 6,
  },
  zoneFill: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  note: { marginTop: 20, fontSize: 12, textAlign: "center" },
});
