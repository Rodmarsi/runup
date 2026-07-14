import {
  initialize,
  requestPermission,
  readRecords,
  aggregateRecord,
  ExerciseType,
} from "react-native-health-connect";
import type { WorkoutLogKind } from "@runup/api-client";
import { api } from "./api.js";

/** Tipos de exercício do Health Connect que sabemos mapear pra um WorkoutLogKind nosso. */
const EXERCISE_TYPE_TO_KIND: Record<number, WorkoutLogKind> = {
  [ExerciseType.RUNNING]: "running",
  [ExerciseType.RUNNING_TREADMILL]: "running",
  [ExerciseType.WALKING]: "walk",
  [ExerciseType.HIKING]: "walk",
  [ExerciseType.STRENGTH_TRAINING]: "strength",
  [ExerciseType.BIKING]: "bike",
  [ExerciseType.BIKING_STATIONARY]: "bike",
  [ExerciseType.YOGA]: "mobility",
  [ExerciseType.PILATES]: "mobility",
};

/** true se o SDK do Health Connect estiver disponível no aparelho. */
export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    return await initialize();
  } catch {
    return false;
  }
}

/** Pede permissão de leitura pros tipos de dado que usamos. */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  const granted = await requestPermission([
    { accessType: "read", recordType: "ExerciseSession" },
    { accessType: "read", recordType: "Distance" },
    { accessType: "read", recordType: "TotalCaloriesBurned" },
    { accessType: "read", recordType: "HeartRate" },
  ]);
  return granted.length > 0;
}

/** Sem dados desse tipo nesse intervalo (comum p/ musculação, sem Distance) → null. */
async function aggregateDistance(startTime: string, endTime: string) {
  try {
    return await aggregateRecord({
      recordType: "Distance",
      timeRangeFilter: { operator: "between", startTime, endTime },
    });
  } catch {
    return null;
  }
}

async function aggregateCalories(startTime: string, endTime: string) {
  try {
    return await aggregateRecord({
      recordType: "TotalCaloriesBurned",
      timeRangeFilter: { operator: "between", startTime, endTime },
    });
  } catch {
    return null;
  }
}

async function aggregateHeartRate(startTime: string, endTime: string) {
  try {
    return await aggregateRecord({
      recordType: "HeartRate",
      timeRangeFilter: { operator: "between", startTime, endTime },
    });
  } catch {
    return null;
  }
}

/**
 * Sincroniza sessões de exercício dos últimos `days` dias com o RunUp.
 * Idempotente — reimportar não duplica (upsert por `healthConnectId` no
 * backend). Retorna quantas sessões foram sincronizadas.
 */
export async function syncHealthConnect(days = 30): Promise<number> {
  const ready = await isHealthConnectAvailable();
  if (!ready) return 0;

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const { records } = await readRecords("ExerciseSession", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });

  let synced = 0;
  for (const session of records) {
    const kind = EXERCISE_TYPE_TO_KIND[session.exerciseType];
    const healthConnectId = session.metadata?.id;
    if (!kind || !healthConnectId) continue;

    const durationSeconds = Math.round(
      (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000,
    );
    if (durationSeconds <= 0) continue;

    const [dist, cal, hr] = await Promise.all([
      aggregateDistance(session.startTime, session.endTime),
      aggregateCalories(session.startTime, session.endTime),
      aggregateHeartRate(session.startTime, session.endTime),
    ]);

    await api.logStandaloneWorkout({
      kind,
      source: "health_connect",
      healthConnectId,
      completedAt: session.endTime,
      durationSeconds,
      distanceMeters: dist ? Math.round(dist.DISTANCE.inMeters) : undefined,
      caloriesKcal: cal ? Math.round(cal.ENERGY_TOTAL.inKilocalories) : undefined,
      avgHeartRate: hr ? Math.round(hr.BPM_AVG) : undefined,
      notes: session.title,
    });
    synced++;
  }
  return synced;
}
