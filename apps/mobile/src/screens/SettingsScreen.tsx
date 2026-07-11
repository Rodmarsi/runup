import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { text, font } from "../theme.js";
import { useNav } from "../nav.js";
import { useSettings } from "../settings.js";
import type { Units } from "../format.js";

export function SettingsScreen() {
  const { goHome } = useNav();
  const { units, setUnits } = useSettings();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>
      <Text style={text.screenTitle}>Configurações</Text>

      <Text style={[text.overline, styles.label]}>UNIDADES</Text>
      <View style={styles.card}>
        <Text style={[text.body, { flex: 1 }]}>Distância e pace</Text>
        <View style={styles.segment}>
          {(["km", "mi"] as Units[]).map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnits(u)}
              style={[styles.segmentBtn, units === u && styles.segmentBtnActive]}
            >
              <Text style={units === u ? styles.segmentTextActive : styles.segmentText}>
                {u === "km" ? "Km" : "Milhas"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={[text.muted, styles.hint]}>
        Afeta os números de desempenho (estatísticas e resultado do treino). Os treinos
        prescritos pelo treinador continuam em km, como foram escritos.
      </Text>

      <Text style={[text.overline, styles.label]}>IDIOMA</Text>
      <View style={styles.card}>
        <Text style={[text.body, { flex: 1 }]}>Português (Brasil)</Text>
        <Text style={text.muted}>único disponível</Text>
      </View>

      <Text style={[text.overline, styles.label]}>TEMA</Text>
      <View style={styles.card}>
        <Text style={[text.body, { flex: 1 }]}>Escuro</Text>
        <Text style={text.muted}>identidade do app</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  label: { marginTop: 20, marginBottom: 8 },
  hint: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  segment: { flexDirection: "row", gap: 6 },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: color.surface1,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  segmentBtnActive: { backgroundColor: color.orangeDim, borderColor: color.orange500 },
  segmentText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  segmentTextActive: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
});
