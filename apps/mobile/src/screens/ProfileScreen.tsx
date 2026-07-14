import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import type {
  Stats,
  PersonalRecordDto,
  GoalDto,
  StravaStatus,
  ConversationDto,
  GamificationSnapshot,
} from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { useAuth } from "../auth.js";
import { useSettings } from "../settings.js";
import { duration, distance, unitLabel, localIsoDate, isoToBr, daysLabel } from "../format.js";
import { LoadError } from "../components/LoadError.js";
import { DateField } from "../components/DateField.js";

const RACE_LABEL: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "15k": "15 km",
  "21k": "21 km",
  "42k": "42 km",
  other: "Prova",
};

const STANDARD_RECORD_CATEGORIES = ["5k", "10k", "15k", "21k", "42k"];

/** "1:32:45" ou "23:10" → segundos. */
function parseTimeInput(input: string): number | undefined {
  const parts = input.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return parts[0]! * 60 + parts[1]!;
}

const ACHIEVEMENT_LABEL: Record<string, string> = {
  first_5k: "Primeiro 5 km",
  first_10k: "Primeiro 10 km",
  first_half: "Primeira Meia",
  first_marathon: "Primeira Maratona",
  "100km_total": "100 km acumulados",
  "500km_total": "500 km acumulados",
};

const MISSION_LABEL: Record<string, string> = {
  run_3x_week: "Treinar 3x essa semana",
  log_today: "Registrar um treino hoje",
};

const XP_PER_LEVEL = 100;

