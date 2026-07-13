import { View, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { color } from "@runup/ui/tokens";
import { decodePolyline } from "../polyline.js";

const WIDTH = 343;
const HEIGHT = 180;
const PADDING = 14;

/**
 * Traçado da corrida a partir do encoded polyline do Strava — desenhado como
 * uma linha (sem tiles de mapa/chave de API), preservando a proporção real
 * do trajeto (correção de longitude por cosseno da latitude).
 */
export function RouteMap({ polyline }: { polyline: string }) {
  const points = decodePolyline(polyline);
  if (points.length < 2) return null;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const avgLat = (minLat + maxLat) / 2;
  const lngScale = Math.cos((avgLat * Math.PI) / 180) || 1;

  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLng = Math.max((maxLng - minLng) * lngScale, 1e-6);
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  const scale = Math.min(innerW / spanLng, innerH / spanLat);
  const offsetX = (innerW - spanLng * scale) / 2;
  const offsetY = (innerH - spanLat * scale) / 2;

  const svgPoints = points
    .map(([lat, lng]) => {
      const x = PADDING + offsetX + (lng - minLng) * lngScale * scale;
      const y = PADDING + offsetY + (maxLat - lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Polyline
          points={svgPoints}
          fill="none"
          stroke={color.orange500}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.surface3,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
});
