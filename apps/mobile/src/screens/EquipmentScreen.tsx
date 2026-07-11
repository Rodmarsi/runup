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
import { LoadError } from "../components/LoadError.js";

export function EquipmentScreen() {
  const { goHome } = useNav();
  const [shoes, setShoes] = useState<ShoeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
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
        alertKm: alertKm ? Number(alertKm) : undefined,
      });
      setName("");
      setBrand("");
      setAlertKm("600");
      setAdding(false);
      load();
    } catch {
      Alert.alert("Não foi possível adicionar o tênis.");
    } finally {
      setSaving(false);
    }
  }

  async function retire(shoe: ShoeDto) {
    await api.updateShoe(shoe.id, { retired: !shoe.retiredAt });
    load();
  }

  function remove(shoe: ShoeDto) {
    Alert.alert("Remover tênis?", shoe.name, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await api.deleteShoe(shoe.id);
          load();
        },
      },
    ]);
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
      <Text style={text.screenTitle}>Equipamentos</Text>

      {shoes.map((shoe) => {
        const alertHit = shoe.alertKm !== null && shoe.totalKm >= shoe.alertKm;
        return (
          <View key={shoe.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shoeName}>
                {shoe.name}
                {shoe.retiredAt ? " · aposentado" : ""}
              </Text>
              <Text style={text.muted}>
                {shoe.brand ? `${shoe.brand} · ` : ""}
                {shoe.totalKm.toFixed(0)} km
                {shoe.alertKm ? ` de ${shoe.alertKm} km` : ""}
              </Text>
              {alertHit && !shoe.retiredAt && (
                <Text style={styles.alertText}>Hora de trocar — vida útil atingida.</Text>
              )}
            </View>
            <Pressable onPress={() => retire(shoe)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>
                {shoe.retiredAt ? "Reativar" : "Aposentar"}
              </Text>
            </Pressable>
            <Pressable onPress={() => remove(shoe)} style={styles.smallBtn}>
              <Text style={[styles.smallBtnText, styles.removeText]}>Remover</Text>
            </Pressable>
          </View>
        );
      })}

      {shoes.length === 0 && (
        <Text style={[text.secondary, styles.label]}>Nenhum tênis cadastrado ainda.</Text>
      )}

      {adding ? (
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome (ex.: Pegasus 40)"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="Marca (opcional)"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            style={styles.input}
            value={alertKm}
            onChangeText={setAlertKm}
            keyboardType="numeric"
            placeholder="Avisar em quantos km"
            placeholderTextColor={color.textFaint}
          />
          <View style={styles.addRow}>
            <Pressable onPress={() => setAdding(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={addShoe} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saving ? "..." : "Adicionar"}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Adicionar tênis</Text>
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
  shoeName: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary },
  alertText: { fontFamily: font.medium, fontSize: 11, color: color.orange400, marginTop: 4 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { fontFamily: font.medium, fontSize: 11, color: color.textSecondary },
  removeText: { color: color.danger },
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
