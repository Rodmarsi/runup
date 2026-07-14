import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BackHandler } from "react-native";
import type { WorkoutLogDto, RaceDto, ShoeDto } from "@runup/api-client";
import type { RaceDistance } from "@runup/types";

/** Preenchimento inicial do wizard de IA a partir de uma prova já cadastrada. */
export interface AiPlanPrefill {
  targetRace?: RaceDistance;
  raceDate?: string;
  objective?: string;
}

/** Resumo de um plano pra tela "Visão geral" — vem da IA/manual recém-criado ou do servidor. */
export interface PlanOverviewData {
  title: string;
  durationWeeks: number;
  origin: "ai" | "manual" | "coach";
  coachName: string | null;
  totalWorkouts: number;
  workoutsPerWeek: number;
  kindBreakdown: { kind: string; count: number }[];
}

export type Route =
  | { name: "home" }
  | { name: "day"; date: string }
  | { name: "checkin"; dayId: string }
  | { name: "logWorkout" }
  | { name: "goal"; goalId: string }
  | { name: "chat"; linkId: string; withName: string }
  | { name: "bodyInfo" }
  | { name: "equipment" }
  | { name: "shoeDetail"; shoe: ShoeDto }
  | { name: "settings" }
  | { name: "notifications" }
  | { name: "activity"; log: WorkoutLogDto }
  | { name: "createWorkout"; initialDate?: string }
  | { name: "aiPlanWizard"; prefill?: AiPlanPrefill }
  | { name: "races" }
  | { name: "raceDetail"; race: RaceDto }
  | { name: "planOverview"; data: PlanOverviewData };

interface Nav {
  route: Route;
  navigate: (route: Route) => void;
  goHome: () => void;
  goBack: () => void;
}

const NavContext = createContext<Nav | null>(null);

/**
 * Pilha de telas: sem isso, o gesto/botão de voltar do Android (que fecha o
 * app quando o JS não intercepta o hardwareBackPress) não tinha pra onde
 * voltar — a navegação era um único estado, sem histórico.
 */
export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "home" }]);
  const route = stack[stack.length - 1]!;

  function navigate(next: Route) {
    setStack((s) => [...s, next]);
  }
  function goHome() {
    setStack([{ name: "home" }]);
  }
  function goBack() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length <= 1) return false; // na home: deixa o Android fechar o app
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  return (
    <NavContext.Provider value={{ route, navigate, goHome, goBack }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav deve ser usado dentro de NavProvider");
  return ctx;
}
