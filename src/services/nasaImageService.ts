import { NasaImageSearchResult } from '../types/mars';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const imageSearchCache = new Map<string, CacheEntry<NasaImageSearchResult>>();
const inflightRequests = new Map<string, Promise<NasaImageSearchResult>>();

const CACHE_TTL_MS = 1000 * 60 * 5;

export async function searchNasaMarsImages(params: {
  query?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<NasaImageSearchResult> {
  const query = (params.query || 'Mars').trim() || 'Mars';
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(36, Math.max(1, params.pageSize ?? 18));
  const cacheKey = `${query.toLowerCase()}::${page}::${pageSize}`;

  const cached = imageSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existing = inflightRequests.get(cacheKey);
  if (existing && !params.signal) {
    return existing;
  }

  const reqPromise = (async () => {
    const res = await fetch(
      `/api/nasa/images?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
      { signal: params.signal }
    );
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: string; detail?: string };
        detail = body.detail || body.error || detail;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(`NASA Image Library unavailable: ${detail}`);
    }
    const data = (await res.json()) as NasaImageSearchResult;
    imageSearchCache.set(cacheKey, {
      value: data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return data;
  })();

  if (!params.signal) {
    inflightRequests.set(cacheKey, reqPromise);
  }

  try {
    return await reqPromise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export function clearNasaImageCache(): void {
  imageSearchCache.clear();
}
