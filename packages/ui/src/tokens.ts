/**
 * Tokens do design system do RunUp.
 * Fonte da verdade: docs/design/design-system.md.
 * Dark premium + laranja #FF5500 (cor da logo). Regra do farol.
 */

export const color = {
  /** Laranja da marca (símbolo da logo). */
  orange500: "#FF5500",
  orange400: "#FF7A38",
  orange600: "#CC3F04",
  orangeGlow: "#FDE6D3",
  orangeDim: "#331A08",

  /** Escada de superfícies (modo escuro) — degraus ~4% de luminosidade. */
  surface0: "#121110",
  surface1: "#171514",
  surface2: "#1D1B19",
  surface3: "#242220",
  surface4: "#2B2825",

  /** Texto sobre escuro. */
  textPrimary: "#FFFFFF",
  textSecondary: "#A5A6A6",
  textMuted: "#8B8884",
  textFaint: "#6E6B67",

  /** Sobre claro / tinta. */
  ink: "#120E09",
  lightBg: "#F7F6F4",

  /** Semânticas. */
  success: "#4ADE80",
  danger: "#F87171",
} as const;

/** Bordas e luz (aresta superior iluminada = premium). */
export const border = {
  hairline: "rgba(255,255,255,0.07)",
  topLight: "rgba(255,255,255,0.13)",
  strong: "rgba(255,255,255,0.10)",
} as const;

/** Gradientes da marca e de componente (paradas de cor). */
export const gradient = {
  wordmark: ["#FDE6D3", "#CC3F04"],
  brasa: ["#FF7A38", "#FF5500", "#CC3F04"],
  asfalto: ["#120E09", "#1C1208", "#732F03", "#FF5500"],
  brasaRadiante: ["#FF8A47", "#FF5500", "#B83A00"],
  elevacao: ["#22201D", "#1B1917"],
  barraAcesa: ["#FF5500", "#FF8A47", "#FDE6D3"],
} as const;

export const radius = {
  chip: 6,
  input: 8,
  card: 12,
  cardHero: 16,
  pill: 99,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontFamily = "Poppins" as const;

export const fontWeight = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
