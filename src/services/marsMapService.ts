import * as Cesium from 'cesium';
import { JezeroElevationGrid, MarsLayerConfig } from '../types/mars';

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
  const res = await fetch('/api/elevation/jezero-grid');
  if (!res.ok) {
    throw new Error(`Failed to fetch Jezero elevation grid (HTTP ${res.status})`);
  }
  return res.json();
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
  tilingScheme: Cesium.GeographicTilingScheme
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
    return new Cesium.UrlTemplateImageryProvider({
      url: `/api/tiles/trek/${layer.trekLayerId}/{z}/{y}/{x}.${ext}`,
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
