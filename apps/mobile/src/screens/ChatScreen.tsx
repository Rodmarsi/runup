import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { color, border } from "@runup/ui/tokens";
import { ApiError, type MessageDto } from "@runup/api-client";
import { text, font } from "../theme.js";
import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { useNav } from "../nav.js";
import { LoadError } from "../components/LoadError.js";

export function ChatScreen({
  linkId,
  withName,
}: {
  linkId: string;
  withName: string;
}) {
  const { user } = useAuth();
  const { goHome } = useNav();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function load() {
    setMessages(await api.messages(linkId));
  }

  function initialLoad() {
    setLoading(true);
    setError(false);
    load()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(initialLoad, [linkId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function send() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    setSendError(null);
    try {
      await api.sendMessage(linkId, t);
      await load();
    } catch (e) {
      setDraft(t);
      setSendError(e instanceof ApiError ? e.message : "Não foi possível enviar");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
      ) : error ? (
        <View style={[styles.center, styles.scroll]}>
          <LoadError onRetry={initialLoad} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
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

      {sendError && <Text style={styles.sendErrorText}>{sendError}</Text>}
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
    </KeyboardAvoidingView>
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
  sendErrorText: {
    fontFamily: font.regular,
    fontSize: 11,
    color: color.danger,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
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
