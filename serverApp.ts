import 'dotenv/config';
import express from 'express';
import {
  buildJezeroElevationGrid,
  M20WaypointElevationSample,
} from './src/analysis/jezeroRegionalGrid';

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

const app = express();
app.use(express.json({ limit: '2mb' }));

interface CacheEntry<T> {
  data: T;
  contentType?: string;
  expiresAt: number;
}

const jsonCache = new Map<string, CacheEntry<unknown>>();
const tileCache = new Map<string, CacheEntry<Buffer>>();
const MAX_TILE_CACHE = 800;

function setTileCache(key: string, buf: Buffer, contentType: string) {
  if (tileCache.size >= MAX_TILE_CACHE) {
    const firstKey = tileCache.keys().next().value;
    if (firstKey) tileCache.delete(firstKey);
  }
  tileCache.set(key, {
    data: buf,
    contentType,
    expiresAt: Date.now() + 1000 * 60 * 60,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      marsTrekWmts: 'https://trek.nasa.gov/tiles/Mars/EQ',
      usgsMarsWms: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv',
      nasaMmgis: 'https://mars.nasa.gov/mmgis-maps',
      nasaImageLibrary: 'https://images-api.nasa.gov',
      nasaOpenApis: 'https://api.nasa.gov',
      nasaKeyConfigured: Boolean(process.env.NASA_API_KEY),
    },
  });
});

const ALLOWED_TREK_LAYERS = new Set([
  'Mars_Viking_MDIM21_ClrMosaic_global_232m',
  'Mars_MGS_MOLA_ClrShade_merge_global_463m',
  'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
  'Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw',
  'mola_roughness',
  'SIM3292_Global_Geology',
  'TES_Dust',
  'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
  'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018',
  'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
  'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
  'curiosity_hirise_mosaic',
]);

app.get('/api/tiles/trek/:layer/:z/:y/:file', async (req, res) => {
  const { layer, z, y, file } = req.params;
  if (!ALLOWED_TREK_LAYERS.has(layer)) {
    res.status(400).json({ error: 'Unsupported Mars Trek layer identifier' });
    return;
  }

  const cacheKey = `trek:${layer}:${z}:${y}:${file}`;
  const cached = tileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Content-Type', cached.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(cached.data);
    return;
  }

  const targetUrl = `https://trek.nasa.gov/tiles/Mars/EQ/${layer}/1.0.0/default/default028mm/${z}/${y}/${file}`;
  try {
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'MarsExplorer-ScientificClient/1.0' },
    });
    if (!response.ok) {
      res.status(response.status).end();
      return;
    }
    const contentType =
      response.headers.get('content-type') || (file.endsWith('.png') ? 'image/png' : 'image/jpeg');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    setTileCache(cacheKey, buffer, contentType);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch {
    res.status(502).end();
  }
});

app.get('/api/tiles/usgs', async (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const targetUrl = `https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&${qs}`;
  const cacheKey = `usgs:${qs}`;
  const cached = tileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Content-Type', cached.contentType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(cached.data);
    return;
  }
  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      res.status(response.status).end();
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    setTileCache(cacheKey, buffer, contentType);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch {
    res.status(502).end();
  }
});

