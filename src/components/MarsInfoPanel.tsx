import { Compass, ExternalLink, Image as ImageIcon, MapPin, Rocket } from 'lucide-react';
import { MarsLocation, MarsMission, ScientificPoi } from '../types/mars';

interface MarsInfoPanelProps {
  location?: MarsLocation | null;
  poi?: ScientificPoi | null;
  mission?: MarsMission | null;
  onFlyTo?: (lat: number, lon: number, altitudeM: number, label?: string) => void;
  onOpenGalleryForQuery?: (query: string) => void;
}

export default function MarsInfoPanel({
  location,
  poi,
  mission,
  onFlyTo,
  onOpenGalleryForQuery,
}: MarsInfoPanelProps) {
  if (!location && !poi && !mission) return null;

  const title = location?.name || poi?.name || mission?.name || 'Exploration Site';
  const badgeText = location
    ? location.category.replace(/_/g, ' ').toUpperCase()
    : poi
    ? poi.category.replace(/_/g, ' ').toUpperCase()
    : mission
    ? mission.missionType.toUpperCase()
    : 'SITE';

  const lat = location?.lat ?? poi?.lat ?? mission?.lat ?? 0;
  const lon = location?.lon ?? poi?.lon ?? mission?.lon ?? 0;
  const flyAlt = location
    ? location.region.includes('Jezero')
      ? 14000
      : 160000
    : poi
    ? 5500
    : mission?.orbitAltitudeM
    ? mission.orbitAltitudeM + 60000
    : 12000;

  const galleryQuery = location
    ? location.name.split('(')[0].trim()
    : poi
    ? poi.name.split('(')[0].trim()
    : mission
    ? mission.name.split('(')[0].trim()
    : 'Mars';

  return (
    <div className="rounded-md border border-cyan-500/35 bg-[#0D1522] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-xs border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-cyan-300 uppercase">
          {mission ? <Rocket className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
          {badgeText}
        </span>
        {(location?.elevationM !== undefined || poi?.elevationM !== undefined) && (
          <span className="font-mono text-[10px] text-cyan-300 tabular-nums">
            {(location?.elevationM ?? poi?.elevationM)?.toLocaleString()} m MOLA
          </span>
        )}
      </div>

      <h3 className="font-display text-sm font-semibold text-white">{title}</h3>

      {location && (
        <div className="mt-0.5 text-[10px] text-amber-300/90">{location.region}</div>
      )}
      {poi && (
        <div className="mt-0.5 text-[10px] text-amber-300/90">
          {poi.associatedInstrument} · {poi.observationDate} · Science Priority {poi.scienceValue}/10
        </div>
      )}
      {mission && (
        <div className="mt-0.5 text-[10px] text-amber-300/90">
          {mission.agency} · {mission.status} · Landed {mission.landingDate}
          {mission.endDate ? ` – ${mission.endDate}` : ''}
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-200">
        {location?.summary || poi?.description || mission?.description}
      </p>

      {location?.missionInfo && (
        <div className="mt-2 rounded-xs border border-slate-700/80 bg-[#080B11]/80 px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-300">
          <span className="font-semibold text-amber-300">Mission Context: </span>
          {location.missionInfo}
        </div>
      )}

      {mission && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xs border border-slate-700/80 bg-[#080B11]/80 px-2.5 py-1.5 font-mono text-[10px] tabular-nums">
          <div>
            <span className="text-slate-500">SITE: </span>
            <span className="text-slate-200 truncate">{mission.landingSite.split(',')[0]}</span>
          </div>
          <div>
            <span className="text-slate-500">
              {mission.orbitAltitudeM ? 'ORBIT: ' : 'TRAVERSE: '}
            </span>
            <span className="text-cyan-300">
              {mission.orbitAltitudeM
                ? `${Math.round(mission.orbitAltitudeM / 1000)} km`
                : `${mission.totalTraverseKm} km`}
            </span>
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400">
        Source: {location?.source || poi?.source || mission?.sourceAttribution}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {onFlyTo && (
          <button
            type="button"
            onClick={() => onFlyTo(lat, lon, flyAlt, title)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/45 bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-500/25"
          >
            <Compass className="h-3 w-3" />
            Fly To Site
          </button>
        )}
        {onOpenGalleryForQuery && (
          <button
            type="button"
            onClick={() => onOpenGalleryForQuery(galleryQuery)}
            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/45 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/25"
          >
            <ImageIcon className="h-3 w-3" />
            NASA Images
          </button>
        )}
        {mission?.nasaRecordUrl && (
          <a
            href={mission.nasaRecordUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#111824] px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Archive <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
