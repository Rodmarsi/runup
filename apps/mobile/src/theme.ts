import { StyleSheet, type TextStyle } from "react-native";
import { color } from "@runup/ui/tokens";

/** Famílias Poppins (nomes usados após carregar via @expo-google-fonts/poppins). */
export const font = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
} as const;

/** Presets de texto do design system. */
export const text = StyleSheet.create({
  display: { fontFamily: font.bold, fontSize: 30, color: color.textPrimary } as TextStyle,
  screenTitle: { fontFamily: font.semibold, fontSize: 22, color: color.textPrimary } as TextStyle,
  cardTitle: { fontFamily: font.semibold, fontSize: 16, color: color.textPrimary } as TextStyle,
  body: { fontFamily: font.regular, fontSize: 14, color: color.textPrimary } as TextStyle,
  secondary: { fontFamily: font.regular, fontSize: 13, color: color.textSecondary } as TextStyle,
  muted: { fontFamily: font.regular, fontSize: 12, color: color.textMuted } as TextStyle,
  overline: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.textMuted,
    textTransform: "uppercase",
  } as TextStyle,
});

export const gradients = {
  brasaRadiante: ["#FF8A47", "#FF5500", "#B83A00"] as const,
  brasa: ["#FF7A38", "#FF5500", "#CC3F04"] as const,
};
