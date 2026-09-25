import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { FacilitySnapshot } from '../types/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Layers,
  Bed,
  Users,
  AlertTriangle,
  Search,
  Plus,
  Building2,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';

interface MapViewProps {
  facilities: FacilitySnapshot[];
  onSelectFacility: (facility: FacilitySnapshot) => void;
  selectedFacilityId: string | null;
  onRefresh: () => void;
  isLoading: boolean;
}

// Center of Pune rural PHC cluster (Shirur, Talegaon, Manchar, Baramati)
const PUNE_CENTER: { lat: number; lng: number } = { lat: 18.65, lng: 74.15 };

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAqeH171dGkm5NFOeXD_ZwlVV778WKUnIA';

// Helper to pan map when facility selected
function MapRecenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
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
  const { user, token } = useAuth();
  const [useSchematicView, setUseSchematicView] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [infoWindowFacility, setInfoWindowFacility] = useState<FacilitySnapshot | null>(null);

  // Add facility state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLevel, setNewLevel] = useState<'PHC' | 'CHC' | 'DH'>('PHC');
  const [newDistrict, setNewDistrict] = useState('Pune Rural');
  const [newLat, setNewLat] = useState<number>(18.65);
  const [newLng, setNewLng] = useState<number>(74.15);
  const [newBedsTotal, setNewBedsTotal] = useState<number>(12);
  const [newBedsAvailable, setNewBedsAvailable] = useState<number>(8);
  const [newIcuTotal, setNewIcuTotal] = useState<number>(2);
  const [newIcuAvailable, setNewIcuAvailable] = useState<number>(1);
  const [newOxygenCylinders, setNewOxygenCylinders] = useState<number>(5);
  const [newNursesPresent, setNewNursesPresent] = useState<number>(2);
  const [newDoctorsPresent, setNewDoctorsPresent] = useState<number>(1);
  const [newColdChain, setNewColdChain] = useState<boolean>(true);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const canRegisterFacility =
    user?.role === 'district_officer' ||
    user?.role === 'national_war_room';

  // Synchronize info window with external facility selection
  useEffect(() => {
    if (selectedFacilityId) {
      const fac = facilities.find((f) => f.id === selectedFacilityId);
      if (fac) setInfoWindowFacility(fac);
    }
  }, [selectedFacilityId, facilities]);

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingNew(true);
    try {
      const res = await fetch('/v1/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          code: newCode || undefined,
          level: newLevel,
          district: newDistrict,
          lat: newLat,
          lng: newLng,
          coldChainCapable: newColdChain,
          bedsTotal: newBedsTotal,
          bedsAvailable: newBedsAvailable,
          icuTotal: newIcuTotal,
          icuAvailable: newIcuAvailable,
          oxygenCylinders: newOxygenCylinders,
          nursesPresent: newNursesPresent,
          doctorsPresent: newDoctorsPresent,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewName('');
        setNewCode('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to create facility:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

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
  const activeCenter: { lat: number; lng: number } = selectedFacility
    ? { lat: selectedFacility.lat, lng: selectedFacility.lng }
    : PUNE_CENTER;

  const handleMarkerClick = (fac: FacilitySnapshot) => {
    setInfoWindowFacility(fac);
    onSelectFacility(fac);
  };

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
            {canRegisterFacility && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-2 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white border border-teal-500 flex items-center gap-1 font-bold shadow shadow-teal-500/20"
                title="Register a new Health Facility in database"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Facility</span>
              </button>
            )}
            <button
              onClick={() => setUseSchematicView(!useSchematicView)}
              className={`p-1.5 rounded-md border transition ${
                useSchematicView
                  ? 'bg-teal-500 text-slate-950 border-teal-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle between Google Map and Schematic Grid"
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

      {/* Main Map: Interactive Google Map OR Fallback Schematic Grid Map */}
      <div className="flex-1 w-full h-full relative z-0">
        {!useSchematicView ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultCenter={activeCenter}
              defaultZoom={10}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <MapRecenter center={activeCenter} />

              {filteredFacilities.map((fac) => {
                const isCritical = fac.status === 'critical';
                const isWarning = fac.status === 'warning';
                const isSelected = fac.id === selectedFacilityId;
                const bgColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                const ringColor = isCritical
                  ? 'rgba(239, 68, 68, 0.4)'
                  : isWarning
                  ? 'rgba(245, 158, 11, 0.4)'
                  : 'rgba(16, 185, 129, 0.3)';

                return (
                  <AdvancedMarker
                    key={fac.id}
                    position={{ lat: fac.lat, lng: fac.lng }}
                    onClick={() => handleMarkerClick(fac)}
                    title={fac.name}
                  >
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                      {/* Pulsing alert ring for critical or warning */}
                      {(isCritical || isWarning) && (
                        <div
                          style={{
                            position: 'absolute',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: ringColor,
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                            top: '-4px',
                          }}
                        />
                      )}
                      {/* Main marker pin */}
                      <div
                        style={{
                          position: 'relative',
                          background: bgColor,
                          color: 'white',
                          border: `2px solid ${isSelected ? '#ffffff' : '#0f172a'}`,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          borderRadius: '12px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontWeight: 700,
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          transform: isSelected ? 'scale(1.15)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <span>{fac.level}</span>
                        <span style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '1px 4px', fontSize: '10px' }}>
                          🛏️ {fac.capacity.bedsAvailable}
                        </span>
                        {fac.coldChainCapable && <span title="Cold-chain certified">❄️</span>}
                      </div>
                      {/* Pin point arrow */}
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: `7px solid ${bgColor}`,
                          marginTop: '-1px',
                        }}
                      />
                    </div>
                  </AdvancedMarker>
                );
              })}

              {infoWindowFacility && (
                <InfoWindow
                  position={{ lat: infoWindowFacility.lat, lng: infoWindowFacility.lng }}
                  onCloseClick={() => setInfoWindowFacility(null)}
                  pixelOffset={[0, -36]}
                >
                  <div className="p-1 text-slate-900 min-w-[190px]">
                    <div className="font-bold text-xs">{infoWindowFacility.name}</div>
                    <div className="text-[11px] text-slate-600">
                      {infoWindowFacility.level} &bull; {infoWindowFacility.district}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span>
                        Beds: {infoWindowFacility.capacity.bedsAvailable}/{infoWindowFacility.capacity.bedsTotal}
                      </span>
                      <span>
                        Staff: {infoWindowFacility.attendance.nursesPresent}N/{infoWindowFacility.attendance.doctorsPresent}D
                      </span>
                    </div>
                    <button
                      onClick={() => onSelectFacility(infoWindowFacility)}
                      className="mt-2 w-full py-1 text-center bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-semibold transition"
                    >
                      View Facility Details
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
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
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
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

      {/* Register Health Facility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-400" />
                  Register Health Facility (Database Direct)
                </h3>
                <p className="text-xs text-slate-400">
                  Creates facility record in PostgreSQL and synchronizes with Firestore.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alandi Rural PHC"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Facility Code (Auto if empty)</label>
                  <input
                    type="text"
                    placeholder="e.g. PHC-ALANDI-01"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tier / Level</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-teal-500"
                  >
                    <option value="PHC">PHC (Primary Health Centre)</option>
                    <option value="CHC">CHC (Community Health Centre)</option>
                    <option value="DH">DH (District Hospital)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">District / Jurisdiction</label>
                <input
                  type="text"
                  required
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLng}
                    onChange={(e) => setNewLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-300 block text-xs">Initial Beds & Capacity</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">Total Beds</label>
                    <input
                      type="number"
                      min="1"
                      value={newBedsTotal}
                      onChange={(e) => setNewBedsTotal(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">Available Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={newBedsAvailable}
                      onChange={(e) => setNewBedsAvailable(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">ICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={newIcuTotal}
                      onChange={(e) => setNewIcuTotal(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">O2 Cylinders</label>
                    <input
                      type="number"
                      min="0"
                      value={newOxygenCylinders}
                      onChange={(e) => setNewOxygenCylinders(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">Nurses Active</label>
                    <input
                      type="number"
                      min="0"
                      value={newNursesPresent}
                      onChange={(e) => setNewNursesPresent(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">Doctors Active</label>
                    <input
                      type="number"
                      min="0"
                      value={newDoctorsPresent}
                      onChange={(e) => setNewDoctorsPresent(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newColdChain"
                  checked={newColdChain}
                  onChange={(e) => setNewColdChain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-0"
                />
                <label htmlFor="newColdChain" className="text-slate-300 text-xs cursor-pointer">
                  Cold-Chain Certified (Ice-Lined Refrigerator Installed)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingNew ? 'Saving to Database...' : 'Register Facility'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
