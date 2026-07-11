import { createContext, useContext, useState, type ReactNode } from "react";
import type { WorkoutLogDto } from "@runup/api-client";

export type Route =
  | { name: "home" }
  | { name: "day"; date: string }
  | { name: "checkin"; dayId: string }
  | { name: "logWorkout" }
  | { name: "goal"; goalId: string }
  | { name: "chat"; linkId: string; withName: string }
  | { name: "bodyInfo" }
  | { name: "equipment" }
  | { name: "settings" }
  | { name: "activity"; log: WorkoutLogDto }
  | { name: "analytics" };

interface Nav {
  route: Route;
  navigate: (route: Route) => void;
  goHome: () => void;
}

const NavContext = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ name: "home" });
  return (
    <NavContext.Provider
      value={{
        route,
        navigate: setRoute,
        goHome: () => setRoute({ name: "home" }),
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav deve ser usado dentro de NavProvider");
  return ctx;
}
