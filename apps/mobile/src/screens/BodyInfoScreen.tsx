import { useEffect, useState, type ReactNode } from "react";
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
import { ApiError, type AthleteProfileDto, type BodyMetricDto, type Sex, type ExperienceLevel } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { LoadError } from "../components/LoadError.js";
import { DateField } from "../components/DateField.js";
import { localIsoDate, isoToBr } from "../format.js";

const SEX_LABEL: Record<Sex, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export function BodyInfoScreen() {
  const { goHome } = useNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex | undefined>(undefined);
  const [hrMaxBpm, setHrMaxBpm] = useState("");
  const [vo2max, setVo2max] = useState("");
  const [experience, setExperience] = useState<ExperienceLevel | undefined>(undefined);
  const [weeklyAvailabilityDays, setWeeklyAvailabilityDays] = useState("");

  const [metrics, setMetrics] = useState<BodyMetricDto[]>([]);
  const [metricDate, setMetricDate] = useState(localIsoDate());
  const [metricWeight, setMetricWeight] = useState("");
  const [metricBodyFat, setMetricBodyFat] = useState("");
  const [savingMetric, setSavingMetric] = useState(false);

  function fill(p: AthleteProfileDto) {
    setHeightCm(p.heightCm ? String(p.heightCm) : "");
    setBirthDate(p.birthDate ? p.birthDate.slice(0, 10) : "");
    setSex(p.sex);
    setHrMaxBpm(p.hrMaxBpm ? String(p.hrMaxBpm) : "");
    setVo2max(p.vo2max ? String(p.vo2max) : "");
    setExperience(p.experience);
    setWeeklyAvailabilityDays(
      p.weeklyAvailabilityDays !== undefined ? String(p.weeklyAvailabilityDays) : "",
    );
  }

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([api.athleteProfile(), api.bodyMetrics()])
      .then(([profile, bodyMetrics]) => {
        fill(profile);
        setMetrics(bodyMetrics);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addMetric() {
    if (!metricWeight && !metricBodyFat) {
      Alert.alert("Preencha ao menos o peso ou o percentual de gordura.");
      return;
    }
    setSavingMetric(true);
    try {
      const m = await api.addBodyMetric({
        date: metricDate,
        weightKg: metricWeight ? Number(metricWeight.replace(",", ".")) : undefined,
        bodyFatPct: metricBodyFat ? Number(metricBodyFat.replace(",", ".")) : undefined,
      });
      setMetrics((prev) => [m, ...prev]);
      setMetricWeight("");
      setMetricBodyFat("");
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível salvar a medida");
    } finally {
      setSavingMetric(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateAthleteProfile({
        heightCm: heightCm ? Number(heightCm.replace(",", ".")) : undefined,
        birthDate: birthDate || undefined,
        sex,
        hrMaxBpm: hrMaxBpm ? Number(hrMaxBpm) : undefined,
        vo2max: vo2max ? Number(vo2max.replace(",", ".")) : undefined,
        experience,
        weeklyAvailabilityDays: weeklyAvailabilityDays
          ? Number(weeklyAvailabilityDays)
          : undefined,
      });
      Alert.alert("Informações salvas!");
      goHome();
    } catch {
      Alert.alert("Não foi possível salvar. Confira os campos e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

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
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>
        <LoadError onRetry={load} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>
      <Text style={text.screenTitle}>Informações</Text>

      <Field label="Altura (cm)">
        <TextInput
          style={styles.input}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
          placeholder="ex.: 178"
          placeholderTextColor={color.textFaint}
        />
      </Field>

      <Field label="Data de nascimento">
        <DateField value={birthDate} onChange={setBirthDate} maximumDate={new Date()} />
      </Field>

      <Field label="Sexo">
        <View style={styles.segment}>
          {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSex(s)}
              style={[styles.segmentBtn, sex === s && styles.segmentBtnActive]}
            >
              <Text style={sex === s ? styles.segmentTextActive : styles.segmentText}>
                {SEX_LABEL[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="FC máxima (bpm)">
        <TextInput
          style={styles.input}
          value={hrMaxBpm}
          onChangeText={setHrMaxBpm}
          keyboardType="numeric"
          placeholder="ex.: 190"
          placeholderTextColor={color.textFaint}
        />
      </Field>

      <Field label="VO2 máx.">
        <TextInput
          style={styles.input}
          value={vo2max}
          onChangeText={setVo2max}
          keyboardType="numeric"
          placeholder="ex.: 48"
          placeholderTextColor={color.textFaint}
        />
      </Field>

      <Field label="Experiência">
        <View style={styles.segment}>
          {(Object.keys(EXPERIENCE_LABEL) as ExperienceLevel[]).map((e) => (
            <Pressable
              key={e}
              onPress={() => setExperience(e)}
              style={[styles.segmentBtn, experience === e && styles.segmentBtnActive]}
            >
              <Text style={experience === e ? styles.segmentTextActive : styles.segmentText}>
                {EXPERIENCE_LABEL[e]}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Disponibilidade semanal (dias)">
        <TextInput
          style={styles.input}
          value={weeklyAvailabilityDays}
          onChangeText={setWeeklyAvailabilityDays}
          keyboardType="numeric"
          placeholder="ex.: 4"
          placeholderTextColor={color.textFaint}
        />
      </Field>

      <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>{saving ? "Salvando..." : "Salvar"}</Text>
      </Pressable>

      <Text style={[text.overline, styles.sectionLabel]}>MEDIDAS CORPORAIS</Text>
      <View style={styles.metricForm}>
        <DateField value={metricDate} onChange={setMetricDate} maximumDate={new Date()} />
        <View style={styles.row2}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={metricWeight}
            onChangeText={setMetricWeight}
            keyboardType="decimal-pad"
            placeholder="Peso (kg)"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={metricBodyFat}
            onChangeText={setMetricBodyFat}
            keyboardType="decimal-pad"
            placeholder="% gordura"
            placeholderTextColor={color.textFaint}
          />
        </View>
        <Pressable onPress={addMetric} disabled={savingMetric} style={styles.addMetricBtn}>
          <Text style={styles.addMetricBtnText}>
            {savingMetric ? "Salvando..." : "Registrar medida"}
          </Text>
        </Pressable>
      </View>

      {metrics.length > 0 && (
        <View style={styles.metricList}>
          {metrics.map((m) => (
            <View key={m.id} style={styles.metricRow}>
              <Text style={styles.metricDate}>{isoToBr(m.date.slice(0, 10))}</Text>
              <Text style={[text.body, { flex: 1 }]}>
                {m.weightKg != null ? `${m.weightKg} kg` : "—"}
                {m.bodyFatPct != null ? ` · ${m.bodyFatPct}% gordura` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[text.overline, styles.fieldLabel]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  field: { marginTop: 18 },
  fieldLabel: { marginBottom: 8 },
  input: {
    backgroundColor: color.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: color.textPrimary,
  },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  segmentBtnActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  segmentText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  segmentTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  saveBtn: {
    marginTop: 28,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  saveBtnText: { fontFamily: font.semibold, fontSize: 14, color: color.ink },
  sectionLabel: { marginTop: 32, marginBottom: 8 },
  row2: { flexDirection: "row", gap: 8 },
  metricForm: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    gap: 10,
  },
  addMetricBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
  },
  addMetricBtnText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  metricList: { marginTop: 12, gap: 6 },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 10,
  },
  metricDate: { fontFamily: font.semibold, fontSize: 12, color: color.orange400, width: 70 },
});
