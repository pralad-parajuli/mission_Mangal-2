import { useState } from 'react';
import { Compass } from 'lucide-react';
import { LayerCategory, LayerRuntimeState, MarsLayerConfig } from '../types/mars';

interface MarsLayerControlProps {
  layers: MarsLayerConfig[];
  layerStates: Record<string, LayerRuntimeState>;
  onToggleLayer: (layerId: string) => void;
  onLayerOpacity: (layerId: string, opacity: number) => void;
  splitCompareLayerId: string | null;
  onSetSplitCompare: (layerId: string | null) => void;
  onFlyTo: (lat: number, lon: number, altitudeM: number, label?: string) => void;
}

type CategoryFilter = 'all' | 'basemap_topo' | 'imagery' | 'thermal' | 'science';

const CATEGORY_FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'basemap_topo', label: 'Basemap / Topo' },
  { id: 'imagery', label: 'HiRISE' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'science', label: 'Geology / Risk' },
];

function matchesFilter(cat: LayerCategory, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'basemap_topo') return cat === 'basemap' || cat === 'topography';
  if (filter === 'imagery') return cat === 'imagery';
  if (filter === 'thermal') return cat === 'thermal';
  return cat === 'mineralogy' || cat === 'geology' || cat === 'atmosphere' || cat === 'analysis';
}

export default function MarsLayerControl({
  layers,
  layerStates,
  onToggleLayer,
  onLayerOpacity,
  splitCompareLayerId,
  onSetSplitCompare,
  onFlyTo,
}: MarsLayerControlProps) {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>('jezero_hirise');
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const visibleLayers = layers.filter((l) => matchesFilter(l.category, filter));
  const activeCount = layers.filter((l) => layerStates[l.id]?.enabled).length;

  return (
    <div className="space-y-2.5">
      <div className="border-b border-slate-800 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xs font-semibold text-white">
              Survival Hazard &amp; Mars Trek Overlays
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeCount} of {layers.length} layers active
            </p>
          </div>
          {splitCompareLayerId && (
            <button
              type="button"
              onClick={() => onSetSplitCompare(null)}
              className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/25"
            >
              Exit Split
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                filter === f.id
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-slate-700/80 bg-[#111824] text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibleLayers.map((layer) => {
        const st = layerStates[layer.id] || {
          enabled: layer.defaultEnabled,
          opacity: layer.defaultOpacity,
          status: 'idle',
        };
        const isExpanded = expandedLayerId === layer.id;
        const isSplit = splitCompareLayerId === layer.id;

        return (
          <div
            key={layer.id}
            className={`rounded-md border transition-colors ${
              st.enabled
                ? 'border-amber-500/35 bg-[#111824]'
                : 'border-slate-800 bg-[#0D121B] hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={st.enabled}
                  onChange={() => onToggleLayer(layer.id)}
                  className="h-3.5 w-3.5 accent-amber-500"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-100">
                    {layer.shortName}
                  </div>
                  <div className="truncate text-[10px] text-slate-400">
                    {layer.instrument} · {layer.resolution}
                  </div>
                </div>
              </label>

              <div className="flex shrink-0 items-center gap-1.5">
                {st.status === 'error' && (
                  <span
                    className="rounded-xs border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-medium text-rose-400"
                    title={st.errorMessage}
                  >
                    Err
                  </span>
                )}
                {(layer.kind === 'trek_wmts' || layer.kind === 'usgs_wms') && (
                  <button
                    type="button"
                    onClick={() => onSetSplitCompare(isSplit ? null : layer.id)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] ${
                      isSplit
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title="Compare layer in split-screen slider"
                  >
                    Split
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedLayerId(isExpanded ? null : layer.id)}
                  className="rounded-md border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-500 hover:text-white"
                >
                  {isExpanded ? 'Hide' : 'Info'}
                </button>
              </div>
            </div>

            {st.enabled && (
              <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-1.5">
                <span className="text-[10px] text-slate-400">Opacity</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={st.opacity}
                  onChange={(e) => onLayerOpacity(layer.id, parseFloat(e.target.value))}
                  className="h-1 flex-1 accent-amber-500"
                />
                <span className="w-8 text-right font-mono text-[10px] text-slate-300 tabular-nums">
                  {Math.round(st.opacity * 100)}%
                </span>
              </div>
            )}

            {isExpanded && (
              <div className="space-y-1.5 border-t border-slate-800 bg-[#080B11]/80 px-3 py-2 text-[11px] text-slate-300">
                <div className="font-medium text-white">{layer.name}</div>
                <p className="leading-relaxed text-slate-400">{layer.description}</p>
                <div className="grid grid-cols-1 gap-0.5 pt-1 text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Source:</span> {layer.source}
                  </div>
                  <div>
                    <span className="text-slate-500">Date:</span> {layer.observationDate}
                  </div>
                  <div>
                    <span className="text-slate-500">Coverage:</span> {layer.coverage}
                  </div>
                  <div>
                    <span className="text-slate-500">License:</span> {layer.license}
                  </div>
                </div>
                {layer.bounds && (
                  <button
                    type="button"
                    onClick={() =>
                      onFlyTo(
                        (layer.bounds![1] + layer.bounds![3]) / 2,
                        (layer.bounds![0] + layer.bounds![2]) / 2,
                        35000,
                        layer.shortName
                      )
                    }
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:underline"
                  >
                    <Compass className="h-3 w-3" /> Zoom to coverage extent
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
