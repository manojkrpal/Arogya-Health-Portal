import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FacilitySnapshot } from '../types/client.js';
import {
  Layers,
  Bed,
  Users,
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface MapViewProps {
  facilities: FacilitySnapshot[];
  onSelectFacility: (facility: FacilitySnapshot) => void;
  selectedFacilityId: string | null;
  onRefresh: () => void;
  isLoading: boolean;
}

// Center of Pune rural PHC cluster (Shirur, Talegaon, Manchar, Baramati)
const PUNE_CENTER: [number, number] = [18.65, 74.15];

// Custom HTML pin markers with status color, beds, and attendance indicators
function createPinIcon(facility: FacilitySnapshot, isSelected: boolean) {
  const isCritical = facility.status === 'critical';
  const isWarning = facility.status === 'warning';

  const bgColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
  const ringColor = isCritical ? 'rgba(239, 68, 68, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <!-- Pulsing alert ring for critical or warning -->
      ${
        isCritical || isWarning
          ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${ringColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top: -4px;"></div>`
          : ''
      }
      <!-- Main marker pin -->
      <div style="
        position: relative;
        background: ${bgColor};
        color: white;
        border: 2px solid ${isSelected ? '#ffffff' : '#0f172a'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        border-radius: 12px;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 700;
        font-size: 11px;
        white-space: nowrap;
        z-index: 10;
        transition: transform 0.2s;
        ${isSelected ? 'transform: scale(1.15);' : ''}
      ">
        <span>${facility.level}</span>
        <span style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 1px 4px; font-size: 10px;">
          🛏️ ${facility.capacity.bedsAvailable}
        </span>
        ${facility.coldChainCapable ? '<span title="Cold-chain certified">❄️</span>' : ''}
      </div>
      <!-- Pin point arrow -->
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid ${bgColor};
        margin-top: -1px;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-pin-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Helper to pan map when facility selected
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  facilities,
  onSelectFacility,
  selectedFacilityId,
  onRefresh,
  isLoading,
}) => {
  const [useSchematicView, setUseSchematicView] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFacilities = facilities.filter((f) => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.district.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);
  const activeCenter: [number, number] = selectedFacility
    ? [selectedFacility.lat, selectedFacility.lng]
    : PUNE_CENTER;

  return (
    <div className="relative w-full h-[calc(100vh-115px)] flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex flex-col gap-1.5 max-w-lg mx-auto pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur p-1.5 rounded-xl border border-slate-800 shadow-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PHC, CHC, or District..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Filter status pills */}
          <div className="flex items-center gap-1 text-[10px] font-semibold">
            <button
              onClick={() => setFilterStatus(filterStatus === 'critical' ? 'all' : 'critical')}
              className={`px-2 py-1 rounded-md transition border ${
                filterStatus === 'critical'
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/20 hover:bg-rose-500/25'
              }`}
            >
              Alerts ({facilities.filter((f) => f.status === 'critical').length})
            </button>
            <button
              onClick={() => setUseSchematicView(!useSchematicView)}
              className={`p-1.5 rounded-md border transition ${
                useSchematicView
                  ? 'bg-teal-500 text-slate-950 border-teal-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle between Leaflet tiles and Schematic Grid"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
              title="Refresh clinic telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Legend strip */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 7d Risk
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical
            </span>
          </div>
          <span className="text-slate-500">Tap clinic pin to open drawer</span>
        </div>
      </div>

      {/* Main Map: Interactive Leaflet Map OR Fallback Schematic Grid Map */}
      <div className="flex-1 w-full h-full relative z-0">
        {!useSchematicView ? (
          <MapContainer
            center={activeCenter}
            zoom={10}
            scrollWheelZoom={true}
            className="w-full h-full"
            attributionControl={true}
          >
            {/* Standard OpenStreetMap raster tile layer with required attribution */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />

            <MapRecenter center={activeCenter} />

            {filteredFacilities.map((fac) => (
              <Marker
                key={fac.id}
                position={[fac.lat, fac.lng]}
                icon={createPinIcon(fac, fac.id === selectedFacilityId)}
                eventHandlers={{
                  click: () => onSelectFacility(fac),
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 text-slate-900">
                    <div className="font-bold text-xs">{fac.name}</div>
                    <div className="text-[11px] text-slate-600">
                      {fac.level} &bull; {fac.district}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span>Beds: {fac.capacity.bedsAvailable}/{fac.capacity.bedsTotal}</span>
                      <span>Staff: {fac.attendance.nursesPresent}N/{fac.attendance.doctorsPresent}D</span>
                    </div>
                    <button
                      onClick={() => onSelectFacility(fac)}
                      className="mt-2 w-full py-1 text-center bg-teal-600 text-white rounded text-[11px] font-semibold"
                    >
                      View Facility Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          /* Schematic High-Contrast Fallback Grid Map */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-200">
            <div className="text-center mb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-400" />
                Schematic Facility Grid (Pune Rural Zone)
              </h2>
              <p className="text-[11px] text-slate-400">
                Resilient telemetry pins with direct inventory telemetry
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
              {filteredFacilities.map((fac) => {
                const isSelected = fac.id === selectedFacilityId;
                const statusBorder =
                  fac.status === 'critical'
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : fac.status === 'warning'
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-emerald-500/40 bg-emerald-950/20';

                return (
                  <button
                    key={fac.id}
                    onClick={() => onSelectFacility(fac)}
                    className={`p-3 rounded-xl border text-left transition hover:scale-[1.02] shadow-lg ${statusBorder} ${
                      isSelected ? 'ring-2 ring-teal-400 bg-slate-800' : 'bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {fac.level}
                        </span>
                        <h3 className="font-bold text-xs text-slate-100 mt-1 leading-snug">
                          {fac.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">{fac.district} District</p>
                      </div>
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                          fac.status === 'critical'
                            ? 'bg-rose-500 animate-pulse'
                            : fac.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Bed className="w-3.5 h-3.5 text-teal-400" />
                        <span>
                          {fac.capacity.bedsAvailable} / {fac.capacity.bedsTotal} Beds
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>{fac.attendance.nursesPresent} Nurses</span>
                      </div>
                    </div>

                    {fac.risk.criticalCount > 0 && (
                      <div className="mt-2 text-[10px] text-rose-300 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Critical stockout: {fac.risk.highestRiskSku || 'Essential SKU'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
