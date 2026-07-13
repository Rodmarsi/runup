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
import type { ShoeDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { shoeProgressPct } from "../format.js";
import { LoadError } from "../components/LoadError.js";

export function EquipmentScreen() {
  const { goHome, navigate } = useNav();
  const [shoes, setShoes] = useState<ShoeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [shoeColor, setShoeColor] = useState("");
  const [alertKm, setAlertKm] = useState("600");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api
      .shoes()
      .then(setShoes)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addShoe() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createShoe({
        name: name.trim(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: shoeColor.trim() || undefined,
        alertKm: alertKm ? Number(alertKm) : undefined,
      });
      setName("");
      setBrand("");
      setModel("");
      setShoeColor("");
      setAlertKm("600");
      setAdding(false);
      load();
    } catch {
      Alert.alert("Não foi possível adicionar o tênis.");
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
      <View style={styles.titleRow}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>
        <Pressable onPress={() => setAdding((v) => !v)}>
          <Text style={styles.addLink}>{adding ? "fechar" : "Adicionar"}</Text>
        </Pressable>
      </View>
      <Text style={text.screenTitle}>Meus tênis</Text>

      {adding && (
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome (ex.: Speedzone)"
            placeholderTextColor={color.textFaint}
          />
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={brand}
              onChangeText={setBrand}
              placeholder="Marca"
              placeholderTextColor={color.textFaint}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={model}
              onChangeText={setModel}
              placeholder="Modelo"
              placeholderTextColor={color.textFaint}
            />
          </View>
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={shoeColor}
              onChangeText={setShoeColor}
              placeholder="Cor"
              placeholderTextColor={color.textFaint}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={alertKm}
              onChangeText={setAlertKm}
              keyboardType="numeric"
              placeholder="Avisar em quantos km"
              placeholderTextColor={color.textFaint}
            />
          </View>
          <Pressable onPress={addShoe} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{saving ? "..." : "Adicionar tênis"}</Text>
          </Pressable>
        </View>
      )}

      {shoes.map((shoe) => {
        const pct = shoeProgressPct(shoe);
        const meta = [shoe.brand, shoe.model, shoe.color].filter(Boolean).join(" • ");
        return (
          <Pressable
            key={shoe.id}
            onPress={() => navigate({ name: "shoeDetail", shoe })}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shoeName}>{shoe.name}</Text>
                {meta ? <Text style={text.muted}>{meta}</Text> : null}
              </View>
              <View style={[styles.statusPill, shoe.retiredAt && styles.statusPillRetired]}>
                <Text style={[styles.statusText, shoe.retiredAt && styles.statusTextRetired]}>
                  {shoe.retiredAt ? "Aposentado" : "Ativo"}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>

            {shoe.alertKm ? (
              <>
                <Text style={styles.kmLabel}>
                  {shoe.totalKm.toFixed(0)}/{shoe.alertKm} km
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct ?? 0}%` }, pct === 100 && styles.fillMax]} />
                </View>
              </>
            ) : (
              <Text style={styles.kmLabel}>{shoe.totalKm.toFixed(0)} km</Text>
            )}
          </Pressable>
        );
      })}

      {shoes.length === 0 && !adding && (
        <Text style={[text.secondary, styles.label]}>Nenhum tênis cadastrado ainda.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { marginBottom: 0 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  addLink: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  label: { marginTop: 18 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginTop: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  shoeName: { fontFamily: font.semibold, fontSize: 15, color: color.textPrimary },
  statusPill: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillRetired: { backgroundColor: color.surface3 },
  statusText: { fontFamily: font.semibold, fontSize: 10, color: color.orange400 },
  statusTextRetired: { color: color.textMuted },
  chevron: { fontFamily: font.regular, fontSize: 18, color: color.textFaint },
  kmLabel: { fontFamily: font.semibold, fontSize: 13, color: color.textSecondary, marginBottom: 6 },
  track: { height: 6, borderRadius: 99, backgroundColor: color.surface4, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  fillMax: { backgroundColor: color.danger },
  addCard: {
    marginTop: 16,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    gap: 10,
  },
  row2: { flexDirection: "row", gap: 10 },
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
  saveBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  saveBtnText: { fontFamily: font.semibold, fontSize: 13, color: color.ink },
});
