import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { NasaImageItem } from '../types/mars';
import { searchNasaMarsImages } from '../services/nasaImageService';

interface MarsGalleryProps {
  initialQuery?: string;
  onClose: () => void;
}

const TOPIC_PRESETS = [
  { label: 'All Mars', query: 'Mars' },
  { label: 'Jezero & Perseverance', query: 'Jezero Crater Perseverance' },
  { label: 'Gale & Curiosity', query: 'Gale Crater Curiosity' },
  { label: 'Ingenuity Helicopter', query: 'Ingenuity Mars Helicopter' },
  { label: 'Olympus Mons', query: 'Olympus Mons Mars' },
  { label: 'Valles Marineris', query: 'Valles Marineris Mars' },
  { label: 'MRO HiRISE', query: 'Mars Reconnaissance Orbiter HiRISE' },
];

const PAGE_SIZE = 18;

function formatNasaDate(iso: string): string {
  if (!iso) return 'Date unavailable';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

export default function MarsGallery({ initialQuery = 'Mars', onClose }: MarsGalleryProps) {
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [items, setItems] = useState<NasaImageItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const loadPage = useCallback(
    async (queryToLoad: string, targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await searchNasaMarsImages({
          query: queryToLoad,
          page: targetPage,
          pageSize: PAGE_SIZE,
          signal,
        });
        if (signal?.aborted) return;

        setTotalHits(res.totalHits);
        setHasMore(res.hasMore);
        setPage(targetPage);
        setItems((prev) => {
          if (!append) return res.items;
          const seen = new Set(prev.map((x) => x.nasaId));
          const merged = [...prev];
          for (const item of res.items) {
            if (!seen.has(item.nasaId)) {
              seen.add(item.nasaId);
              merged.push(item);
            }
          }
          return merged;
        });
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : 'Unable to fetch NASA Image Library.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    setInputQuery(initialQuery);
    setActiveQuery(initialQuery);
    setLightboxIdx(null);
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    loadPage(activeQuery, 1, false, controller.signal);
    return () => controller.abort();
  }, [activeQuery, loadPage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIdx !== null) {
          setLightboxIdx(null);
        } else {
          onClose();
        }
      } else if (lightboxIdx !== null && e.key === 'ArrowRight') {
        setLightboxIdx((idx) => (idx !== null && idx < items.length - 1 ? idx + 1 : idx));
      } else if (lightboxIdx !== null && e.key === 'ArrowLeft') {
        setLightboxIdx((idx) => (idx !== null && idx > 0 ? idx - 1 : idx));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items.length, lightboxIdx, onClose]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputQuery.trim() || 'Mars';
    setActiveQuery(cleaned);
  };

  const lightboxItem = lightboxIdx !== null ? items[lightboxIdx] || null : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-5 backdrop-blur-xs">
      <div className="flex h-[min(92dvh,860px)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-amber-500/30 bg-[#0B0F17] text-xs text-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-500/20 bg-[#080B11] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-500/35 bg-amber-500/15 text-amber-300">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold tracking-wider text-amber-400 uppercase">
                NASA Image and Video Library · images-api.nasa.gov
              </div>
              <h2 className="truncate font-display text-sm font-semibold text-white">
                Mars Planetary Imagery Archive
              </h2>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex min-w-0 flex-1 items-center sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-amber-400/80" />
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Search NASA Mars archive..."
                className="h-8 min-w-0 flex-1 rounded-md border border-slate-700/80 bg-[#111824] pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-400 focus:border-amber-500/70 focus:outline-none sm:w-64 sm:flex-none"
              />
              <button
                type="submit"
                className="ml-1.5 h-8 shrink-0 rounded-md border border-amber-500/45 bg-amber-500/15 px-3 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25"
              >
                Search
              </button>
            </form>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close NASA Mars Gallery"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Topic Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#0D121B] px-3 py-2 sm:px-4">
          <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar sm:w-auto sm:flex-wrap">
            {TOPIC_PRESETS.map((preset) => {
              const isSelected = activeQuery.toLowerCase() === preset.query.toLowerCase();
              return (
                <button
                  key={preset.query}
                  type="button"
                  onClick={() => {
                    setInputQuery(preset.query);
                    setActiveQuery(preset.query);
                  }}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                      : 'border-slate-700/80 bg-[#111824] text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="font-mono text-[10px] text-slate-400 tabular-nums">
            {!loading && totalHits > 0
              ? `Showing ${items.length} of ${totalHits.toLocaleString()} matches`
              : `Query: "${activeQuery}"`}
          </div>
        </div>

        {/* Gallery Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && items.length === 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-md border border-slate-800 bg-[#111824] animate-pulse"
                >
                  <div className="h-44 w-full bg-slate-800/70" />
                  <div className="space-y-2 p-3">
                    <div className="h-3.5 w-3/4 rounded-xs bg-slate-800" />
                    <div className="h-3 w-full rounded-xs bg-slate-800/70" />
                    <div className="h-3 w-1/2 rounded-xs bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mx-auto my-8 max-w-md rounded-lg border border-rose-500/40 bg-rose-500/10 p-5 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-400" />
              <div className="font-display text-sm font-semibold text-white">
                NASA Image Library Request Failed
              </div>
              <p className="mt-1 text-[11px] text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => loadPage(activeQuery, 1, false)}
                className="mt-3 rounded-md border border-rose-400/50 bg-rose-500/20 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-500/30"
              >
                Retry Request
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="mx-auto my-12 max-w-md rounded-lg border border-slate-700/70 bg-[#111824] p-6 text-center">
              <ImageIcon className="mx-auto mb-2 h-7 w-7 text-slate-500" />
              <div className="font-display text-sm font-semibold text-white">
                No NASA Archive Images Found
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                No public domain Mars images matched &ldquo;{activeQuery}&rdquo;. Try a broader query such as &ldquo;Mars&rdquo;, &ldquo;Jezero&rdquo;, or &ldquo;Perseverance&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInputQuery('Mars');
                  setActiveQuery('Mars');
                }}
                className="mt-3 rounded-md border border-amber-500/45 bg-amber-500/15 px-4 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25"
              >
                Reset to Mars Archive
              </button>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => (
                  <article
                    key={item.nasaId}
                    className="group flex flex-col overflow-hidden rounded-md border border-slate-700/70 bg-[#111824] transition-colors hover:border-amber-500/55"
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxIdx(idx)}
                      className="relative h-44 w-full overflow-hidden bg-black text-left"
                      title="Open larger view"
                    >
                      <img
                        src={item.mediumUrl || item.thumbUrl}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute right-2 bottom-2 rounded-xs bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                        {item.nasaId}
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => setLightboxIdx(idx)}
                          className="line-clamp-2 text-left font-display text-xs font-semibold text-white hover:text-amber-300"
                        >
                          {item.title}
                        </button>
                        <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Calendar className="h-3 w-3 text-amber-400/80" />
                          {formatNasaDate(item.dateCreated)}
                        </span>
                        <span className="truncate text-right text-cyan-300">
                          {item.secondaryCreator || `NASA/${item.center}`}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {hasMore && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => loadPage(activeQuery, page + 1, true)}
                    className="inline-flex items-center gap-2 rounded-md border border-amber-500/45 bg-amber-500/15 px-5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {loadingMore
                      ? 'Loading NASA Archive...'
                      : `Load More Images (Page ${page + 1})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Larger View Lightbox */}
      {lightboxItem && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-2 sm:p-6"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-y-auto rounded-lg border border-amber-500/35 bg-[#0B0F17] text-xs text-slate-200 shadow-2xl lg:flex-row lg:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex shrink-0 items-center justify-center bg-black p-2 lg:flex-1">
              <img
                src={lightboxItem.largeUrl || lightboxItem.mediumUrl || lightboxItem.thumbUrl}
                alt={lightboxItem.title}
                className="max-h-[45dvh] w-auto object-contain lg:max-h-[86dvh]"
              />
              {lightboxIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIdx(lightboxIdx - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-2 text-white hover:border-amber-400"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {lightboxIdx < items.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIdx(lightboxIdx + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-2 text-white hover:border-amber-400"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex w-full shrink-0 flex-col justify-between border-t border-slate-800 bg-[#0B0F17] p-4 lg:w-80 lg:border-t-0 lg:border-l">
              <div className="space-y-3 overflow-y-auto pr-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-xs border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    {lightboxItem.nasaId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label="Close large view"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="font-display text-sm font-semibold text-white">
                  {lightboxItem.title}
                </h3>

                <div className="space-y-1 border-y border-slate-800 py-2 font-mono text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-500">DATE: </span>
                    <span className="text-slate-200">{formatNasaDate(lightboxItem.dateCreated)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">SOURCE: </span>
                    <span className="text-cyan-300">
                      {lightboxItem.secondaryCreator || `NASA Center: ${lightboxItem.center}`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line">
                  {lightboxItem.description}
                </p>

                {lightboxItem.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lightboxItem.keywords.slice(0, 8).map((kw) => (
                      <span
                        key={kw}
                        className="rounded-xs border border-slate-700 bg-[#111824] px-1.5 py-0.5 text-[9px] text-slate-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
                <a
                  href={lightboxItem.origUrl || lightboxItem.largeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/45 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/25"
                >
                  Open Original <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={lightboxItem.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                >
                  NASA Record <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
