import {
  FlightCourse,
  FlightCourseRecord,
  FlightCraftId,
  FlightCraftSpec,
} from '../types/mars';
import { resolveNasaModelUrl } from '../services/marsMapService';

export const FLIGHT_CRAFTS: Record<FlightCraftId, FlightCraftSpec> = {
  ingenuity_scout: {
    id: 'ingenuity_scout',
    name: 'Ingenuity Mars Scout',
    shortName: 'Ingenuity Scout',
    role: 'Coaxial Low-Altitude Rotorcraft',
    description:
      'NASA coaxial helicopter tuned for agile delta canyons, slow geological hover-passes, and tight turn radii.',
    minSpeedMs: 14,
    cruiseSpeedMs: 48,
    maxSpeedMs: 85,
    boostSpeedMs: 125,
    pitchRateDegS: 50,
    yawRateDegS: 62,
    maxBankDeg: 45,
    chaseDistanceM: 36,
    chaseHeightM: 9,
    modelUri: resolveNasaModelUrl('ingenuity'),
  },
  ares_wing: {
    id: 'ares_wing',
    name: 'Ares Supersonic Wing',
    shortName: 'Ares Wing',
    role: 'High-Mach Lifting-Body Flyer',
    description:
      'Thin-atmosphere supersonic Mars glider with swept delta wings and dual afterburners built for canyon skimming.',
    minSpeedMs: 80,
    cruiseSpeedMs: 260,
    maxSpeedMs: 440,
    boostSpeedMs: 620,
    pitchRateDegS: 44,
    yawRateDegS: 46,
    maxBankDeg: 64,
    chaseDistanceM: 70,
    chaseHeightM: 15,
  },
};

export const FLIGHT_COURSES: FlightCourse[] = [
  {
    id: 'jezero_delta_run',
    name: 'Jezero Delta Gate Run',
    region: 'Jezero Crater · Perseverance Sector',
    subtitle:
      'Thread 7 aerial waypoints from Octavia E. Butler Landing across Séítah Dunes, Kodiak Mesa, Wildcat Ridge, and Bright Angel.',
    recommendedCraft: 'ingenuity_scout',
    difficulty: 'Standard',
    startLat: 18.4446,
    startLon: 77.4509,
    startAglM: 135,
    startHeadingDeg: 270,
    groundRefElevM: -2570,
    checkpoints: [
      {
        id: 'j1',
        name: 'Wright Brothers Field',
        lat: 18.445,
        lon: 77.4415,
        aglTargetM: 120,
        radiusM: 125,
      },
      {
        id: 'j2',
        name: 'Séítah Dune Corridor',
        lat: 18.4365,
        lon: 77.4275,
        aglTargetM: 115,
        radiusM: 135,
      },
      {
        id: 'j3',
        name: 'Kodiak Mesa Escarpment',
        lat: 18.427,
        lon: 77.406,
        aglTargetM: 140,
        radiusM: 140,
      },
      {
        id: 'j4',
        name: 'Hawksbill Gap Delta Front',
        lat: 18.446,
        lon: 77.392,
        aglTargetM: 155,
        radiusM: 140,
      },
      {
        id: 'j5',
        name: 'Wildcat Ridge Overlook',
        lat: 18.4638,
        lon: 77.3822,
        aglTargetM: 175,
        radiusM: 145,
      },
      {
        id: 'j6',
        name: 'Belva Crater Rim Pass',
        lat: 18.4755,
        lon: 77.3525,
        aglTargetM: 200,
        radiusM: 155,
      },
      {
        id: 'j7',
        name: 'Bright Angel Finish',
        lat: 18.4581,
        lon: 77.3195,
        aglTargetM: 185,
        radiusM: 175,
      },
    ],
  },
  {
    id: 'valles_marineris_skim',
    name: 'Valles Marineris Canyon Skim',
    region: 'Melas Chasma · Coprates System',
    subtitle:
      'High-speed canyon flight through 6 gates along the deepest rift floor in the Solar System.',
    recommendedCraft: 'ares_wing',
    difficulty: 'Technical',
    startLat: -10.38,
    startLon: -76.25,
    startAglM: 1200,
    startHeadingDeg: 104,
    groundRefElevM: -4200,
    checkpoints: [
      {
        id: 'vm1',
        name: 'West Melas Entry',
        lat: -10.42,
        lon: -76.12,
        aglTargetM: 1100,
        radiusM: 650,
      },
      {
        id: 'vm2',
        name: 'Chasma Floor Bend',
        lat: -10.48,
        lon: -75.98,
        aglTargetM: 950,
        radiusM: 650,
      },
      {
        id: 'vm3',
        name: 'Layered Buttes Pass',
        lat: -10.46,
        lon: -75.83,
        aglTargetM: 1150,
        radiusM: 650,
      },
      {
        id: 'vm4',
        name: 'Abyssal Gorge Turn',
        lat: -10.54,
        lon: -75.68,
        aglTargetM: 850,
        radiusM: 650,
      },
      {
        id: 'vm5',
        name: 'Southern Wall Skim',
        lat: -10.63,
        lon: -75.54,
        aglTargetM: 1050,
        radiusM: 680,
      },
      {
        id: 'vm6',
        name: 'Central Melas Exit',
        lat: -10.58,
        lon: -75.38,
        aglTargetM: 1300,
        radiusM: 740,
      },
    ],
  },
  {
    id: 'olympus_caldera_ascent',
    name: 'Olympus Mons Caldera Climb',
    region: 'Tharsis Volcanic Province · +21.2 km Shield',
    subtitle:
      'Sustained high-altitude climb up the upper shield flank into the giant summit caldera complex.',
    recommendedCraft: 'ares_wing',
    difficulty: 'Extreme',
    startLat: 18.5,
    startLon: -134.55,
    startAglM: 1100,
    startHeadingDeg: 78,
    groundRefElevM: 18500,
    checkpoints: [
      {
        id: 'om1',
        name: 'West Lava Apron',
        lat: 18.53,
        lon: -134.43,
        aglTargetM: 1450,
        radiusM: 650,
      },
      {
        id: 'om2',
        name: 'Upper Shield Ridge',
        lat: 18.57,
        lon: -134.3,
        aglTargetM: 1850,
        radiusM: 650,
      },
      {
        id: 'om3',
        name: 'Caldera Scarp Approach',
        lat: 18.61,
        lon: -134.17,
        aglTargetM: 2250,
        radiusM: 650,
      },
      {
        id: 'om4',
        name: 'Outer Ring Breach',
        lat: 18.64,
        lon: -134.03,
        aglTargetM: 2650,
        radiusM: 680,
      },
      {
        id: 'om5',
        name: 'Summit Caldera Core',
        lat: 18.65,
        lon: -133.89,
        aglTargetM: 3000,
        radiusM: 760,
      },
    ],
  },
  {
    id: 'free_flight',
    name: 'Open Mars Free Flight',
    region: 'Planetwide Reconnaissance',
    subtitle:
      'No fixed gates — launch directly into your current map view and explore any crater, canyon, or volcano across Mars.',
    recommendedCraft: 'ares_wing',
    difficulty: 'Standard',
    startLat: 18.4446,
    startLon: 77.4509,
    startAglM: 350,
    startHeadingDeg: 270,
    groundRefElevM: -2570,
    checkpoints: [],
    isFreeFlight: true,
  },
];

