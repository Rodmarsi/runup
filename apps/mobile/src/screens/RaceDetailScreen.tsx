import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { color, border } from "@runup/ui/tokens";
import { ApiError, type RaceDto, type RaceStatus } from "@runup/api-client";
import type { RaceDistance } from "@runup/types";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { km, duration, isoToBr } from "../format.js";

const STATUS_LABEL: Record<RaceStatus, string> = {
  interested: "Interessado",
  registered: "Inscrito",
  completed: "Concluída",
};

/** Aproxima a distância da prova pra uma das opções do wizard de IA. */
function nearestRaceDistance(meters: number | null): RaceDistance {
  if (!meters) return "other";
  const km = meters / 1000;
  if (km <= 6) return "5k";
  if (km <= 12) return "10k";
  if (km <= 25) return "21k";
  if (km <= 45) return "42k";
  return "other";
}

export function RaceDetailScreen({ race }: { race: RaceDto }) {
  const { goHome, navigate } = useNav();
  const [status, setStatus] = useState(race.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [isTarget, setIsTarget] = useState(race.isTarget);
  const [savingTarget, setSavingTarget] = useState(false);

  async function changeStatus(next: RaceStatus) {
    setSavingStatus(true);
    try {
      await api.updateRace(race.id, { status: next });
      setStatus(next);
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível atualizar");
    } finally {
      setSavingStatus(false);
    }
  }

  async function toggleTarget() {
    setSavingTarget(true);
    try {
      await api.updateRace(race.id, { isTarget: !isTarget });
      setIsTarget((v) => !v);
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível atualizar");
    } finally {
      setSavingTarget(false);
    }
  }

  function remove() {
    Alert.alert("Remover prova?", race.name, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await api.deleteRace(race.id);
          goHome();
        },
      },
    ]);
  }

  function createPlan() {
    navigate({
      name: "aiPlanWizard",
      prefill: {
        targetRace: nearestRaceDistance(race.distanceMeters),
        raceDate: race.raceDate.slice(0, 10),
        objective: `Me preparar pra ${race.name}`,
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>

      <Text style={text.screenTitle}>{race.name}</Text>
      <Text style={[text.secondary, styles.subtitle]}>
        {[race.city, race.state].filter(Boolean).join(" — ")}
        {race.city || race.state ? " · " : ""}
        {isoToBr(race.raceDate.slice(0, 10))}
        {race.startTime ? ` · largada ${race.startTime}` : ""}
      </Text>

      <Pressable
        onPress={toggleTarget}
        disabled={savingTarget}
        style={[styles.targetToggle, isTarget && styles.targetToggleActive]}
      >
        <Text style={isTarget ? styles.targetToggleTextActive : styles.targetToggleText}>
          {isTarget ? "🎯 Prova alvo" : "Marcar como prova alvo"}
        </Text>
      </Pressable>

      <View style={styles.metaRow}>
        <MetaCard label="Distância" value={race.distanceMeters ? `${km(race.distanceMeters)} km` : "—"} />
        <MetaCard
          label="Tempo alvo"
          value={race.targetTimeSeconds ? duration(race.targetTimeSeconds) : "—"}
        />
      </View>

      <Text style={[text.overline, styles.label]}>STATUS</Text>
      <View style={styles.segment}>
        {(Object.keys(STATUS_LABEL) as RaceStatus[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => changeStatus(s)}
            disabled={savingStatus}
            style={[styles.segmentBtn, status === s && styles.segmentBtnActive]}
          >
            <Text style={status === s ? styles.segmentTextActive : styles.segmentText}>
              {STATUS_LABEL[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      {(race.courseUrl || race.registrationUrl) && (
        <>
          <Text style={[text.overline, styles.label]}>LINKS</Text>
          {race.courseUrl && (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(race.courseUrl!)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver percurso / altimetria</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
          {race.registrationUrl && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(race.registrationUrl!)}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Inscrição</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        </>
      )}

      <Pressable onPress={createPlan} style={styles.planBtn}>
        <Text style={styles.planBtnText}>Criar plano pra essa prova (IA)</Text>
      </Pressable>

      <Pressable onPress={remove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>Remover prova</Text>
      </Pressable>
    </ScrollView>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={text.muted}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  subtitle: { marginTop: 4, marginBottom: 16 },
  targetToggle: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  targetToggleActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  targetToggleText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  targetToggleTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaCard: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  metaValue: { fontFamily: font.bold, fontSize: 17, color: color.textPrimary, marginTop: 2 },
  label: { marginTop: 20, marginBottom: 8 },
  segment: { flexDirection: "row", gap: 6 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  segmentBtnActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  segmentText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  segmentTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginBottom: 8,
  },
  linkText: { fontFamily: font.medium, fontSize: 13, color: color.textPrimary, flex: 1 },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  planBtn: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  planBtnText: { fontFamily: font.semibold, fontSize: 14, color: color.ink },
  removeBtn: { marginTop: 12, alignItems: "center", paddingVertical: 10 },
  removeBtnText: { fontFamily: font.medium, fontSize: 12, color: color.danger },
});
