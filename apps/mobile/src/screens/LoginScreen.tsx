import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { useAuth } from "../auth.js";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Não foi possível entrar",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        Run<Text style={{ color: color.orange500 }}>Up</Text>
      </Text>
      <Text style={[text.secondary, styles.subtitle]}>
        Treinos planejados. Evolução real.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={color.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={color.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={onSubmit} disabled={busy} style={styles.cta}>
        <LinearGradient
          colors={gradients.brasa}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Entrar</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surface0,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: { fontFamily: font.bold, fontSize: 34, color: color.textPrimary },
  subtitle: { marginTop: 4, marginBottom: 28 },
  input: {
    backgroundColor: color.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.hairline,
    color: color.textPrimary,
    fontFamily: font.regular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  error: { fontFamily: font.regular, fontSize: 12, color: color.danger, marginBottom: 12 },
  cta: { marginTop: 8, borderRadius: 99, overflow: "hidden" },
  ctaGradient: { paddingVertical: 14, alignItems: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
});
