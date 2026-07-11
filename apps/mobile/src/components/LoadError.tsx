import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { text, font } from "../theme.js";

/** Estado de erro ao carregar dados de uma tela, com botão de tentar de novo. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={text.secondary}>Não foi possível carregar. Verifique sua conexão.</Text>
      <Pressable onPress={onRetry} style={styles.btn}>
        <Text style={styles.btnText}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 16,
    alignItems: "flex-start",
    gap: 10,
  },
  btn: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnText: { fontFamily: font.semibold, fontSize: 12, color: color.orange400 },
});
