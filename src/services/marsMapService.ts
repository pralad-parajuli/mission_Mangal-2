import * as Cesium from 'cesium';
import { JezeroElevationGrid, MarsLayerConfig } from '../types/mars';
import { buildJezeroElevationGrid } from '../analysis/jezeroRegionalGrid';

export const NASA_MODEL_URLS: Record<string, string> = {
  perseverance:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%202020%20Perseverance%20Rover/Mars%202020%20Perseverance%20Rover.glb',
  ingenuity:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Ingenuity%20Mars%20Helicopter/Ingenuity%20Mars%20Helicopter.glb',
  insight:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/InSight%20Cruise%20Lander/InSight%20Cruise%20Lander%20(arm%20deployed).glb',
  mer:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Exploration%20Rover%20-%20Opportunity%20(MER-B)/Mars%20Exploration%20Rover%20-%20Opportunity%20(MER-B).glb',
  viking:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Viking%20Lander/Viking%20Lander.glb',
  mro:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(C)/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(C).glb',
  mgs:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Global%20Surveyor/Mars%20Global%20Surveyor.glb',
  odyssey:
    'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Odyssey/Mars%20Odyssey.glb',
};

export function resolveNasaModelUrl(keyOrUri: string): string {
  if (/^https?:\/\//i.test(keyOrUri)) return keyOrUri;
  const cleaned = keyOrUri
    .replace(/^\/api\/models\//i, '')
    .replace(/\.glb$/i, '')
    .toLowerCase();
  return NASA_MODEL_URLS[cleaned] || `/api/models/${cleaned}.glb`;
}

export interface TrekSearchItem {
  title: string;
  productLabel: string;
  itemType: string;
  instrument?: string;
  mission?: string;
  shape?: string;
  description?: string;
}

const trekSearchCache = new Map<string, { value: { items: TrekSearchItem[]; source: string }; expiresAt: number }>();

export async function fetchJezeroElevationGrid(): Promise<JezeroElevationGrid> {
  try {
    const res = await fetch('/api/elevation/jezero-grid');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as JezeroElevationGrid;
      }
    }
  } catch {
    // Fallback to client-side regional model when static-only hosting has no /api server
  }
  return buildJezeroElevationGrid([], 'mola_regional_only');
}

export async function searchMarsTrekNomenclature(
  query: string
): Promise<{ items: TrekSearchItem[]; source: string }> {
  const key = query.trim().toLowerCase();
  if (!key) return { items: [], source: 'Empty query' };

  const cached = trekSearchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const res = await fetch(`/api/trek/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    return { items: [], source: 'Mars Trek search unavailable' };
  }
  const data = (await res.json()) as { items: TrekSearchItem[]; source: string };
  trekSearchCache.set(key, {
    value: data,
    expiresAt: Date.now() + 1000 * 60 * 15,
  });
  return data;
}

export function createMarsImageryProvider(
  layer: MarsLayerConfig,
  ellipsoid: Cesium.Ellipsoid,
  tilingScheme: Cesium.GeographicTilingScheme,
  directTrekFallback = false
): Cesium.ImageryProvider | null {
  if (layer.kind !== 'trek_wmts' && layer.kind !== 'usgs_wms') return null;

  const rectangle = layer.bounds
    ? Cesium.Rectangle.fromDegrees(
        layer.bounds[0],
        layer.bounds[1],
        layer.bounds[2],
        layer.bounds[3]
      )
    : Cesium.Rectangle.MAX_VALUE;

  if (layer.kind === 'trek_wmts' && layer.trekLayerId) {
    const ext = layer.trekFormat || 'jpg';
    const url = directTrekFallback
      ? `https://trek.nasa.gov/tiles/Mars/EQ/${layer.trekLayerId}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`
      : `/api/tiles/trek/${layer.trekLayerId}/{z}/{y}/{x}.${ext}`;
    return new Cesium.UrlTemplateImageryProvider({
      url,
      tilingScheme,
      ellipsoid,
      rectangle,
      maximumLevel: layer.maxZoom,
      tileWidth: 256,
      tileHeight: 256,
    });
  }

  if (layer.kind === 'usgs_wms' && layer.usgsLayers) {
    return new Cesium.WebMapServiceImageryProvider({
      url: '/api/tiles/usgs',
      layers: layer.usgsLayers,
      parameters: {
        transparent: true,
        format: 'image/png',
        styles: '',
      },
      tilingScheme,
      rectangle,
      maximumLevel: layer.maxZoom,
    });
  }

  return null;
}
