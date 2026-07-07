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
import { NavProvider, useNav } from "./src/nav.js";
import { LoginScreen } from "./src/screens/LoginScreen.js";
import { MainTabs } from "./src/screens/MainTabs.js";
import { DayDetailScreen } from "./src/screens/DayDetailScreen.js";
import { CheckinScreen } from "./src/screens/CheckinScreen.js";
import { GoalScreen } from "./src/screens/GoalScreen.js";
import { ChatScreen } from "./src/screens/ChatScreen.js";

function Router() {
  const { route } = useNav();
  switch (route.name) {
    case "day":
      return <DayDetailScreen dayId={route.dayId} />;
    case "checkin":
      return <CheckinScreen dayId={route.dayId} />;
    case "goal":
      return <GoalScreen goalId={route.goalId} />;
    case "chat":
      return <ChatScreen linkId={route.linkId} withName={route.withName} />;
    default:
      return <MainTabs />;
  }
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.orange500} />
      </View>
    );
  }
  if (!user) return <LoginScreen />;
  return (
    <NavProvider>
      <Router />
    </NavProvider>
  );
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