const FLIGHT_RECORDS_STORAGE_KEY = 'mars_explorer_flight_records';

export function loadFlightRecords(): Record<string, FlightCourseRecord> {
  try {
    const raw = localStorage.getItem(FLIGHT_RECORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFlightRecord(
  courseId: string,
  elapsedMs: number,
  score: number
): { records: Record<string, FlightCourseRecord>; isNewBest: boolean } {
  const existing = loadFlightRecords();
  const prev = existing[courseId];
  const isNewBest =
    !prev || score > prev.bestScore || (score === prev.bestScore && elapsedMs < prev.bestTimeMs);

  const nextRecord: FlightCourseRecord = {
    bestTimeMs: prev ? Math.min(prev.bestTimeMs, elapsedMs) : elapsedMs,
    bestScore: prev ? Math.max(prev.bestScore, score) : score,
    updatedAt: new Date().toISOString(),
  };

  const updated = { ...existing, [courseId]: nextRecord };
  try {
    localStorage.setItem(FLIGHT_RECORDS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return { records: updated, isNewBest };
}

export function formatFlightTime(ms: number): string {
  const safe = Math.max(0, ms);
  const mins = Math.floor(safe / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

// Lightweight Web Audio cue synthesizer (zero external audio dependencies)
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playFlightCue(
  kind: 'gate' | 'complete' | 'crash' | 'warn',
  muted: boolean
): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const playTone = (
      freq: number,
      endFreq: number,
      durationS: number,
      delayS: number,
      type: OscillatorType,
      gainVal: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delayS);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + delayS + durationS);

      gain.gain.setValueAtTime(0.001, now + delayS);
      gain.gain.linearRampToValueAtTime(gainVal, now + delayS + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delayS + durationS);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delayS);
      osc.stop(now + delayS + durationS + 0.02);
    };

    if (kind === 'gate') {
      playTone(587.33, 880, 0.16, 0, 'triangle', 0.09);
      playTone(880, 1174.66, 0.22, 0.08, 'sine', 0.08);
    } else if (kind === 'complete') {
      playTone(523.25, 523.25, 0.18, 0, 'triangle', 0.09);
      playTone(659.25, 659.25, 0.18, 0.12, 'triangle', 0.09);
      playTone(783.99, 783.99, 0.22, 0.24, 'triangle', 0.09);
      playTone(1046.5, 1046.5, 0.42, 0.36, 'sine', 0.11);
    } else if (kind === 'crash') {
      playTone(180, 48, 0.45, 0, 'sawtooth', 0.12);
    } else if (kind === 'warn') {
      playTone(440, 392, 0.11, 0, 'square', 0.035);
    }
  } catch {
    // ignore Web Audio failure
  }
}
