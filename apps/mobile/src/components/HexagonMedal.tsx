import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { color } from "@runup/ui/tokens";
import { font } from "../theme.js";

const SIZE = 86;
const POINTS = [
  [SIZE / 2, 0],
  [SIZE, SIZE * 0.25],
  [SIZE, SIZE * 0.75],
  [SIZE / 2, SIZE],
  [0, SIZE * 0.75],
  [0, SIZE * 0.25],
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");

/** Medalha hexagonal — preenchida (conquistada) ou apenas contorno (ainda não). */
export function HexagonMedal({
  label,
  value,
  achieved,
}: {
  label: string;
  value: string | null;
  achieved: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Polygon
          points={POINTS}
          fill={achieved ? color.orange500 : "transparent"}
          stroke={achieved ? color.orange500 : color.surface4}
          strokeWidth={2}
        />
      </Svg>
      <View style={styles.overlay}>
        <Text style={[styles.label, achieved && styles.labelAchieved]}>{label}</Text>
        {value && <Text style={[styles.value, achieved && styles.valueAchieved]}>{value}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", alignItems: "center" },
  label: { fontFamily: font.semibold, fontSize: 11, color: color.textMuted },
  labelAchieved: { color: color.ink },
  value: { fontFamily: font.bold, fontSize: 12, color: color.textFaint, marginTop: 2 },
  valueAchieved: { color: color.ink },
});
