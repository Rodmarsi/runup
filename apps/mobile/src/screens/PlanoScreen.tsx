import { useEffect, useState } from "react";
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
import { font } from "../theme.js";
import { ApiError } from "@runup/api-client";
import type {
  WorkoutDayDto,
  RaceDto,
  ConversationDto,
  StudentInviteDto,
  CurrentPlanDto,
} from "@runup/api-client";
import { text } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { DayRow } from "../components/DayRow.js";
import { DayDots } from "../components/DayDots.js";
import { LoadError } from "../components/LoadError.js";
import { localIsoDate } from "../format.js";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Grade do mês (dom-sáb), com dias do mês anterior/seguinte como `null`. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0 = domingo
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function PlanoScreen() {
  const { navigate } = useNav();
  const [days, setDays] = useState<WorkoutDayDto[]>([]);
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [pendingInvites, setPendingInvites] = useState<StudentInviteDto[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [invitingCoach, setInvitingCoach] = useState(false);
  const [coachEmail, setCoachEmail] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      api.calendar(),
      api.races(),
      api.conversations(),
      api.studentInvites(),
      api.currentPlan(),
    ])
      .then(([cal, rc, conv, invites, plan]) => {
        setDays(cal);
        setRaces(rc);
        setConversations(conv);
        setPendingInvites(invites);
        setCurrentPlan(plan);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openPlanOverview() {
    if (!currentPlan) return;
    navigate({
      name: "planOverview",
      data: {
        title: currentPlan.title,
        durationWeeks: currentPlan.durationWeeks,
        origin: currentPlan.madeByCoach ? "coach" : "manual",
        coachName: currentPlan.coachName,
        totalWorkouts: currentPlan.totalWorkouts,
        workoutsPerWeek: currentPlan.workoutsPerWeek,
        kindBreakdown: currentPlan.kindBreakdown,
      },
    });
  }

  async function sendCoachInvite() {
    if (!coachEmail.trim()) return;
    setInviteSaving(true);
    setInviteError(null);
    try {
      await api.inviteCoach(coachEmail.trim());
      setCoachEmail("");
      setInvitingCoach(false);
      Alert.alert("Convite enviado!", "O treinador vai receber seu convite.");
    } catch (e) {
      setInviteError(e instanceof ApiError ? e.message : "Não foi possível enviar o convite");
    } finally {
      setInviteSaving(false);
    }
  }

  async function respondInvite(id: string, accept: boolean) {
    await (accept ? api.acceptStudentInvite(id) : api.declineStudentInvite(id));
    load();
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
        <LoadError onRetry={load} />
      </View>
    );
  }

  const today = localIsoDate();
  const now = new Date();
  const shown = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const raceDates = new Set(races.map((r) => r.raceDate.slice(0, 10)));
  const grid = monthGrid(year, month);

  const monthDays = [...days]
    .filter((d) => d.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.titleRow}>
        <Text style={text.screenTitle}>Plano</Text>
        <View style={styles.titleActions}>
          <Pressable onPress={() => navigate({ name: "createWorkout" })} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>+ Criar</Text>
          </Pressable>
          <Pressable onPress={() => navigate({ name: "aiPlanWizard" })} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>✨ Criar com IA</Text>
          </Pressable>
        </View>
      </View>

      {pendingInvites.length > 0 ? (
        <View style={styles.coachCard}>
          <Text style={[text.overline, styles.coachLabel]}>CONVITE DE TREINADOR</Text>
          {pendingInvites.map((inv) => (
            <View key={inv.id} style={styles.inviteRow}>
              <Text style={[text.body, { flex: 1 }]}>{inv.coach.name} quer ser seu treinador</Text>
              <Pressable onPress={() => respondInvite(inv.id, true)} style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>Aceitar</Text>
              </Pressable>
              <Pressable onPress={() => respondInvite(inv.id, false)} style={styles.declineBtn}>
                <Text style={styles.declineBtnText}>Recusar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : conversations.length > 0 ? (
        <View style={styles.coachCard}>
          <Text style={[text.overline, styles.coachLabel]}>SEU TREINADOR</Text>
          <Text style={text.body}>{conversations[0]!.with.name}</Text>
        </View>
      ) : invitingCoach ? (
        <View style={styles.coachCard}>
          <Text style={[text.overline, styles.coachLabel]}>CONVIDAR TREINADOR</Text>
          <TextInput
            style={styles.input}
            value={coachEmail}
            onChangeText={setCoachEmail}
            placeholder="email@treinador.com"
            placeholderTextColor={color.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {inviteError && <Text style={styles.inviteErrorText}>{inviteError}</Text>}
          <View style={styles.inviteFormRow}>
            <Pressable onPress={() => setInvitingCoach(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={sendCoachInvite}
              disabled={inviteSaving}
              style={[styles.acceptBtn, styles.acceptBtnWide]}
            >
              <Text style={styles.acceptBtnText}>{inviteSaving ? "..." : "Enviar convite"}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setInvitingCoach(true)} style={styles.hireBtn}>
          <Text style={styles.hireBtnText}>Contratar treinador</Text>
        </Pressable>
      )}

      {currentPlan && (
        <Pressable onPress={openPlanOverview} style={styles.currentPlanCard}>
          <View style={{ flex: 1 }}>
            <Text style={[text.overline, styles.currentPlanLabel]}>SEU PLANO ATUAL</Text>
            <Text style={styles.currentPlanTitle}>{currentPlan.title}</Text>
            <Text style={text.muted}>
              {currentPlan.durationWeeks} semana{currentPlan.durationWeeks > 1 ? "s" : ""}
              {currentPlan.madeByCoach && currentPlan.coachName ? ` · ${currentPlan.coachName}` : ""}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}

      <View style={styles.monthHeader}>
        <Pressable onPress={() => setMonthOffset((m) => m - 1)} style={styles.monthNavBtn}>
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setMonthOffset(0)}>
          <Text style={styles.monthLabel}>
            {MONTHS[month]} {year}
          </Text>
        </Pressable>
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
          const d = byDate.get(iso);
          const isToday = iso === today;
          return (
            <Pressable
              key={i}
              onPress={() => navigate({ name: "day", date: iso })}
              style={[styles.cell, isToday && styles.cellToday]}
            >
              <Text style={[styles.cellText, isToday && styles.cellTextToday]}>
                {date.getDate()}
              </Text>
              <DayDots day={d} hasRace={raceDates.has(iso)} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[text.overline, styles.label]}>TREINOS DO MÊS</Text>
      {monthDays.map((d) => (
        <DayRow
          key={d.id}
          day={d}
          onPress={() => navigate({ name: "day", date: d.date.slice(0, 10) })}
        />
      ))}
      {monthDays.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhum treino neste mês.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  titleActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    backgroundColor: color.surface2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnText: { fontFamily: font.medium, fontSize: 11, color: color.textSecondary },
  coachCard: {
    marginTop: 14,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  coachLabel: { marginBottom: 8 },
  currentPlanCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  currentPlanLabel: { marginBottom: 4 },
  currentPlanTitle: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary, marginBottom: 2 },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    backgroundColor: color.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: color.textPrimary,
    marginBottom: 10,
  },
  inviteFormRow: { flexDirection: "row", gap: 8 },
  inviteErrorText: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginBottom: 8 },
  acceptBtn: {
    backgroundColor: color.orange500,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.ink },
  acceptBtnWide: { flex: 1, alignItems: "center" },
  declineBtn: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: border.strong,
  },
  declineBtnText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  cancelBtnText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  hireBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    borderWidth: 1,
    borderColor: color.orange500,
  },
  hireBtnText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  monthNavBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  monthNavText: { fontFamily: font.semibold, fontSize: 20, color: color.textSecondary },
  monthLabel: { fontFamily: font.semibold, fontSize: 15, color: color.textPrimary, minWidth: 140, textAlign: "center" },
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
    gap: 2,
  },
  cellToday: {
    backgroundColor: color.orangeDim,
    borderRadius: 10,
  },
  cellText: { fontFamily: font.regular, fontSize: 13, color: color.textSecondary },
  cellTextToday: { fontFamily: font.semibold, color: color.orange400 },
  label: { marginTop: 18, marginBottom: 8 },
});
