import { LiveMarsEnvironmentResponse, MissionTelemetry } from '../types/mars';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const envCache: { entry: CacheEntry<LiveMarsEnvironmentResponse> | null } = { entry: null };
const telemetryCache = new Map<string, CacheEntry<MissionTelemetry>>();

const ENV_TTL_MS = 1000 * 60 * 5;
const TELEMETRY_TTL_MS = 1000 * 60 * 15;

export async function fetchLiveMarsEnvironment(forceRefresh = false): Promise<LiveMarsEnvironmentResponse> {
  if (!forceRefresh && envCache.entry && envCache.entry.expiresAt > Date.now()) {
    return envCache.entry.value;
  }

  const res = await fetch('/api/nasa/environment');
  if (!res.ok) {
    throw new Error(`Failed to fetch NASA Mars environmental feeds (HTTP ${res.status})`);
  }
  const data = (await res.json()) as LiveMarsEnvironmentResponse;
  envCache.entry = {
    value: data,
    expiresAt: Date.now() + ENV_TTL_MS,
  };
  return data;
}

export async function fetchMissionTelemetry(
  missionId: 'perseverance' | 'curiosity'
): Promise<MissionTelemetry> {
  const cached = telemetryCache.get(missionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const res = await fetch(`/api/missions/${missionId}/telemetry`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${missionId} telemetry (HTTP ${res.status})`);
  }
  const data = (await res.json()) as MissionTelemetry;
  telemetryCache.set(missionId, {
    value: data,
    expiresAt: Date.now() + TELEMETRY_TTL_MS,
  });
  return data;
}
