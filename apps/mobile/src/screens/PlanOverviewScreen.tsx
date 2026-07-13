import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import type { BlockKind } from "@runup/types";
import { text, font, gradients } from "../theme.js";
import { useNav, type PlanOverviewData } from "../nav.js";

const KIND_LABEL: Record<string, string> = {
  running: "Corrida",
  strength: "Musculação",
  mobility: "Mobilidade",
  free: "Livre",
};

const ORIGIN_LABEL: Record<PlanOverviewData["origin"], string> = {
  ai: "Criado com IA",
  manual: "Criado por você",
  coach: "Feito pelo seu treinador",
};

function levelLabel(kinds: BlockKind[] | string[]): string {
  const distinct = new Set(kinds);
  if (distinct.size <= 1) return "Focado";
  return "Variado";
}

/** Resumo do plano — aparece logo após criar (IA/manual) e a qualquer momento pela aba Plano. */
export function PlanOverviewScreen({ data }: { data: PlanOverviewData }) {
  const { goHome } = useNav();
  const structureLabel = levelLabel(data.kindBreakdown.map((k) => k.kind));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={goHome} style={styles.back}>
          <Text style={styles.backText}>‹ Fechar</Text>
        </Pressable>

        <LinearGradient
          colors={gradients.brasaRadiante}
          start={{ x: 0.18, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroOverline}>SEU PLANO</Text>
          <Text style={styles.heroTitle}>{data.title}</Text>
          <View style={styles.originBadge}>
            <Text style={styles.originBadgeText}>
              {ORIGIN_LABEL[data.origin]}
              {data.origin === "coach" && data.coachName ? ` · ${data.coachName}` : ""}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.metaList}>
          <MetaRow icon="📅" label={`${data.durationWeeks} semana${data.durationWeeks > 1 ? "s" : ""}`} />
          <MetaRow
            icon="🏃"
            label={`Até ${data.workoutsPerWeek} treino${data.workoutsPerWeek > 1 ? "s" : ""} por semana`}
          />
          <MetaRow icon="📊" label={`${data.totalWorkouts} treinos no total`} />
          <MetaRow icon="🎯" label={`Estrutura: ${structureLabel}`} />
        </View>

        {data.kindBreakdown.length > 0 && (
          <>
            <Text style={[text.overline, styles.label]}>DISTRIBUIÇÃO</Text>
            <View style={styles.breakdownList}>
              {data.kindBreakdown.map((k) => (
                <View key={k.kind} style={styles.breakdownRow}>
                  <Text style={[text.body, { flex: 1 }]}>{KIND_LABEL[k.kind] ?? k.kind}</Text>
                  <Text style={styles.breakdownCount}>{k.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={goHome} style={styles.cta}>
          <Text style={styles.ctaText}>Ver no calendário</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={[text.body, { flex: 1 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 24 },
  back: { marginBottom: 8 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  hero: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  heroOverline: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  },
  heroTitle: { fontFamily: font.bold, fontSize: 22, color: "#fff" },
  originBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  originBadgeText: { fontFamily: font.semibold, fontSize: 12, color: "#fff" },
  metaList: { marginTop: 18, gap: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
  },
  metaIcon: { fontSize: 18 },
  label: { marginTop: 22, marginBottom: 8 },
  breakdownList: { gap: 6 },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  breakdownCount: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
  footer: { padding: 16 },
  cta: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: color.orange500,
  },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
});
