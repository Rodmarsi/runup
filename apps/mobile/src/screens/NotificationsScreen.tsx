import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { NotificationDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useNav } from "../nav.js";
import { LoadError } from "../components/LoadError.js";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationsScreen() {
  const { goHome } = useNav();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api
      .notifications()
      .then((data) => {
        setItems(data);
        return api.markNotificationsRead();
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <View style={styles.container}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>
      <Text style={[text.screenTitle, styles.title]}>Notificações</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.orange500} />
        </View>
      ) : error ? (
        <View style={styles.scroll}>
          <LoadError onRetry={load} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {items.map((n) => (
            <View key={n.id} style={[styles.row, !n.read && styles.rowUnread]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                <Text style={text.muted}>{n.body}</Text>
              </View>
              <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
            </View>
          ))}
          {items.length === 0 && (
            <Text style={[text.secondary, styles.empty]}>Nenhuma notificação ainda.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { padding: 16, paddingBottom: 0 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  title: { paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  scroll: { padding: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: 14,
    marginBottom: 8,
  },
  rowUnread: { borderColor: color.orange500 },
  rowTitle: { fontFamily: font.semibold, fontSize: 13, color: color.textPrimary, marginBottom: 2 },
  rowTime: { fontFamily: font.regular, fontSize: 11, color: color.textFaint },
  empty: { textAlign: "center", marginTop: 24 },
});
