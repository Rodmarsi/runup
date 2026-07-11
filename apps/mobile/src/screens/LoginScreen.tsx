import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, border } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import { text, font, gradients } from "../theme.js";
import { useAuth } from "../auth.js";

export function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : mode === "login"
            ? "Não foi possível entrar"
            : "Não foi possível criar a conta",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch {
      setError("Não foi possível entrar com o Google");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.surface0 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>
          Run<Text style={{ color: color.orange500 }}>Up</Text>
        </Text>
        <Text style={[text.secondary, styles.subtitle]}>
          Treinos planejados. Evolução real.
        </Text>

        {mode === "register" && (
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor={color.textMuted}
            value={name}
            onChangeText={setName}
          />
        )}
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
              <Text style={styles.ctaText}>
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => {
            setError(null);
            setMode(mode === "login" ? "register" : "login");
          }}
          style={styles.switchMode}
        >
          <Text style={text.secondary}>
            {mode === "login"
              ? "Não tem conta? Criar uma"
              : "Já tem conta? Entrar"}
          </Text>
        </Pressable>

        <Text style={styles.divider}>ou</Text>

        <Pressable onPress={onGoogle} disabled={busy} style={styles.google}>
          <Text style={styles.googleText}>Entrar com Google</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
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
  switchMode: { marginTop: 16, alignItems: "center" },
  divider: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.textMuted,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  google: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: border.strong,
    paddingVertical: 13,
    alignItems: "center",
  },
  googleText: { fontFamily: font.semibold, fontSize: 14, color: color.textPrimary },
});
