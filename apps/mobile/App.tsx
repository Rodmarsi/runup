import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
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
import { SettingsProvider } from "./src/settings.js";
import { LoginScreen } from "./src/screens/LoginScreen.js";
import { MainTabs } from "./src/screens/MainTabs.js";
import { CheckinScreen } from "./src/screens/CheckinScreen.js";
import { LogWorkoutScreen } from "./src/screens/LogWorkoutScreen.js";
import { GoalScreen } from "./src/screens/GoalScreen.js";
import { ChatScreen } from "./src/screens/ChatScreen.js";
import { CreateWorkoutScreen } from "./src/screens/CreateWorkoutScreen.js";
import { AiPlanWizardScreen } from "./src/screens/AiPlanWizardScreen.js";
import { PlanOverviewScreen } from "./src/screens/PlanOverviewScreen.js";

/**
 * Rotas "de fluxo" (ação focada, sem bottom nav). Tudo mais — dia, provas,
 * análises, informações, equipamentos, configurações, atividade — renderiza
 * DENTRO do MainTabs (ver Router abaixo), então a tab bar continua visível e
 * "voltar" retorna pra aba de onde a navegação partiu, não sempre pra Hoje.
 */
function Router() {
  const { route } = useNav();
  switch (route.name) {
    case "checkin":
      return <CheckinScreen dayId={route.dayId} />;
    case "logWorkout":
      return <LogWorkoutScreen />;
    case "goal":
      return <GoalScreen goalId={route.goalId} />;
    case "chat":
      return <ChatScreen linkId={route.linkId} withName={route.withName} />;
    case "createWorkout":
      return <CreateWorkoutScreen initialDate={route.initialDate} />;
    case "aiPlanWizard":
      return <AiPlanWizardScreen prefill={route.prefill} />;
    case "planOverview":
      return <PlanOverviewScreen data={route.data} />;
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

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Splash nativa continua visível — evita o flash de um spinner por cima dela.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <SettingsProvider>
          <AuthProvider>
            <Gate />
            <StatusBar style="light" />
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.surface0 },
  center: {
    flex: 1,
    backgroundColor: color.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
});
