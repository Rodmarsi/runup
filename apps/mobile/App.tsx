import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { color } from "@runup/ui/tokens";
import { AuthProvider, useAuth } from "./src/auth.js";
import { LoginScreen } from "./src/screens/LoginScreen.js";
import { HomeScreen } from "./src/screens/HomeScreen.js";

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }
  return user ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Gate />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: color.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
});
