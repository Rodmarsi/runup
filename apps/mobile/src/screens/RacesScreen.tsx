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
import { ApiError, type RaceDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { localIsoDate } from "../format.js";
import { LoadError } from "../components/LoadError.js";

function daysUntil(raceDate: string): number {
  const today = localIsoDate();
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = raceDate.slice(0, 10).split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function RacesScreen() {
  const { goHome, navigate } = useNav();
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distanceKm, setDistanceKm] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    api
      .races()
      .then(setRaces)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addRace() {
    if (!name.trim() || !raceDate) {
      Alert.alert("Preenche o nome e a data da prova.");
      return;
    }
    setSaving(true);
    try {
      await api.createRace({
        name: name.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        raceDate,
        distanceMeters: distanceKm
          ? Math.round(parseFloat(distanceKm.replace(",", ".")) * 1000)
          : undefined,
      });
      setName("");
      setCity("");
      setState("");
      setRaceDate("");
      setDistanceKm("");
      setAdding(false);
      load();
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível adicionar a prova");
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

  const sorted = [...races].sort((a, b) => a.raceDate.localeCompare(b.raceDate));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>
      <Text style={text.screenTitle}>Provas</Text>

      {sorted.map((race) => {
        const days = daysUntil(race.raceDate);
        return (
          <Pressable
            key={race.id}
            onPress={() => navigate({ name: "raceDetail", race })}
            style={styles.card}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.raceName}>{race.name}</Text>
              <Text style={text.muted}>
                {[race.city, race.state].filter(Boolean).join(" — ")}
                {race.city || race.state ? " · " : ""}
                {race.raceDate.slice(0, 10)}
              </Text>
            </View>
            <Text style={styles.countdown}>
              {days >= 0 ? `${days}d` : "concluída"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}

      {sorted.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhuma prova cadastrada ainda.</Text>
      )}

      {adding ? (
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome da prova"
            placeholderTextColor={color.textFaint}
          />
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={city}
              onChangeText={setCity}
              placeholder="Cidade"
              placeholderTextColor={color.textFaint}
            />
            <TextInput
              style={[styles.input, { width: 60 }]}
              value={state}
              onChangeText={setState}
              placeholder="UF"
              placeholderTextColor={color.textFaint}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
          <TextInput
            style={styles.input}
            value={raceDate}
            onChangeText={setRaceDate}
            placeholder="Data (AAAA-MM-DD)"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            style={styles.input}
            value={distanceKm}
            onChangeText={setDistanceKm}
            keyboardType="decimal-pad"
            placeholder="Distância (km)"
            placeholderTextColor={color.textFaint}
          />
          <View style={styles.addRow}>
            <Pressable onPress={() => setAdding(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={addRace} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saving ? "..." : "Adicionar"}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Adicionar prova</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  label: { marginTop: 18 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginTop: 14,
  },
  raceName: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary },
  countdown: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  addBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  addBtnText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  addCard: {
    marginTop: 20,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    gap: 10,
  },
  row2: { flexDirection: "row", gap: 8 },
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
  },
  addRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  cancelBtnText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  saveBtnText: { fontFamily: font.semibold, fontSize: 13, color: color.ink },
});
