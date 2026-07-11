import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { Units } from "./format.js";

const UNITS_KEY = "runup.units";

interface SettingsState {
  units: Units;
  setUnits: (units: Units) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>("km");

  useEffect(() => {
    SecureStore.getItemAsync(UNITS_KEY).then((v) => {
      if (v === "mi" || v === "km") setUnitsState(v);
    });
  }, []);

  const value = useMemo<SettingsState>(
    () => ({
      units,
      setUnits: (u) => {
        setUnitsState(u);
        SecureStore.setItemAsync(UNITS_KEY, u).catch(() => {});
      },
    }),
    [units],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings deve ser usado dentro de SettingsProvider");
  return ctx;
}
