import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  DroneCorridor,
  DroneFlight,
  EpidemicForecastItem,
  ProcurementPO,
  NationalGridState,
} from '../types/client.js';
import { MultimodalTriageModal } from './MultimodalTriageModal.js';
import {
  Plane,
  CloudRain,
  ShoppingCart,
  Globe,
  Sparkles,
  RefreshCw,
  BatteryCharging,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Stethoscope,
  Send,
  Radio,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Building2,
  Boxes,
} from 'lucide-react';

type SubTab = 'drones' | 'epidemic' | 'procurement' | 'national_grid';

export const AutonomousLogisticsView: React.FC = () => {
  const { user, token } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('drones');
  const [corridors, setCorridors] = useState<DroneCorridor[]>([]);
  const [flights, setFlights] = useState<DroneFlight[]>([]);
  const [epidemics, setEpidemics] = useState<EpidemicForecastItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ProcurementPO[]>([]);
  const [nationalStates, setNationalStates] = useState<NationalGridState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);

  // Form states
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedCorridorId, setSelectedCorridorId] = useState('');
  const [dispatchSku, setDispatchSku] = useState('INS-001');
  const [dispatchQty, setDispatchQty] = useState(25);

  const [showPOModal, setShowPOModal] = useState(false);
  const [poSku, setPoSku] = useState('ORS-001');
  const [poQty, setPoQty] = useState(5000);
  const [poDeliveryType, setPoDeliveryType] = useState<'bulk_consignment' | 'expedited_cold_courier'>('bulk_consignment');

  // Climate slider state
  const [simulatedRainfall, setSimulatedRainfall] = useState(165);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [dronesRes, flightsRes, epiRes, poRes, gridRes] = await Promise.all([
        fetch('/v1/drones/corridors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/drones/flights', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/epidemic/forecasts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/procurement/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/national/grid', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (dronesRes.ok) {
        const data = await dronesRes.json();
        setCorridors(data.corridors || []);
        if (data.corridors?.length > 0 && !selectedCorridorId) {
          setSelectedCorridorId(data.corridors[0].id);
        }
      }
      if (flightsRes.ok) {
        const data = await flightsRes.json();
        setFlights(data.flights || []);
      }
      if (epiRes.ok) {
        const data = await epiRes.json();
        setEpidemics(data.forecasts || []);
      }
      if (poRes.ok) {
        const data = await poRes.json();
        setPurchaseOrders(data.orders || []);
      }
      if (gridRes.ok) {
        const data = await gridRes.json();
        setNationalStates(data.states || []);
      }
    } catch (err) {
      console.error('Failed to fetch autonomous logistics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedCorridorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dispatch Drone Flight
  const handleDispatchFlight = async () => {
    if (!selectedCorridorId || !dispatchQty) return;
    try {
      const res = await fetch('/v1/drones/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          corridorId: selectedCorridorId,
          skuCode: dispatchSku,
          skuName: dispatchSku === 'INS-001' ? 'Human Insulin NPH 100IU/ml' : 'Artesunate Injection 60mg',
          qty: dispatchQty,
        }),
      });
      if (res.ok) {
        setShowDispatchModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to dispatch drone flight:', err);
    }
  };

  // Land Drone Flight
  const handleLandFlight = async (flightId: string) => {
    try {
      const res = await fetch('/v1/drones/land', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flightId }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to complete drone landing:', err);
    }
  };

  // Sync Climate Telemetry
  const handleSyncClimate = async (rainfallVal: number) => {
    setSimulatedRainfall(rainfallVal);
    try {
      const res = await fetch('/v1/epidemic/climate-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          district: 'Pune District',
          rainfallMm: rainfallVal,
          tempCelsius: 28.5,
          humidityPct: 85,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEpidemics(data.forecasts || []);
      }
    } catch (err) {
      console.error('Failed to sync climate telemetry:', err);
    }
  };

  // Issue Procurement PO
  const handleCreatePO = async () => {
    try {
      const unitCost = poSku === 'ORS-001' ? 18.5 : poSku === 'INS-001' ? 145.0 : 45.0;
      const res = await fetch('/v1/procurement/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cdwHubName: 'Pune Central Drug Warehouse (CDW-MH-01)',
          supplierName: 'State Empanelled Medical Distributor',
          skuCode: poSku,
          skuName: poSku === 'ORS-001' ? 'Oral Rehydration Salts WHO' : poSku === 'INS-001' ? 'Human Insulin NPH 100IU/ml' : 'Normal Saline IV 500ml',
          quantity: poQty,
          unitCostInr: unitCost,
          deliveryType: poDeliveryType,
        }),
      });
      if (res.ok) {
        setShowPOModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create purchase order:', err);
    }
  };

  // Receive PO Consignment
  const handleReceivePO = async (poId: string) => {
    try {
      const res = await fetch(`/v1/procurement/orders/${poId}/receive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to receive consignment:', err);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
                LEVEL 3
              </span>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Autonomous Logistics & Epidemic AI Grid
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              BVLoS Aerial Cold-Chain Drones • IMD Climate Correlation • Central Procurement (CDW) • National Grid
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTriageModal(true)}
              className="px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-2"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Clinical AI Triage</span>
            </button>
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
              title="Refresh Logistics Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-5 border-t border-slate-800/80 pt-4 overflow-x-auto">
          <button
            onClick={() => setSubTab('drones')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              subTab === 'drones'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Drone Aerial Fleet</span>
            {flights.filter((f) => f.status === 'in_flight').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setSubTab('epidemic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              subTab === 'epidemic'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Epidemic Climate AI</span>
          </button>

          <button
            onClick={() => setSubTab('procurement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              subTab === 'procurement'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Central Drug Procurement</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300">
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('national_grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              subTab === 'national_grid'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>National Multi-State Grid</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DRONE AERIAL COLD-CHAIN FLEET                          */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'drones' && (
        <div className="space-y-5 animate-fade-in">
          {/* Top Bar for Drones */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              BVLoS Drone Corridors & Active Sorties
            </h2>

            {['district_officer', 'national_war_room', 'state_admin', 'procurement_officer'].includes(user?.role || '') && (
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Launch Emergency Flight</span>
              </button>
            )}
          </div>

          {/* Active Flight Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className={`rounded-2xl border p-4 sm:p-5 transition shadow-xl ${
                  flight.status === 'in_flight'
                    ? 'bg-slate-900 border-teal-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-300">
                        {flight.flightCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          flight.status === 'in_flight'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {flight.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-1">
                      {flight.originName} → {flight.destinationName}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Payload: <strong>{flight.qty}x {flight.skuName}</strong> ({flight.skuCode})
                    </div>
                  </div>

                  {flight.status === 'in_flight' && (
                    <button
                      onClick={() => handleLandFlight(flight.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Landing</span>
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Flight Progress</span>
                    <span className="text-teal-300 font-bold">{flight.progressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${flight.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-400" />
                      Temp
                    </div>
                    <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5">
                      {flight.payloadTempC}°C
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-emerald-400" />
                      Battery
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-300 mt-0.5">
                      {flight.batteryPct}%
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Altitude</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {flight.altitudeMeters}m AGL
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                      <Wind className="w-3 h-3 text-amber-400" />
                      Wind
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                      {flight.windSpeedKmh} km/h
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Corridors Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Certified BVLoS Low-Altitude Corridors
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Corridor Code</th>
                    <th className="py-2.5 px-3">Origin / CDW Node</th>
                    <th className="py-2.5 px-3">Destination PHC</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Flight Time</th>
                    <th className="py-2.5 px-3">Terrain</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {corridors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{c.code}</td>
                      <td className="py-2.5 px-3">{c.originFacilityName}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{c.destinationFacilityName}</td>
                      <td className="py-2.5 px-3 font-mono">{c.distanceKm} km</td>
                      <td className="py-2.5 px-3 font-mono">~{c.flightTimeMinutes} mins</td>
                      <td className="py-2.5 px-3 text-slate-400">{c.terrainType}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: EPIDEMIOLOGICAL FORECASTING & CLIMATE AI               */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'epidemic' && (
        <div className="space-y-5 animate-fade-in">
          {/* Climate Telemetry Controller */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-400" />
                  IMD Real-Time Weather & Monsoon Correlation Sandbox
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust simulated precipitation to observe automated pathogen risk escalation and buffer pre-allocation.
                </p>
              </div>
              <div className="font-mono text-xs font-bold text-teal-300 px-3 py-1 rounded-xl bg-teal-950/60 border border-teal-500/30">
                Rainfall: {simulatedRainfall} mm
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="250"
              value={simulatedRainfall}
              onChange={(e) => handleSyncClimate(Number(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0 mm (Dry Baseline)</span>
              <span>100 mm (Seasonal)</span>
              <span>180 mm (Monsoon Flood Runoff)</span>
              <span>250 mm (Extreme Inundation)</span>
            </div>
          </div>

          {/* Disease Risk Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {epidemics.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between shadow-xl ${
                  item.alertLevel === 'outbreak_critical'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : item.alertLevel === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        item.alertLevel === 'outbreak_critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : item.alertLevel === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {item.alertLevel.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      R₀ = {item.r0Value}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-100 mt-2">{item.pathogen}</h3>
                  <p className="text-xs text-slate-400">{item.district}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Active Cases</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{item.currentActiveCases}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">14-Day Projected</div>
                      <div className="text-sm font-bold text-teal-400 mt-0.5">+{item.predicted14dCases}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mt-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                    {item.aiEpidemiologicalNote}
                  </p>
                </div>

                {/* Buffer Pre-allocation */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Autonomous Buffer Pre-Allocation
                  </div>
                  <div className="space-y-1.5">
                    {item.recommendedBufferPreAllocation.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60"
                      >
                        <span className="font-semibold text-slate-300">{rec.skuName}</span>
                        <span className="font-mono font-bold text-teal-300">+{rec.recommendedUnits}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: AUTONOMOUS CENTRAL PROCUREMENT (CDW)                   */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'procurement' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              Central Drug Warehouse (CDW) Consignment Orders
            </h2>

            {['procurement_officer', 'state_admin', 'national_war_room'].includes(user?.role || '') && (
              <button
                onClick={() => setShowPOModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Issue Purchase Order (PO)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs font-bold text-teal-300">{po.poNumber}</div>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">{po.skuName}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">{po.supplierName}</div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                      po.status === 'received'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {po.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Quantity</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {po.quantity.toLocaleString()} units
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total (INR)</div>
                    <div className="text-xs font-mono font-bold text-teal-400 mt-0.5">
                      ₹{po.totalAmountInr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Lead Time</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {po.leadTimeDays} days (ETA {po.etaDate})
                    </div>
                  </div>
                </div>

                {po.status === 'ordered' && ['procurement_officer', 'state_admin', 'district_officer'].includes(user?.role || '') && (
                  <button
                    onClick={() => handleReceivePO(po.id)}
                    className="w-full mt-4 py-2 rounded-xl bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Warehouse Consignment Inward</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: NATIONAL MULTI-STATE GRID (WAR ROOM)                   */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'national_grid' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              National Health Grid State Readiness Index
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nationalStates.map((st) => (
                <div key={st.stateCode} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-sm">{st.stateName}</span>
                    <span className="font-mono font-bold text-xs text-purple-300">{st.stateCode}</span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Readiness Index:</span>
                      <strong className="text-teal-400 font-mono">{st.readinessIndex} / 100</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Bed Occupancy:</span>
                      <strong className="text-slate-200 font-mono">{st.occupancyPct}% ({st.bedsOccupied}/{st.totalBeds})</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cold-Chain Compliance:</span>
                      <strong className="text-emerald-400 font-mono">{st.coldChainCompliancePct}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Stock Coverage:</span>
                      <strong className="text-slate-200 font-mono">~{st.avgStockCoverageDays} days</strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Buffer Status</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        st.strategicBufferStatus === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {st.strategicBufferStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Launch Drone Flight                                    */}
      {/* ------------------------------------------------------------- */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plane className="w-4 h-4 text-teal-400" />
              Launch BVLoS Autonomous Drone Sortie
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Select Aerial Corridor</label>
                <select
                  value={selectedCorridorId}
                  onChange={(e) => setSelectedCorridorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {corridors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.originFacilityName} → {c.destinationFacilityName} ({c.distanceKm} km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Medicine SKU Payload</label>
                <select
                  value={dispatchSku}
                  onChange={(e) => setDispatchSku(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="INS-001">Human Insulin NPH 100IU/ml (Cold-Box Peltier Required)</option>
                  <option value="ART-001">Artesunate Injection 60mg</option>
                  <option value="ORS-001">Oral Rehydration Salts WHO</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Quantity (Units)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={dispatchQty}
                  onChange={(e) => setDispatchQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchFlight}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20"
              >
                Confirm Drone Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Create Purchase Order (PO)                             */}
      {/* ------------------------------------------------------------- */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-teal-400" />
              Issue Central Drug Warehouse Purchase Order (PO)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Medicine SKU</label>
                <select
                  value={poSku}
                  onChange={(e) => setPoSku(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="ORS-001">Oral Rehydration Salts WHO (₹18.5/unit)</option>
                  <option value="INS-001">Human Insulin NPH 100IU/ml (₹145.0/unit)</option>
                  <option value="IV-NS500">Normal Saline IV 500ml (₹45.0/unit)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Consignment Quantity</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={poQty}
                  onChange={(e) => setPoQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Consignment Logistics Type</label>
                <select
                  value={poDeliveryType}
                  onChange={(e) => setPoDeliveryType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="bulk_consignment">Bulk Rail/Road Consignment (5 days)</option>
                  <option value="expedited_cold_courier">Expedited Cold-Chain Van (2 days)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPOModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20"
              >
                Issue Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multimodal Triage Modal */}
      {showTriageModal && (
        <MultimodalTriageModal
          facilityName="Shirur PHC"
          onClose={() => setShowTriageModal(false)}
        />
      )}
    </div>
  );
};
