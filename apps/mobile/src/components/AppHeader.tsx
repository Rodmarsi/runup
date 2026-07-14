import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { text, font } from "../theme.js";
import { useAuth } from "../auth.js";
import { greeting } from "../format.js";

/** Cabeçalho fixo (saudação + streak + notificações) — visível em todas as abas. */
export function AppHeader({
  streakDays,
  unreadCount,
  onOpenProfile,
  onOpenNotifications,
}: {
  streakDays: number;
  unreadCount: number;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
}) {
  const { user } = useAuth();

  return (
    <View style={styles.header}>
      <Pressable onPress={onOpenProfile} style={styles.headerLeft}>
        <View style={styles.avatar}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() ?? "?"}</Text>
          )}
        </View>
        <View>
          <Text style={text.muted}>{greeting()},</Text>
          <Text style={text.cardTitle}>{user?.name ?? ""}</Text>
        </View>
      </Pressable>
      <View style={styles.headerRight}>
        <Pressable onPress={onOpenNotifications} style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.streak}>
          <Text style={styles.streakText}>🔥 {streakDays}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 36, height: 36, borderRadius: 99 },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.orange400 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: { fontSize: 15 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: color.orange500,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: font.bold, fontSize: 9, color: color.ink },
  streak: {
    backgroundColor: color.orangeDim,
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  streakText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
});
