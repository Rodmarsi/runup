import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import type { Block, BlockItem, BlockKind, RunningType } from "@runup/types";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { localIsoDate, parsePace, pace, duration, maskTimeDigits, RUNNING_TYPE_LABEL } from "../format.js";

const KIND_LABEL: Record<BlockKind, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  free: "Livre",
};
const KINDS: BlockKind[] = ["running", "strength", "mobility", "free"];

// "Tiros" fica de fora — pede estrutura de reps/recuperação que esse
// criador simples não edita (isso é papel do wizard de IA ou do treinador).
const RUNNING_TYPES: RunningType[] = ["easy", "long", "tempo", "recovery"];

/** ~1km de trote leve — padrão razoável quando o aluno não especifica. */
const DEFAULT_WARMUP_COOLDOWN_METERS = 1000;

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
  const { goHome, navigate } = useNav();
  const [kind, setKind] = useState<BlockKind>("running");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [runningType, setRunningType] = useState<RunningType>("easy");
  const [distanceKm, setDistanceKm] = useState("");
  const [paceText, setPaceText] = useState("");
  const [includeWarmup, setIncludeWarmup] = useState(false);
  const [warmupKm, setWarmupKm] = useState("1");
  const [includeCooldown, setIncludeCooldown] = useState(false);
  const [cooldownKm, setCooldownKm] = useState("1");
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

  const targetPaceSecPerKm = parsePace(paceText);
  const distanceMeters = distanceKm ? Math.round(parseFloat(distanceKm.replace(",", ".")) * 1000) : undefined;
  const estimatedSeconds =
    distanceMeters && targetPaceSecPerKm ? Math.round((distanceMeters / 1000) * targetPaceSecPerKm) : null;

  // Sugere um título a partir da distância/tipo, até o aluno editar o nome à mão.
  useEffect(() => {
    if (kind !== "running" || nameEdited) return;
    if (!distanceKm) return;
    setName(`${distanceKm}km ${RUNNING_TYPE_LABEL[runningType].toLowerCase()}`);
  }, [kind, runningType, distanceKm, nameEdited]);

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
    if (kind === "running" && !distanceMeters) {
      setError("Informa a distância da corrida.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const item: BlockItem =
        kind === "running"
          ? { kind: "running", runningType, distanceMeters, targetPaceSecPerKm }
          : {
              kind: "free",
              notes: description.trim() ? `${name.trim()} — ${description.trim()}` : name.trim(),
            };

      const blocks: Block[] = [];
      if (kind === "running" && includeWarmup) {
        const meters = warmupKm
          ? Math.round(parseFloat(warmupKm.replace(",", ".")) * 1000)
          : DEFAULT_WARMUP_COOLDOWN_METERS;
        blocks.push({
          kind: "running",
          role: "warmup",
          order: 0,
          items: [{ kind: "running", runningType: "easy", distanceMeters: meters }],
        });
      }
      blocks.push({ kind, role: "main", order: blocks.length, items: [item] });
      if (kind === "running" && includeCooldown) {
        const meters = cooldownKm
          ? Math.round(parseFloat(cooldownKm.replace(",", ".")) * 1000)
          : DEFAULT_WARMUP_COOLDOWN_METERS;
        blocks.push({
          kind: "running",
          role: "cooldown",
          order: blocks.length,
          items: [{ kind: "running", runningType: "easy", distanceMeters: meters }],
        });
      }

      await api.createSelfPlan({
        title: name.trim(),
        durationWeeks: 1,
        days: selectedDates.map((date) => ({
          week: 1,
          date,
          blocks,
        })),
      });
      navigate({
        name: "planOverview",
        data: {
          title: name.trim(),
          durationWeeks: 1,
          origin: "manual",
          coachName: null,
          totalWorkouts: selectedDates.length,
          workoutsPerWeek: selectedDates.length,
          kindBreakdown: [{ kind, count: selectedDates.length }],
        },
      });
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
          onChangeText={(t) => {
            setName(t);
            setNameEdited(true);
          }}
          placeholder={kind === "running" ? "ex.: 5km leve" : "ex.: Treino de pernas"}
          placeholderTextColor={color.textMuted}
        />

        {kind === "running" ? (
          <View style={styles.workoutCard}>
            <Text style={[text.overline, styles.label, { marginTop: 0 }]}>TIPO DE CORRIDA</Text>
            <View style={styles.chips}>
              {RUNNING_TYPES.map((rt) => {
                const active = runningType === rt;
                return (
                  <Pressable
                    key={rt}
                    onPress={() => setRunningType(rt)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipText}>
                      {RUNNING_TYPE_LABEL[rt]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[text.overline, styles.label]}>DISTÂNCIA (KM)</Text>
                <TextInput
                  style={styles.input}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  keyboardType="decimal-pad"
                  placeholder="ex.: 5"
                  placeholderTextColor={color.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[text.overline, styles.label]}>RITMO ALVO (OPCIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={paceText}
                  onChangeText={(t) => setPaceText(maskTimeDigits(t))}
                  keyboardType="number-pad"
                  placeholder="mm:ss /km"
                  placeholderTextColor={color.textMuted}
                />
              </View>
            </View>

            {estimatedSeconds !== null && (
              <View style={styles.estimateRow}>
                <Text style={text.muted}>Duração estimada</Text>
                <Text style={styles.estimateValue}>≈ {duration(estimatedSeconds)}</Text>
              </View>
            )}

            {targetPaceSecPerKm && (
              <Text style={[text.secondary, styles.paceHint]}>
                Não mais rápido que {pace(targetPaceSecPerKm)}/km. Isso é um limite, não uma meta.
              </Text>
            )}

            <View style={styles.warmupRow}>
              <Pressable
                onPress={() => setIncludeWarmup((v) => !v)}
                style={[styles.checkbox, includeWarmup && styles.checkboxActive]}
              >
                {includeWarmup && <Text style={styles.checkboxMark}>✓</Text>}
              </Pressable>
              <Text style={text.secondary}>Incluir aquecimento</Text>
              {includeWarmup && (
                <TextInput
                  style={styles.warmupInput}
                  value={warmupKm}
                  onChangeText={setWarmupKm}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={color.textMuted}
                />
              )}
              {includeWarmup && <Text style={text.muted}>km</Text>}
            </View>
            <View style={styles.warmupRow}>
              <Pressable
                onPress={() => setIncludeCooldown((v) => !v)}
                style={[styles.checkbox, includeCooldown && styles.checkboxActive]}
              >
                {includeCooldown && <Text style={styles.checkboxMark}>✓</Text>}
              </Pressable>
              <Text style={text.secondary}>Incluir desaquecimento</Text>
              {includeCooldown && (
                <TextInput
                  style={styles.warmupInput}
                  value={cooldownKm}
                  onChangeText={setCooldownKm}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={color.textMuted}
                />
              )}
              {includeCooldown && <Text style={text.muted}>km</Text>}
            </View>
          </View>
        ) : (
          <>
            <Text style={[text.overline, styles.label]}>DESCRIÇÃO (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Objetivo, detalhes do treino..."
              placeholderTextColor={color.textMuted}
            />
          </>
        )}

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
  row2: { flexDirection: "row", gap: 10 },
  workoutCard: {
    marginTop: 16,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.35)",
    padding: 14,
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: border.hairline,
  },
  estimateValue: { fontFamily: font.semibold, fontSize: 15, color: color.textPrimary },
  paceHint: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  warmupRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: color.orange500, borderColor: color.orange500 },
  checkboxMark: { fontFamily: font.semibold, fontSize: 12, color: color.ink },
  warmupInput: {
    backgroundColor: color.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.hairline,
    color: color.textPrimary,
    fontFamily: font.regular,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    marginLeft: "auto",
  },
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
