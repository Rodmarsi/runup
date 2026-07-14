import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import { ApiError, type WorkoutLogKind } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { maskTimeDigits, parseTimeInput } from "../format.js";

const PAINS = ["Nenhuma", "Joelho", "Panturrilha", "Canela", "Outro"];
const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const KIND_LABEL: Record<WorkoutLogKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  bike: "Bike",
  walk: "Caminhada",
  other: "Outro",
};
const KINDS: WorkoutLogKind[] = ["running", "strength", "mobility", "bike", "walk", "other"];
const DISTANCE_KINDS: WorkoutLogKind[] = ["running", "bike", "walk"];

/** Registro de um treino avulso (sem plano do treinador por trás). */
export function LogWorkoutScreen() {
  const { goHome } = useNav();
  const [kind, setKind] = useState<WorkoutLogKind>("running");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationText, setDurationText] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [pain, setPain] = useState<string | null>("Nenhuma");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDistance = DISTANCE_KINDS.includes(kind);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const distance =
        hasDistance && distanceKm
          ? Math.round(parseFloat(distanceKm.replace(",", ".")) * 1000)
          : undefined;
      const duration = durationText ? parseTimeInput(durationText) : undefined;
      await api.logStandaloneWorkout({
        kind,
        distanceMeters: distance,
        durationSeconds: duration,
        perceivedEffort: rpe ?? undefined,
        pain: pain && pain !== "Nenhuma" ? pain : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert("Treino registrado!", "Seu treino foi salvo com sucesso.", [
        { text: "OK", onPress: goHome },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Cancelar</Text>
        </Pressable>
        <Text style={text.screenTitle}>Registrar treino avulso</Text>
        <Text style={[text.secondary, styles.subtitle]}>
          Treinou por conta própria, sem plano do treinador? Registre aqui.
        </Text>

        <Text style={[text.overline, styles.label]}>TIPO DE TREINO</Text>
        <View style={styles.chips}>
          {KINDS.map((k) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[styles.painChip, active && styles.painActive]}
              >
                <Text style={active ? styles.painActiveText : styles.painText}>
                  {KIND_LABEL[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dataRow}>
          {hasDistance && (
            <View style={styles.dataCol}>
              <Text style={[text.overline, styles.label]}>DISTÂNCIA (KM)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="6,5"
                placeholderTextColor={color.textMuted}
                value={distanceKm}
                onChangeText={setDistanceKm}
              />
            </View>
          )}
          <View style={styles.dataCol}>
            <Text style={[text.overline, styles.label]}>TEMPO</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="mm:ss"
              placeholderTextColor={color.textMuted}
              value={durationText}
              onChangeText={(t) => setDurationText(maskTimeDigits(t))}
            />
          </View>
        </View>

        <Text style={[text.overline, styles.label]}>ESFORÇO PERCEBIDO (RPE)</Text>
        <View style={styles.chips}>
          {RPE.map((n) => {
            const active = rpe === n;
            return (
              <Pressable
                key={n}
                onPress={() => setRpe(n)}
                style={[styles.rpe, active && styles.rpeActive]}
              >
                <Text style={active ? styles.rpeActiveText : styles.rpeText}>{n}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[text.overline, styles.label]}>ALGUMA DOR?</Text>
        <View style={styles.chips}>
          {PAINS.map((p) => {
            const active = pain === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPain(p)}
                style={[styles.painChip, active && styles.painActive]}
              >
                <Text style={active ? styles.painActiveText : styles.painText}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[text.overline, styles.label]}>NOTAS</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          placeholder="Como você se sentiu?"
          placeholderTextColor={color.textMuted}
          value={notes}
          onChangeText={setNotes}
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={save} disabled={busy} style={styles.cta}>
          <LinearGradient
            colors={gradients.brasa}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Salvar registro</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 24 },
  back: { marginBottom: 8 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  subtitle: { marginTop: 4, marginBottom: 8 },
  label: { marginTop: 16, marginBottom: 6 },
  dataRow: { flexDirection: "row", gap: 10 },
  dataCol: { flex: 1 },
  input: {
    backgroundColor: color.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.hairline,
    color: color.textPrimary,
    fontFamily: font.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { height: 80, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rpe: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: color.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  rpeActive: { backgroundColor: color.orange500 },
  rpeText: { fontFamily: font.semibold, fontSize: 12, color: color.textSecondary },
  rpeActiveText: { fontFamily: font.semibold, fontSize: 12, color: color.ink },
  painChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: color.surface2,
  },
  painActive: { backgroundColor: color.orangeDim },
  painText: { fontFamily: font.regular, fontSize: 12, color: color.textSecondary },
  painActiveText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  error: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginTop: 12 },
  footer: { padding: 16 },
  cta: { borderRadius: 99, overflow: "hidden" },
  ctaGradient: { paddingVertical: 14, alignItems: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
});
