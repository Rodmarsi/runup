import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { ShoeDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { shoeProgressPct, duration } from "../format.js";

export function ShoeDetailScreen({ shoe }: { shoe: ShoeDto }) {
  const { goHome } = useNav();
  const [retiredAt, setRetiredAt] = useState(shoe.retiredAt);
  const [busy, setBusy] = useState(false);

  const pct = shoeProgressPct(shoe);
  const meta = [shoe.brand, shoe.model, shoe.color].filter(Boolean).join(" • ");

  async function toggleRetired() {
    setBusy(true);
    try {
      await api.updateShoe(shoe.id, { retired: !retiredAt });
      setRetiredAt(retiredAt ? null : new Date().toISOString());
    } catch {
      Alert.alert("Não foi possível atualizar o tênis.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert("Remover tênis?", shoe.name, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await api.deleteShoe(shoe.id);
          goHome();
        },
      },
    ]);
  }

  function openMenu() {
    Alert.alert(shoe.name, undefined, [
      { text: retiredAt ? "Reativar" : "Aposentar", onPress: toggleRetired },
      { text: "Remover", style: "destructive", onPress: remove },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <Pressable onPress={goHome} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>
          <Pressable onPress={openMenu} disabled={busy} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>•••</Text>
          </Pressable>
        </View>

        <Text style={styles.shoeIcon}>👟</Text>

        {shoe.alertKm ? (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct ?? 0}%` }, pct === 100 && styles.fillMax]} />
            </View>
            <Text style={styles.kmValue}>
              {shoe.totalKm.toFixed(0)}/{shoe.alertKm} KM
            </Text>
          </>
        ) : (
          <Text style={styles.kmValue}>{shoe.totalKm.toFixed(0)} KM</Text>
        )}

        <Text style={styles.shoeName}>{shoe.name}</Text>
        {meta ? <Text style={[text.secondary, styles.meta]}>{meta}</Text> : null}

        <View style={[styles.statusPill, retiredAt && styles.statusPillRetired]}>
          <Text style={[styles.statusText, retiredAt && styles.statusTextRetired]}>
            {retiredAt ? "Aposentado" : "Ativo"}
          </Text>
        </View>

        <View style={styles.statGrid}>
          <Stat label="Corridas" value={String(shoe.runCount)} />
          <Stat label="Tempo" value={shoe.totalTimeSeconds > 0 ? duration(shoe.totalTimeSeconds) : "—"} />
          <Stat label="Desgaste" value={pct !== null ? `${pct}%` : "—"} />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCol}>
      <Text style={[text.overline, styles.statLabel]}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 32, alignItems: "center" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontFamily: font.semibold, fontSize: 16, color: color.textSecondary },
  shoeIcon: { fontSize: 96, marginTop: 24, marginBottom: 28 },
  track: {
    width: "100%",
    height: 6,
    borderRadius: 99,
    backgroundColor: color.surface4,
    overflow: "hidden",
    marginBottom: 14,
  },
  fill: { height: "100%", backgroundColor: color.orange500, borderRadius: 99 },
  fillMax: { backgroundColor: color.danger },
  kmValue: { fontFamily: font.bold, fontSize: 30, color: color.textPrimary, marginBottom: 12 },
  shoeName: { fontFamily: font.bold, fontSize: 20, color: color.textPrimary, textAlign: "center" },
  meta: { marginTop: 4, textAlign: "center" },
  statusPill: {
    marginTop: 12,
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusPillRetired: { backgroundColor: color.surface3 },
  statusText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
  statusTextRetired: { color: color.textMuted },
  statGrid: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 28,
    backgroundColor: color.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingVertical: 16,
  },
  statCol: { flex: 1, alignItems: "center" },
  statLabel: { marginBottom: 6 },
  statValue: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary },
});
