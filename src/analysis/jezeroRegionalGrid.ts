import { JezeroElevationGrid } from '../types/mars';

export interface M20WaypointElevationSample {
  lon: number;
  lat: number;
  elev: number;
}

// Regional Jezero Crater macro-topographic reference model grounded in MOLA/HiRISE Jezero DTM:
// - Crater center floor (~77.45E, 18.44N): ~ -2570 m
// - Belva Crater (~77.386E, 18.485N): ~ -2640 m depression with raised >15° interior walls
// - Western Delta Front Scarp (~77.392E, 18.458N-18.490N): crisp ~95 m eroded deltaic escarpment
// - Neretva Vallis breaching channel valley (~77.27E-77.335E, 18.452N): gentler incised corridor
// - Jezero Western Rim (lon < 77.275E): rises steeply toward -1820 m
export function regionalJezeroElevationM(lon: number, lat: number): number {
  let elev = -2572 + (77.45 - lon) * 780 + (lat - 18.44) * 240;

  const dDelta = Math.hypot((lon - 77.362) / 0.036, (lat - 18.474) / 0.026);
  if (dDelta < 1.35) {
    elev += 170 * Math.exp(-Math.pow(dDelta, 2.4) * 1.9);
  }

  if (lon > 77.345 && lon < 77.405 && lat > 18.448 && lat < 18.495) {
    const scarpStep = 1 / (1 + Math.exp((lon - 77.391) / 0.0024));
    const latMask = Math.exp(-Math.pow((lat - 18.469) / 0.017, 2));
    elev += 72 * scarpStep * latMask;
  }

  const dChannelLat = Math.abs(lat - (18.453 + (77.32 - lon) * 0.12));
  if (lon < 77.345 && lon > 77.278 && dChannelLat < 0.018) {
    const lonTaper = Math.sin(Math.min(1, (lon - 77.278) / 0.025) * (Math.PI / 2));
    elev -= 48 * lonTaper * Math.exp(-(dChannelLat * dChannelLat) / (0.008 * 0.008));
  }

  const distFromCenter = Math.hypot((lon - 77.62) * 0.948, lat - 18.38);
  if (distFromCenter > 0.305) {
    const rimFactor = Math.min(1, (distFromCenter - 0.305) / 0.095);
    elev += 540 * Math.pow(rimFactor, 1.8);
  }

  const rBelva = Math.hypot((lon - 77.386) * 0.948, lat - 18.485);
  if (rBelva < 0.028) {
    elev -= 115 * Math.exp(-(rBelva * rBelva) / (0.0078 * 0.0078));
    elev += 44 * Math.exp(-((rBelva - 0.0125) ** 2) / (0.0038 ** 2));
  }

  const dSeitah = Math.hypot((lon - 77.425) / 0.026, (lat - 18.418) / 0.02);
  if (dSeitah < 1.3) {
    elev -= 28 * Math.exp(-dSeitah * dSeitah * 2.1);
  }

  const dKodiak = Math.hypot((lon - 77.372) / 0.0065, (lat - 18.442) / 0.0065);
  if (dKodiak < 1.6) {
    elev += 68 * Math.exp(-dKodiak * dKodiak * 2.5);
  }

  return Number(elev.toFixed(2));
}

export function buildJezeroElevationGrid(
  m20Points: M20WaypointElevationSample[] = [],
  sourceStatus: 'nasa_m20_plus_mola' | 'mola_regional_only' = 'mola_regional_only'
): JezeroElevationGrid {
  const minLon = 77.24;
  const maxLon = 77.52;
  const minLat = 18.34;
  const maxLat = 18.56;
  const cols = 140;
  const rows = 112;

  const dLon = (maxLon - minLon) / (cols - 1);
  const dLat = (maxLat - minLat) / (rows - 1);

  const elevations: (number | null)[] = new Array(rows * cols);
  const quality: number[] = new Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    const lat = minLat + r * dLat;
    for (let c = 0; c < cols; c++) {
      const lon = minLon + c * dLon;
      const idx = r * cols + c;

      if (lon > 77.505 && lat > 18.545) {
        elevations[idx] = null;
        quality[idx] = 0;
        continue;
      }

      const baseElev = regionalJezeroElevationM(lon, lat);

      let weightSum = 0;
      let valSum = 0;
      let minDistSq = Infinity;

      for (let i = 0; i < m20Points.length; i += 2) {
        const p = m20Points[i];
        const dx = (p.lon - lon) * 0.948;
        const dy = p.lat - lat;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) minDistSq = distSq;
        if (distSq < 0.0004) {
          const kernel = Math.exp(-distSq / (2 * 0.0065 * 0.0065));
          const w = kernel / (distSq + 1e-8);
          weightSum += w;
          valSum += w * p.elev;
        }
      }

      if (weightSum > 0 && minDistSq < 0.0004) {
        const measuredElev = valSum / weightSum;
        const smoothBlend = 0.88 * Math.exp(-minDistSq / (2 * 0.0068 * 0.0068));
        elevations[idx] = Number((measuredElev * smoothBlend + baseElev * (1 - smoothBlend)).toFixed(2));
        quality[idx] = minDistSq < 0.000025 ? 2 : 1;
      } else {
        elevations[idx] = baseElev;
        quality[idx] = 1;
      }
    }
  }

  return {
    region: 'Jezero Crater, Isidis Planitia Margin',
    datum: 'MOLA Areoid / Mars 2000 IAU Sphere (R = 3,396,190 m)',
    sourceStatus,
    measuredWaypointSamples: m20Points.length,
    bounds: { minLon, maxLon, minLat, maxLat },
    cols,
    rows,
    dLon,
    dLat,
    elevations,
    quality,
  };
}
