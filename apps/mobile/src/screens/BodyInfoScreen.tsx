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
import type { AthleteProfileDto, Sex, ExperienceLevel } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { LoadError } from "../components/LoadError.js";

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
    api
      .athleteProfile()
      .then(fill)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

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

      <Field label="Data de nascimento (AAAA-MM-DD)">
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="ex.: 1994-03-20"
          placeholderTextColor={color.textFaint}
        />
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
});