const NASA_MODEL_MAP: Record<string, string> = {
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

app.get('/api/models/:modelKey', (req, res) => {
  const { modelKey } = req.params;
  const cleanKey = modelKey.replace(/\.glb$/i, '');
  const targetUrl = NASA_MODEL_MAP[cleanKey];
  if (!targetUrl) {
    res.status(404).json({ error: 'Unknown NASA 3D model key' });
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.redirect(302, targetUrl);
});

async function fetchCachedJson(url: string, ttlMs = 1000 * 60 * 30) {
  const cached = jsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'MarsExplorer-ScientificClient/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status} from ${url}`);
  }
  const data = await response.json();
  jsonCache.set(url, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

interface RawWaypointFeature {
  properties: Record<string, unknown>;
  geometry: { coordinates: number[] };
}

interface RawTraverseFeature {
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates: number[][] | number[][][] };
}

app.get('/api/missions/:missionId/telemetry', async (req, res) => {
  const { missionId } = req.params;
  const missionMap: Record<string, { waypointsUrl: string; traverseUrl: string; mosaicBase: string }> = {
    perseverance: {
      waypointsUrl: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
      traverseUrl: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
      mosaicBase: 'https://mars.nasa.gov/mmgis-maps/M20/',
    },
    curiosity: {
      waypointsUrl: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
      traverseUrl: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
      mosaicBase: 'https://mars.nasa.gov/mmgis-maps/MSL/',
    },
  };

  const config = missionMap[missionId];
  if (!config) {
    res.status(404).json({ error: 'No live MMGIS traverse feed for this mission' });
    return;
  }

  try {
    const [wpRaw, travRaw] = await Promise.all([
      fetchCachedJson(config.waypointsUrl) as Promise<{ name?: string; features?: RawWaypointFeature[] }>,
      fetchCachedJson(config.traverseUrl) as Promise<{ name?: string; features?: RawTraverseFeature[] }>,
    ]);

    const waypoints = (wpRaw.features || []).map((f, idx) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [];
      const imgs = Array.isArray(p.images)
        ? (p.images as Array<{ name?: string; url?: string }>).map((img) => ({
            name: img.name || 'Mosaic',
            url: img.url?.startsWith('http') ? img.url : `${config.mosaicBase}${img.url || ''}`,
          }))
        : [];
      return {
        index: idx,
        rmc: String(p.RMC || p.rmc || idx),
        sol: Number(p.sol ?? 0),
        site: Number(p.site ?? 0),
        drive: Number(p.drive ?? 0),
        lon: Number(p.lon ?? coords[0] ?? 0),
        lat: Number(p.lat ?? coords[1] ?? 0),
        elevGeoidM: p.elev_geoid !== undefined ? Number(p.elev_geoid) : coords[2] !== undefined ? Number(coords[2]) : null,
        distTotalM: Number(p.dist_total_m ?? 0),
        tiltDeg: p.tilt !== undefined ? Number(p.tilt) : null,
        note: p.Note ? String(p.Note) : null,
        images: imgs,
      };
    });

    const pathSegments: number[][][] = [];
    for (const feat of travRaw.features || []) {
      if (!feat.geometry) continue;
      if (feat.geometry.type === 'LineString') {
        pathSegments.push(feat.geometry.coordinates as number[][]);
      } else if (feat.geometry.type === 'MultiLineString') {
        for (const seg of feat.geometry.coordinates as number[][][]) {
          pathSegments.push(seg);
        }
      }
    }

    res.json({
      missionId,
      source: 'NASA/JPL-Caltech MMGIS Historical Archive',
      datasetName: wpRaw.name || `${missionId}_waypoints`,
      fetchedAt: new Date().toISOString(),
      waypointCount: waypoints.length,
      totalDistanceKm:
        waypoints.length > 0 ? Number(((waypoints[waypoints.length - 1].distTotalM || 0) / 1000).toFixed(3)) : 0,
      maxSol: waypoints.reduce((m, w) => Math.max(m, w.sol), 0),
      waypoints,
      pathSegments,
    });
  } catch (err) {
    res.status(503).json({
      error: 'Unable to reach NASA MMGIS archive',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

app.get('/api/trek/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ items: [] });
    return;
  }
  const url = `https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?key=${encodeURIComponent(q)}&rows=15`;
  try {
    const data = (await fetchCachedJson(url, 1000 * 60 * 60)) as {
      response?: { docs?: Array<Record<string, unknown>> };
    };
    const docs = data.response?.docs || [];
    const items = docs.map((d) => ({
      title: String(d.title || d.productLabel || ''),
      productLabel: String(d.productLabel || ''),
      itemType: String(d.itemType || ''),
      instrument: d.instrument ? String(d.instrument) : undefined,
      mission: d.mission ? String(d.mission) : undefined,
      shape: d.shape ? String(d.shape) : undefined,
      description: d.description ? String(d.description).slice(0, 240) : undefined,
    }));
    res.json({ items, source: 'NASA Solar System Treks (Mars Trek Solr Index)' });
  } catch {
    res.json({ items: [], source: 'Local fallback (Mars Trek search unavailable)' });
  }
});

interface NasaImageSearchApiItem {
  href?: string;
  data?: Array<{
    nasa_id?: string;
    title?: string;
    description?: string;
    description_508?: string;
    date_created?: string;
    center?: string;
    secondary_creator?: string;
    keywords?: string[];
    photographer?: string;
    location?: string;
  }>;
  links?: Array<{
    href?: string;
    rel?: string;
    render?: string;
    width?: number;
    height?: number;
  }>;
}

app.get('/api/nasa/images', async (req, res) => {
  const q = String(req.query.q || 'Mars').trim() || 'Mars';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(36, Math.max(1, parseInt(String(req.query.pageSize || '18'), 10) || 18));

  const targetUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(
    q
  )}&media_type=image&page=${page}&page_size=${pageSize}`;

  try {
    const raw = (await fetchCachedJson(targetUrl, 1000 * 60 * 15)) as {
      collection?: {
        metadata?: { total_hits?: number };
        items?: NasaImageSearchApiItem[];
      };
    };

    const totalHits = Number(raw.collection?.metadata?.total_hits || 0);
    const items = (raw.collection?.items || [])
      .map((item) => {
        const meta = item.data?.[0];
        if (!meta?.nasa_id || !meta?.title) return null;

        const links = item.links || [];
        const findHref = (relMatch: string, suffix?: string) =>
          links.find(
            (l) =>
              l.render === 'image' &&
              l.href &&
              (l.rel === relMatch || (suffix ? l.href.includes(suffix) : false))
          )?.href;

        const thumbUrl =
          findHref('preview', '~thumb.') ||
          findHref('alternate', '~small.') ||
          links.find((l) => l.render === 'image')?.href ||
          '';
        const mediumUrl =
          findHref('alternate', '~medium.') ||
          findHref('alternate', '~small.') ||
          thumbUrl;
        const largeUrl =
          findHref('alternate', '~large.') ||
          findHref('canonical', '~orig.') ||
          mediumUrl;
        const origUrl = findHref('canonical', '~orig.') || largeUrl;

        return {
          nasaId: meta.nasa_id,
          title: meta.title,
          description: meta.description || meta.description_508 || 'No description provided in NASA archive.',
          dateCreated: meta.date_created || '',
          center: meta.center || 'NASA',
          secondaryCreator: meta.secondary_creator || meta.photographer || null,
          keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
          thumbUrl,
          mediumUrl,
          largeUrl,
          origUrl,
          sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x && x.thumbUrl));

    res.json({
      query: q,
      page,
      pageSize,
      totalHits,
      hasMore: page * pageSize < totalHits && items.length > 0,
      source: 'NASA Image and Video Library (images-api.nasa.gov)',
      items,
    });
  } catch (err) {
    res.status(502).json({
      error: 'Unable to reach NASA Image and Video Library',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

function parseNumericOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '--' || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

app.get('/api/nasa/environment', async (_req, res) => {
  const mslUrl = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';
  const m20Url = 'https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json';

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);
  const donkiUrl = `https://api.nasa.gov/DONKI/WSAEnlilSimulations?startDate=${formatUtcDate(
    startDate
  )}&endDate=${formatUtcDate(endDate)}&api_key=${encodeURIComponent(NASA_API_KEY)}`;

  const [mslResult, m20Result, donkiResult] = await Promise.allSettled([
    fetchCachedJson(mslUrl, 1000 * 60 * 30),
    fetchCachedJson(m20Url, 1000 * 60 * 30),
    fetchCachedJson(donkiUrl, 1000 * 60 * 30),
  ]);

  const mslSols: Array<Record<string, unknown>> = [];
  let mslStatus: 'ok' | 'unavailable' = 'unavailable';
  if (mslResult.status === 'fulfilled') {
    const raw = mslResult.value as { soles?: Array<Record<string, unknown>> };
    if (Array.isArray(raw.soles) && raw.soles.length > 0) {
      mslStatus = 'ok';
      for (const s of raw.soles.slice(0, 7)) {
        mslSols.push({
          missionId: 'curiosity',
          missionName: 'Curiosity (MSL)',
          instrument: 'REMS (Rover Environmental Monitoring Station)',
          location: 'Gale Crater (-4.59°S, 137.44°E)',
          sol: String(s.sol || ''),
          terrestrialDate: String(s.terrestrial_date || ''),
          ls: parseNumericOrNull(s.ls),
          season: s.season ? String(s.season) : null,
          minTempC: parseNumericOrNull(s.min_temp),
          maxTempC: parseNumericOrNull(s.max_temp),
          minGroundTempC: parseNumericOrNull(s.min_gts_temp),
          maxGroundTempC: parseNumericOrNull(s.max_gts_temp),
          pressurePa: parseNumericOrNull(s.pressure),
          atmoOpacity: s.atmo_opacity && s.atmo_opacity !== '--' ? String(s.atmo_opacity) : null,
          uvIndex:
            s.local_uv_irradiance_index && s.local_uv_irradiance_index !== '--'
              ? String(s.local_uv_irradiance_index)
              : null,
          sunrise: s.sunrise && s.sunrise !== '--' ? String(s.sunrise) : null,
          sunset: s.sunset && s.sunset !== '--' ? String(s.sunset) : null,
          dataClass: 'measured',
          source: 'NASA/JPL-Caltech & CAB MSL REMS Feed',
        });
      }
    }
  }

  const m20Sols: Array<Record<string, unknown>> = [];
  let m20Status: 'ok' | 'unavailable' = 'unavailable';
  if (m20Result.status === 'fulfilled') {
    const raw = m20Result.value as { sols?: Array<Record<string, unknown>> };
    if (Array.isArray(raw.sols) && raw.sols.length > 0) {
      m20Status = 'ok';
      for (const s of raw.sols.slice().reverse().slice(0, 7)) {
        m20Sols.push({
          missionId: 'perseverance',
          missionName: 'Perseverance (Mars 2020)',
          instrument: 'MEDA (Mars Environmental Dynamics Analyzer)',
          location: 'Jezero Crater (18.44°N, 77.45°E)',
          sol: String(s.sol || ''),
          terrestrialDate: String(s.terrestrial_date || ''),
          ls: parseNumericOrNull(s.ls),
          season: s.season ? String(s.season) : null,
          minTempC: parseNumericOrNull(s.min_temp),
          maxTempC: parseNumericOrNull(s.max_temp),
          minGroundTempC: null,
          maxGroundTempC: null,
          pressurePa: parseNumericOrNull(s.pressure),
          atmoOpacity: null,
          uvIndex: null,
          sunrise: s.sunrise && s.sunrise !== '--' ? String(s.sunrise) : null,
          sunset: s.sunset && s.sunset !== '--' ? String(s.sunset) : null,
          dataClass: 'measured',
          source: 'NASA/JPL-Caltech Mars 2020 MEDA Feed',
        });
      }
    }
  }

  const marsSpaceWeather: Array<Record<string, unknown>> = [];
  let donkiStatus: 'ok' | 'unavailable' = 'unavailable';
  if (donkiResult.status === 'fulfilled' && Array.isArray(donkiResult.value)) {
    donkiStatus = 'ok';
    const sims = donkiResult.value as Array<{
      simulationID?: string;
      modelCompletionTime?: string;
      link?: string;
      cmeInputs?: Array<{
        cmeStartTime?: string;
        speed?: number;
        halfAngle?: number;
        cmeid?: string;
        CMEID?: string;
      }>;
      impactList?: Array<{
        location?: string;
        arrivalTime?: string;
        isGlancingBlow?: boolean;
      }>;
    }>;

    for (const sim of sims) {
      const marsHits = (sim.impactList || []).filter((imp) =>
        String(imp.location || '').toLowerCase().includes('mars')
      );
      if (marsHits.length === 0) continue;
      const cme = sim.cmeInputs?.[0];
      for (const hit of marsHits) {
        marsSpaceWeather.push({
          simulationId: sim.simulationID || 'WSA-ENLIL',
          cmeId: cme?.CMEID || cme?.cmeid || null,
          cmeStartTime: cme?.cmeStartTime || sim.modelCompletionTime || '',
          estimatedArrivalTime: hit.arrivalTime || '',
          isGlancingBlow: Boolean(hit.isGlancingBlow),
          cmeSpeedKmS: typeof cme?.speed === 'number' ? cme.speed : null,
          halfAngleDeg: typeof cme?.halfAngle === 'number' ? cme.halfAngle : null,
          target: hit.location || 'Mars',
          link: sim.link || 'https://ccmc.gsfc.nasa.gov/tools/ENLIL/',
          dataClass: 'modeled',
          source: 'NASA Open APIs · CCMC DONKI WSA-ENLIL Simulation',
        });
      }
    }
    marsSpaceWeather.sort((a, b) =>
      String(b.estimatedArrivalTime).localeCompare(String(a.estimatedArrivalTime))
    );
  }

  res.json({
    fetchedAt: new Date().toISOString(),
    sources: {
      mslRems: mslStatus,
      m20Meda: m20Status,
      donkiWsaEnlil: donkiStatus,
    },
    mslSols,
    m20Sols,
    spaceWeatherEvents: marsSpaceWeather.slice(0, 12),
  });
});

app.get('/api/elevation/jezero-grid', async (_req, res) => {
  let m20Points: M20WaypointElevationSample[] = [];
  let sourceStatus: 'nasa_m20_plus_mola' | 'mola_regional_only' = 'mola_regional_only';

  try {
    const wpRaw = (await fetchCachedJson(
      'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json'
    )) as { features?: RawWaypointFeature[] };
    m20Points = (wpRaw.features || [])
      .map((f) => ({
        lon: Number(f.properties?.lon ?? f.geometry?.coordinates?.[0]),
        lat: Number(f.properties?.lat ?? f.geometry?.coordinates?.[1]),
        elev: Number(f.properties?.elev_geoid ?? f.geometry?.coordinates?.[2]),
      }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat) && Number.isFinite(p.elev));
    if (m20Points.length > 0) sourceStatus = 'nasa_m20_plus_mola';
  } catch {
    sourceStatus = 'mola_regional_only';
  }

  res.json(buildJezeroElevationGrid(m20Points, sourceStatus));
});

export default app;
