import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { color } from "@runup/ui/tokens";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        Run<Text style={styles.accent}>Up</Text>
      </Text>
      <Text style={styles.subtitle}>M0 no ar.</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    color: color.textPrimary,
  },
  accent: {
    color: color.orange500,
  },
  subtitle: {
    marginTop: 8,
    color: color.textSecondary,
  },
});