export function ProfileScreen() {
  const { user, logout, updateName, updateAvatar } = useAuth();
  const { navigate } = useNav();
  const { units } = useSettings();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [prs, setPrs] = useState<PersonalRecordDto[]>([]);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [strava, setStrava] = useState<StravaStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [gamification, setGamification] = useState<GamificationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [addingPr, setAddingPr] = useState(false);
  const [prCategory, setPrCategory] = useState<string>("5k");
  const [prCustom, setPrCustom] = useState(false);
  const [prCustomLabel, setPrCustomLabel] = useState("");
  const [prDate, setPrDate] = useState(localIsoDate());
  const [prTimeText, setPrTimeText] = useState("");
  const [savingPr, setSavingPr] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);

  async function load() {
    const [s, p, g, st, conv, gam] = await Promise.all([
      api.stats(),
      api.personalRecords(),
      api.goals(),
      api.stravaStatus(),
      api.conversations(),
      api.gamification(),
    ]);
    setStats(s);
    setPrs(p);
    setGoals(g);
    setStrava(st);
    setConversations(conv);
    setGamification(gam);
  }

  function initialLoad() {
    setLoading(true);
    setError(false);
    load()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(initialLoad, []);

  async function sync() {
    setSyncing(true);
    try {
      await api.stravaSync();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function connectStrava() {
    setConnectingStrava(true);
    setStravaError(null);
    try {
      const { url } = await api.stravaAuthorizeUrl();
      await WebBrowser.openBrowserAsync(url);
      // O aluno aprova no navegador e volta manualmente ao app (a página do
      // Strava já orienta isso); atualizamos o status ao voltar.
      await load();
    } catch (e) {
      setStravaError(
        e instanceof ApiError ? e.message : "Não foi possível abrir o Strava",
      );
    } finally {
      setConnectingStrava(false);
    }
  }

  async function savePr() {
    const distanceKey = prCustom ? prCustomLabel.trim() : prCategory;
    const timeSeconds = parseTimeInput(prTimeText);
    if (!distanceKey) {
      setPrError("Dá um nome pra categoria.");
      return;
    }
    if (!timeSeconds) {
      setPrError("Tempo inválido — use mm:ss ou hh:mm:ss.");
      return;
    }
    setPrError(null);
    setSavingPr(true);
    try {
      const pr = await api.addPersonalRecord({
        distance: distanceKey,
        timeSeconds,
        achievedAt: prDate,
      });
      setPrs((prev) => [pr, ...prev.filter((p) => p.distance !== pr.distance)]);
      setAddingPr(false);
      setPrCustom(false);
      setPrCustomLabel("");
      setPrTimeText("");
    } catch (e) {
      setPrError(e instanceof ApiError ? e.message : "Não foi possível salvar o recorde");
    } finally {
      setSavingPr(false);
    }
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateName(nameInput.trim());
      setEditingName(false);
    } catch {
      Alert.alert("Não foi possível atualizar o nome. Tente de novo.");
    } finally {
      setSavingName(false);
    }
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Sem permissão pra acessar suas fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setSavingAvatar(true);
    try {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      await updateAvatar(`data:${mime};base64,${result.assets[0].base64}`);
    } catch {
      Alert.alert("Não foi possível atualizar a foto. Tente de novo.");
    } finally {
      setSavingAvatar(false);
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
        <LoadError onRetry={initialLoad} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        <Pressable onPress={pickAvatar} disabled={savingAvatar} style={styles.avatar}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {user?.name.charAt(0).toUpperCase() ?? "?"}
            </Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>{savingAvatar ? "…" : "✎"}</Text>
          </View>
        </Pressable>
        <Text style={styles.name}>{user?.name ?? ""}</Text>
        <Text style={text.muted}>{user?.email ?? ""}</Text>
      </View>

      {/* Nível */}
      {gamification && (
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Nível {gamification.level}</Text>
            <Text style={text.muted}>{gamification.xp} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View
              style={[styles.xpFill, { width: `${gamification.xp % XP_PER_LEVEL}%` }]}
            />
          </View>
        </View>
      )}

      {/* Estatísticas */}
      <View style={styles.statGrid}>
        <Stat label="Distância total" value={`${distance(stats?.totalDistanceMeters ?? 0, units)} ${unitLabel(units)}`} />
        <Stat label="Tempo total" value={duration(stats?.totalTimeSeconds ?? 0)} />
        <Stat label="Treinos" value={String(stats?.workoutCount ?? 0)} />
        <Stat label="Sequência" value={daysLabel(stats?.streakDays ?? 0)} />
      </View>

      {/* Missões */}
      {gamification && gamification.missions.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>MISSÕES</Text>
          {gamification.missions.map((m) => (
            <View key={`${m.code}-${m.period}`} style={styles.missionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{MISSION_LABEL[m.code] ?? m.code}</Text>
                <View style={styles.missionTrack}>
                  <View
                    style={[
                      styles.missionFill,
                      { width: `${Math.min(100, (m.progress / m.target) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.missionProgress}>
                {m.completedAt ? "✓" : `${m.progress}/${m.target}`}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Conquistas */}
      {gamification && gamification.achievements.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>CONQUISTAS</Text>
          <View style={styles.prGrid}>
            {gamification.achievements.map((code) => (
              <View key={code} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>🏅</Text>
                <Text style={styles.achievementLabel}>{ACHIEVEMENT_LABEL[code] ?? code}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Treinador / chat */}
      {conversations.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>SEU TREINADOR</Text>
          {conversations.map((c) => (
            <Pressable
              key={c.linkId}
              onPress={() =>
                navigate({ name: "chat", linkId: c.linkId, withName: c.with.name })
              }
              style={styles.rowCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.with.name}</Text>
                <Text style={text.muted}>
                  {c.lastMessage?.text.slice(0, 40) ?? "Abrir conversa"}
                </Text>
              </View>
              {c.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{c.unread}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}

      {/* Meta */}
      {goals.length > 0 && (
        <>
          <Text style={[text.overline, styles.label]}>SUA META</Text>
          {goals.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => navigate({ name: "goal", goalId: g.id })}
              style={styles.rowCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {g.raceName ?? RACE_LABEL[g.targetRace]}
                </Text>
                <Text style={text.muted}>{isoToBr(g.raceDate.slice(0, 10))}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}

      {/* Recordes */}
      <Text style={[text.overline, styles.label]}>RECORDES PESSOAIS</Text>
      {prs.length === 0 ? (
        <Text style={text.muted}>Nenhum recorde ainda.</Text>
      ) : (
        <View style={styles.prGrid}>
          {prs.map((pr) => (
            <View key={pr.id} style={styles.prCard}>
              <Text style={text.muted}>{RACE_LABEL[pr.distance] ?? pr.distance}</Text>
              <Text style={styles.prTime}>{duration(pr.timeSeconds)}</Text>
              <Text style={styles.prDate}>{isoToBr(pr.achievedAt.slice(0, 10))}</Text>
            </View>
          ))}
        </View>
      )}

      {addingPr ? (
        <View style={styles.prForm}>
          <View style={styles.chips}>
            {STANDARD_RECORD_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setPrCategory(c);
                  setPrCustom(false);
                }}
                style={[styles.chip, !prCustom && prCategory === c && styles.chipActive]}
              >
                <Text style={!prCustom && prCategory === c ? styles.chipTextActive : styles.chipText}>
                  {RACE_LABEL[c]}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPrCustom(true)}
              style={[styles.chip, prCustom && styles.chipActive]}
            >
              <Text style={prCustom ? styles.chipTextActive : styles.chipText}>+ Outra</Text>
            </Pressable>
          </View>

          {prCustom && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={prCustomLabel}
              onChangeText={setPrCustomLabel}
              placeholder="Nome da categoria (ex.: 8km)"
              placeholderTextColor={color.textFaint}
            />
          )}

          <View style={{ marginTop: 10 }}>
            <DateField value={prDate} onChange={setPrDate} maximumDate={new Date()} />
          </View>

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={prTimeText}
            onChangeText={setPrTimeText}
            placeholder="Tempo (mm:ss ou hh:mm:ss)"
            placeholderTextColor={color.textFaint}
            keyboardType="numbers-and-punctuation"
          />

          {prError && <Text style={styles.prErrorText}>{prError}</Text>}

          <View style={styles.prFormRow}>
            <Pressable onPress={() => setAddingPr(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={savePr}
              disabled={savingPr}
              style={[styles.acceptBtn, { flex: 1, alignItems: "center" }]}
            >
              <Text style={styles.acceptBtnText}>{savingPr ? "..." : "Salvar recorde"}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAddingPr(true)} style={styles.addPrBtn}>
          <Text style={styles.addPrBtnText}>+ Adicionar recorde</Text>
        </Pressable>
      )}

      {/* Dispositivos conectados */}
      <Text style={[text.overline, styles.label]}>DISPOSITIVOS CONECTADOS</Text>
      <View style={styles.rowCard}>
        <Text style={[text.body, { flex: 1 }]}>
          Strava{strava?.connected ? " · conectado" : " · não conectado"}
        </Text>
        {strava?.connected ? (
          <Pressable onPress={sync} disabled={syncing} style={styles.syncBtn}>
            <Text style={styles.syncText}>{syncing ? "..." : "Sincronizar"}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={connectStrava}
            disabled={connectingStrava}
            style={styles.syncBtn}
          >
            <Text style={styles.syncText}>
              {connectingStrava ? "..." : "Conectar"}
            </Text>
          </Pressable>
        )}
      </View>
      {stravaError && <Text style={styles.error}>{stravaError}</Text>}

      <Text style={[text.overline, styles.label]}>CONTA</Text>
      <View style={styles.card}>
        {editingName ? (
          <View style={[styles.row, styles.editRow]}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              placeholder="Seu nome"
              placeholderTextColor={color.textFaint}
            />
            <Pressable onPress={saveName} disabled={savingName} style={styles.editBtn}>
              <Text style={styles.editBtnText}>{savingName ? "..." : "Salvar"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setNameInput(user?.name ?? "");
                setEditingName(false);
              }}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnTextMuted}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setNameInput(user?.name ?? "");
              setEditingName(true);
            }}
            style={styles.row}
          >
            <Text style={text.muted}>Nome</Text>
            <Text style={styles.rowValue}>{user?.name} · editar</Text>
          </Pressable>
        )}
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={text.muted}>E-mail</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={text.muted}>Perfil</Text>
          <Text style={styles.rowValue}>Aluno</Text>
        </View>
      </View>

      <Text style={[text.overline, styles.label]}>MAIS</Text>
      <Pressable onPress={() => navigate({ name: "races" })} style={styles.rowCard}>
        <Text style={[styles.rowTitle, { flex: 1 }]}>Provas</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable onPress={() => navigate({ name: "bodyInfo" })} style={styles.rowCard}>
        <Text style={[styles.rowTitle, { flex: 1 }]}>Informações</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable onPress={() => navigate({ name: "equipment" })} style={styles.rowCard}>
        <Text style={[styles.rowTitle, { flex: 1 }]}>Equipamentos</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable onPress={() => navigate({ name: "settings" })} style={styles.rowCard}>
        <Text style={[styles.rowTitle, { flex: 1 }]}>Configurações</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={text.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: "center", marginTop: 8, marginBottom: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "visible",
  },
  avatarImage: { width: 72, height: 72, borderRadius: 99 },
  avatarText: { fontFamily: font.bold, fontSize: 28, color: color.orange400 },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: color.orange500,
    borderWidth: 2,
    borderColor: color.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadgeText: { fontSize: 11, color: color.ink },
  name: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginBottom: 2 },
  label: { marginTop: 20, marginBottom: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statCard: {
    width: "48%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  statValue: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginTop: 6 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  prGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prCard: {
    width: "48%",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  prTime: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginTop: 4 },
  prDate: { fontFamily: font.regular, fontSize: 11, color: color.textFaint, marginTop: 2 },
  levelCard: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginBottom: 12,
  },
  levelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  levelLabel: { fontFamily: font.bold, fontSize: 15, color: color.textPrimary },
  xpTrack: { height: 6, borderRadius: 99, backgroundColor: color.surface4, overflow: "hidden" },
  xpFill: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
    marginBottom: 8,
  },
  missionTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: color.surface4,
    overflow: "hidden",
    marginTop: 6,
  },
  missionFill: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  missionProgress: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  achievementCard: {
    width: "48%",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 12,
  },
  achievementIcon: { fontSize: 24, marginBottom: 4 },
  achievementLabel: { fontFamily: font.medium, fontSize: 11, color: color.textSecondary, textAlign: "center" },
  syncBtn: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncText: { fontFamily: font.semibold, fontSize: 11, color: color.orange400 },
  badge: {
    backgroundColor: color.orange500,
    borderRadius: 99,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: 6,
  },
  badgeText: { fontFamily: font.semibold, fontSize: 10, color: color.ink },
  error: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginTop: 8 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: border.hairline },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: color.textPrimary },
  editRow: { alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    color: color.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
    paddingVertical: 4,
  },
  editBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  editBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  editBtnTextMuted: { fontFamily: font.medium, fontSize: 12, color: color.textFaint },
  logout: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  logoutText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  addPrBtn: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    borderWidth: 1,
    borderColor: color.orange500,
  },
  addPrBtnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  prForm: {
    marginTop: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: color.surface1,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  chipActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  chipText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  chipTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  input: {
    backgroundColor: color.surface1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.hairline,
    color: color.textPrimary,
    fontFamily: font.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prErrorText: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginTop: 8 },
  prFormRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  cancelBtnText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  acceptBtn: {
    backgroundColor: color.orange500,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  acceptBtnText: { fontFamily: font.semibold, fontSize: 13, color: color.ink },
});
