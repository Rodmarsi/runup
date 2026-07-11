import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color } from "@runup/ui/tokens";
import { text, font, gradients } from "../theme.js";
import { useNav } from "../nav.js";

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

/** Cronômetro ao vivo do treino — abre ao "Iniciar treino", termina no check-in. */
export function LiveWorkoutScreen({ dayId, title }: { dayId: string; title: string }) {
  const { navigate, goHome } = useNav();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  function finish() {
    navigate({ name: "checkin", dayId, initialDurationSeconds: seconds });
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Sair</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={[text.overline, styles.overline]}>EM ANDAMENTO</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.timer}>{formatElapsed(seconds)}</Text>

        <Pressable onPress={() => setRunning((r) => !r)} style={styles.pauseBtn}>
          <Text style={styles.pauseBtnText}>{running ? "Pausar" : "Retomar"}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={finish} style={styles.cta}>
          <LinearGradient
            colors={gradients.brasa}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Concluir treino</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0, padding: 16 },
  back: { marginBottom: 8 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overline: { color: color.orange400, marginBottom: 10 },
  title: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: color.textPrimary,
    marginBottom: 24,
    textAlign: "center",
  },
  timer: {
    fontFamily: font.bold,
    fontSize: 56,
    color: color.textPrimary,
    fontVariant: ["tabular-nums"],
    marginBottom: 28,
  },
  pauseBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.textFaint,
  },
  pauseBtnText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  footer: { paddingBottom: 8 },
  cta: { borderRadius: 99, overflow: "hidden" },
  ctaGradient: { paddingVertical: 14, alignItems: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
});
