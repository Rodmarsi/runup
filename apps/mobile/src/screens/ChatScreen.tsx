import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import type { MessageDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { useNav } from "../nav.js";

export function ChatScreen({
  linkId,
  withName,
}: {
  linkId: string;
  withName: string;
}) {
  const { user } = useAuth();
  const { goHome } = useNav();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setMessages(await api.messages(linkId));
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [linkId]);

  async function send() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await api.sendMessage(linkId, t);
    await load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goHome}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={text.cardTitle}>{withName}</Text>
        <View style={{ width: 16 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.orange500} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <View
                key={m.id}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                <Text style={mine ? styles.mineText : styles.theirsText}>{m.text}</Text>
              </View>
            );
          })}
          {messages.length === 0 && (
            <Text style={[text.muted, styles.empty]}>Nenhuma mensagem ainda.</Text>
          )}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mensagem…"
          placeholderTextColor={color.textMuted}
          value={draft}
          onChangeText={setDraft}
        />
        <Pressable onPress={send} style={styles.sendBtn}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface0 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: border.hairline,
  },
  backText: { fontFamily: font.regular, fontSize: 22, color: color.textSecondary },
  scroll: { padding: 16, gap: 8 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10, marginBottom: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: color.orange500 },
  theirs: { alignSelf: "flex-start", backgroundColor: color.surface3 },
  mineText: { fontFamily: font.regular, fontSize: 13, color: color.ink },
  theirsText: { fontFamily: font.regular, fontSize: 13, color: color.textPrimary },
  empty: { textAlign: "center", marginTop: 24 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: border.hairline,
  },
  input: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.hairline,
    color: color.textPrimary,
    fontFamily: font.regular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    backgroundColor: color.orange500,
    borderRadius: 99,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendText: { fontFamily: font.semibold, fontSize: 13, color: color.ink },
});
