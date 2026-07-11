import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { text, font } from "../theme.js";
import { useAuth } from "../auth.js";
import { useNav } from "../nav.js";

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { goHome } = useNav();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Pressable onPress={goHome} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name ?? ""}</Text>
        <Text style={text.muted}>{user?.email ?? ""}</Text>
      </View>

      <Text style={[text.overline, styles.label]}>CONTA</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={text.muted}>Nome</Text>
          <Text style={styles.rowValue}>{user?.name}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={text.muted}>E-mail</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={text.muted}>Perfil</Text>
          <Text style={styles.rowValue}>Aluno</Text>
        </View>
      </View>

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  scroll: { padding: 16, paddingBottom: 32 },
  back: { marginBottom: 12 },
  backText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
  hero: { alignItems: "center", marginTop: 8, marginBottom: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 99,
    backgroundColor: color.orangeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontFamily: font.bold, fontSize: 28, color: color.orange400 },
  name: { fontFamily: font.bold, fontSize: 18, color: color.textPrimary, marginBottom: 2 },
  label: { marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: color.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: border.hairline },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: color.textPrimary },
  logout: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
  },
  logoutText: { fontFamily: font.medium, fontSize: 13, color: color.textSecondary },
});
