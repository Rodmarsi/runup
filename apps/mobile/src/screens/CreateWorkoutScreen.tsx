import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import type { BlockKind } from "@runup/types";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { localIsoDate } from "../format.js";

const KIND_LABEL: Record<BlockKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  free: "Livre",
};
const KINDS: BlockKind[] = ["running", "strength", "mobility", "free"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Diferença em meses (0-based) entre a data dada e hoje — pra abrir o mês certo no calendário. */
function monthOffsetFor(iso?: string): number {
  if (!iso) return 0;
  const now = new Date();
  const [y, m] = iso.split("-").map(Number) as [number, number];
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
}

/** Aluno agenda um ou mais treinos futuros por conta própria — sem treinador. */
export function CreateWorkoutScreen({ initialDate }: { initialDate?: string }) {
  const { goHome } = useNav();
  const [kind, setKind] = useState<BlockKind>("running");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthOffset, setMonthOffset] = useState(() => monthOffsetFor(initialDate));
  const [selectedDates, setSelectedDates] = useState<string[]>(initialDate ? [initialDate] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const shown = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const grid = monthGrid(year, month);
  const today = localIsoDate();

  function toggleDate(iso: string) {
    setSelectedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );
  }

  async function save() {
    if (!name.trim()) {
      setError("Dá um nome pro treino.");
      return;
    }
    if (selectedDates.length === 0) {
      setError("Escolhe pelo menos uma data.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const notes = description.trim() ? `${name.trim()} — ${description.trim()}` : name.trim();
      await api.createSelfPlan({
        title: name.trim(),
        durationWeeks: 1,
        days: selectedDates.map((date) => ({
          week: 1,
          date,
          blocks: [
            {
              kind,
              role: "main",
              order: 0,
              items: [{ kind: "free", notes }],
            },
          ],
        })),
      });
      Alert.alert("Treino agendado!", "", [{ text: "OK", onPress: goHome }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível criar o treino");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Cancelar</Text>
        </Pressable>
        <Text style={text.screenTitle}>Criar treino</Text>

        <Text style={[text.overline, styles.label]}>TIPO</Text>
        <View style={styles.chips}>
          {KINDS.map((k) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={active ? styles.chipTextActive : styles.chipText}>
                  {KIND_LABEL[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[text.overline, styles.label]}>NOME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="ex.: Treino de pernas"
          placeholderTextColor={color.textMuted}
        />

        <Text style={[text.overline, styles.label]}>DESCRIÇÃO (OPCIONAL)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Objetivo, detalhes do treino..."
          placeholderTextColor={color.textMuted}
        />

        <Text style={[text.overline, styles.label]}>
          DATAS {selectedDates.length > 0 ? `(${selectedDates.length} selecionada${selectedDates.length > 1 ? "s" : ""})` : ""}
        </Text>
        <Text style={[text.muted, styles.hint]}>
          Toque em quantos dias quiser — é assim que se repete o treino.
        </Text>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setMonthOffset((m) => m - 1)} style={styles.monthNavBtn}>
            <Text style={styles.monthNavText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <Pressable onPress={() => setMonthOffset((m) => m + 1)} style={styles.monthNavBtn}>
            <Text style={styles.monthNavText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekdayLabel}>{w}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((date, i) => {
            if (!date) return <View key={i} style={styles.cell} />;
            const iso = localIsoDate(date);
            const selected = selectedDates.includes(iso);
            const past = iso < today;
            return (
              <Pressable
                key={i}
                disabled={past}
                onPress={() => toggleDate(iso)}
                style={[styles.cell, selected && styles.cellSelected]}
              >
                <Text
                  style={[
                    styles.cellText,
                    selected && styles.cellTextSelected,
                    past && styles.cellTextPast,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={save} disabled={saving} style={styles.cta}>
          <Text style={styles.ctaText}>{saving ? "Salvando..." : "Criar treino"}</Text>
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
  label: { marginTop: 18, marginBottom: 8 },
  hint: { marginBottom: 10, fontSize: 12 },
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
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  monthNavBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  monthNavText: { fontFamily: font.semibold, fontSize: 18, color: color.textSecondary },
  monthLabel: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary, minWidth: 130, textAlign: "center" },
  weekdaysRow: { flexDirection: "row" },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 11,
    color: color.textFaint,
    marginBottom: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: { backgroundColor: color.orange500, borderRadius: 10 },
  cellText: { fontFamily: font.regular, fontSize: 13, color: color.textSecondary },
  cellTextSelected: { fontFamily: font.semibold, color: color.ink },
  cellTextPast: { color: color.textFaint },
  error: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginTop: 12 },
  footer: { padding: 16 },
  cta: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
});
