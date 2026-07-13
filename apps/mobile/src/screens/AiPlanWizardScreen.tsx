import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import type { AiPlanPreview, ExperienceLevel } from "@runup/api-client";
import type { RaceDistance } from "@runup/types";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav, type AiPlanPrefill } from "../nav.js";
import { localIsoDate, parsePace, summarizePlanDays } from "../format.js";
import { DateField } from "../components/DateField.js";

const RACE_LABEL: Record<RaceDistance, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "21k": "21 km",
  "42k": "42 km",
  other: "Outra",
};
const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};
const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DURATIONS = [4, 8, 12, 16];

type Step = 0 | 1 | 2 | 3;

/** Fluxo conversacional "Criar com IA": responde um questionário → recebe um plano completo. */
export function AiPlanWizardScreen({ prefill }: { prefill?: AiPlanPrefill }) {
  const { goHome, navigate } = useNav();
  const [step, setStep] = useState<Step>(0);

  const [objective, setObjective] = useState(prefill?.objective ?? "");
  const [targetRace, setTargetRace] = useState<RaceDistance | undefined>(prefill?.targetRace);
  const [raceDate, setRaceDate] = useState(prefill?.raceDate ?? "");

  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [bestPace, setBestPace] = useState("");
  const [longestDistanceKm, setLongestDistanceKm] = useState("");
  const [injuries, setInjuries] = useState("");

  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 6]);
  const [durationWeeks, setDurationWeeks] = useState(8);

  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AiPlanPreview | null>(null);

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function generate() {
    if (weekdays.length === 0) {
      setError("Escolhe pelo menos um dia da semana.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateAiPlan({
        objective: objective.trim() || "Melhorar o condicionamento",
        targetRace,
        raceDate: raceDate || undefined,
        availableWeekdays: weekdays,
        durationWeeks,
        startDate: localIsoDate(),
        experience,
        bestPaceSecPerKm: parsePace(bestPace),
        longestDistanceMeters: longestDistanceKm
          ? Math.round(parseFloat(longestDistanceKm.replace(",", ".")) * 1000)
          : undefined,
        injuries: injuries.trim() || undefined,
      });
      setPreview(result);
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível gerar o plano");
    } finally {
      setGenerating(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setConfirming(true);
    try {
      const days = preview.plan.days.map((d) => ({ week: d.week, date: d.date!, blocks: d.blocks }));
      await api.createSelfPlan({
        title: preview.plan.title,
        durationWeeks: preview.plan.durationWeeks,
        days,
      });
      const { workoutsPerWeek, kindBreakdown } = summarizePlanDays(days);
      navigate({
        name: "planOverview",
        data: {
          title: preview.plan.title,
          durationWeeks: preview.plan.durationWeeks,
          origin: "ai",
          coachName: null,
          totalWorkouts: days.length,
          workoutsPerWeek,
          kindBreakdown,
        },
      });
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível salvar o plano");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Cancelar</Text>
        </Pressable>
        <Text style={text.screenTitle}>Criar com IA</Text>
        <Text style={[text.muted, styles.stepIndicator]}>Passo {step + 1} de 4</Text>

        {step === 0 && (
          <>
            <Text style={[text.overline, styles.label]}>QUAL SEU OBJETIVO?</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={objective}
              onChangeText={setObjective}
              placeholder="ex.: sub 50 nos 10km, primeira meia maratona..."
              placeholderTextColor={color.textMuted}
            />

            <Text style={[text.overline, styles.label]}>TEM UMA PROVA ALVO?</Text>
            <View style={styles.chips}>
              {(Object.keys(RACE_LABEL) as RaceDistance[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setTargetRace(targetRace === r ? undefined : r)}
                  style={[styles.chip, targetRace === r && styles.chipActive]}
                >
                  <Text style={targetRace === r ? styles.chipTextActive : styles.chipText}>
                    {RACE_LABEL[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
            {targetRace && (
              <DateField
                value={raceDate}
                onChange={setRaceDate}
                placeholder="Data da prova"
                minimumDate={new Date()}
                style={{ marginTop: 8 }}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={[text.overline, styles.label]}>EXPERIÊNCIA</Text>
            <View style={styles.chips}>
              {(Object.keys(EXPERIENCE_LABEL) as ExperienceLevel[]).map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setExperience(e)}
                  style={[styles.chip, experience === e && styles.chipActive]}
                >
                  <Text style={experience === e ? styles.chipTextActive : styles.chipText}>
                    {EXPERIENCE_LABEL[e]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[text.overline, styles.label]}>MELHOR PACE ATUAL (OPCIONAL)</Text>
            <TextInput
              style={styles.input}
              value={bestPace}
              onChangeText={setBestPace}
              placeholder="mm:ss por km, ex.: 5:30"
              placeholderTextColor={color.textMuted}
            />

            <Text style={[text.overline, styles.label]}>MAIOR DISTÂNCIA JÁ PERCORRIDA (KM)</Text>
            <TextInput
              style={styles.input}
              value={longestDistanceKm}
              onChangeText={setLongestDistanceKm}
              keyboardType="decimal-pad"
              placeholder="ex.: 15"
              placeholderTextColor={color.textMuted}
            />

            <Text style={[text.overline, styles.label]}>LESÕES OU RESTRIÇÕES (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={injuries}
              onChangeText={setInjuries}
              placeholder="ex.: dor no joelho direito"
              placeholderTextColor={color.textMuted}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[text.overline, styles.label]}>DIAS DISPONÍVEIS PRA TREINAR</Text>
            <View style={styles.chips}>
              {WEEKDAY_LABEL.map((label, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleWeekday(i)}
                  style={[styles.chip, weekdays.includes(i) && styles.chipActive]}
                >
                  <Text style={weekdays.includes(i) ? styles.chipTextActive : styles.chipText}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[text.overline, styles.label]}>DURAÇÃO DO PLANO</Text>
            <View style={styles.chips}>
              {DURATIONS.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setDurationWeeks(w)}
                  style={[styles.chip, durationWeeks === w && styles.chipActive]}
                >
                  <Text style={durationWeeks === w ? styles.chipTextActive : styles.chipText}>
                    {w} semanas
                  </Text>
                </Pressable>
              ))}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {step === 3 && preview && (
          <>
            <Text style={[text.overline, styles.label]}>{preview.plan.title.toUpperCase()}</Text>
            <Text style={text.secondary}>
              {preview.summary.weeks} semanas · {preview.summary.days} treinos
            </Text>
            <View style={styles.previewList}>
              {preview.plan.days.map((d, i) => {
                const item = d.blocks[0]?.items[0];
                const desc =
                  item?.kind === "free"
                    ? item.notes
                    : item?.kind === "running"
                      ? `Corrida · ${item.runningType}`
                      : "Treino";
                return (
                  <View key={i} style={styles.previewRow}>
                    <Text style={styles.previewDate}>{d.date?.slice(5)}</Text>
                    <Text style={[text.body, { flex: 1 }]}>{desc}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 2 && (
          <Pressable onPress={() => setStep((s) => (s + 1) as Step)} style={styles.cta}>
            <Text style={styles.ctaText}>Continuar</Text>
          </Pressable>
        )}
        {step === 2 && (
          <Pressable onPress={generate} disabled={generating} style={styles.cta}>
            {generating ? (
              <ActivityIndicator color={color.ink} />
            ) : (
              <Text style={styles.ctaText}>Gerar plano</Text>
            )}
          </Pressable>
        )}
        {step === 3 && (
          <Pressable onPress={confirm} disabled={confirming} style={styles.cta}>
            {confirming ? (
              <ActivityIndicator color={color.ink} />
            ) : (
              <Text style={styles.ctaText}>Confirmar e criar plano</Text>
            )}
          </Pressable>
        )}
        {step > 0 && step < 3 && (
          <Pressable onPress={() => setStep((s) => (s - 1) as Step)} style={styles.backCta}>
            <Text style={styles.backCtaText}>Voltar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 24 },
  back: { marginBottom: 8 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  stepIndicator: { marginTop: 4, marginBottom: 8 },
  label: { marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  chipActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  chipText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  chipTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
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
  textarea: { height: 70, textAlignVertical: "top" },
  error: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginTop: 12 },
  previewList: { marginTop: 14, gap: 6 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 10,
  },
  previewDate: { fontFamily: font.semibold, fontSize: 12, color: color.orange400, width: 44 },
  footer: { padding: 16, gap: 8 },
  cta: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
  backCta: { alignItems: "center", paddingVertical: 10 },
  backCtaText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
});
