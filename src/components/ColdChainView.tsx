import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { TelemetryDevice, ExpiryRadarItem, DispatchRoutePlan } from '../types/client.js';
import {
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Battery,
  Sun,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Zap,
  Activity,
  Calendar,
} from 'lucide-react';

export const ColdChainView: React.FC = () => {
  const { token, user } = useAuth();
  const [sensors, setSensors] = useState<TelemetryDevice[]>([]);
  const [expiryLots, setExpiryLots] = useState<ExpiryRadarItem[]>([]);
  const [dispatchRoutes, setDispatchRoutes] = useState<DispatchRoutePlan[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expirySummary, setExpirySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ingestion simulation state
  const [simTemp, setSimTemp] = useState('4.2');
  const [simFacility, setSimFacility] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [telRes, expRes, routeRes] = await Promise.all([
        fetch('/v1/telemetry/live', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/expiry/radar', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/routes/dispatch-plan', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!telRes.ok || !expRes.ok || !routeRes.ok) {
        throw new Error('Failed to load cold chain telemetry');
      }

      const telData = await telRes.json();
      const expData = await expRes.json();
      const routeData = await routeRes.json();

      setSensors(telData.sensors || []);
      setSummary(telData.summary || null);
      setExpiryLots(expData.lots || []);
      setExpirySummary(expData.summary || null);
      setDispatchRoutes(routeData.routes || []);

      if (telData.sensors && telData.sensors.length > 0 && !simFacility) {
        setSimFacility(telData.sensors[0].facilityId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSimulateIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simFacility || !token) return;

    setIsSimulating(true);
    try {
      const targetSensor = sensors.find((s) => s.facilityId === simFacility);
      const res = await fetch('/v1/telemetry/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: simFacility,
          deviceId: targetSensor?.deviceId || 'ILR-TEST-01',
          temperature: parseFloat(simTemp),
          batteryPct: 92,
          doorOpen: parseFloat(simTemp) > 8.0,
        }),
      });

      if (!res.ok) throw new Error('Simulation failed');
      await fetchData();
    } catch (err: any) {
      alert('Ingest error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDispatchAction = async (transferId: string, action: 'start_dispatch' | 'complete_delivery') => {
    if (!token) return;
    setActionLoading(transferId);
    try {
      const res = await fetch('/v1/routes/dispatch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transferId,
          action,
          sealTemperature: 3.8,
          receiptTemperature: 4.2,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Action failed');
      }

      await fetchData();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && sensors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-slate-400 font-mono text-sm">Synchronizing Cold-Chain IoT Dataloggers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Cold-Chain IoT & Expiry Radar</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ILR thermal surveillance (2°C–8°C safe band), passive thermal window validation, and predictive lot expiry redistribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Safe Band Compliance</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${summary.coldChainCompliancePct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {summary.coldChainCompliancePct}%
              </span>
              <span className="text-xs text-slate-500">of units in 2–8°C</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Critical Excursions</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${summary.criticalExcursions > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                {summary.criticalExcursions}
              </span>
              <span className="text-xs text-slate-500">active alerts</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Lots Expiring &lt;30d</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${expirySummary?.criticalRiskCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {expirySummary?.criticalRiskCount || 0}
              </span>
              <span className="text-xs text-slate-500">urgent action</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Active Dispatches</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-400">
                {dispatchRoutes.filter((r) => r.status === 'in_transit' || r.status === 'approved').length}
              </span>
              <span className="text-xs text-slate-500">in transit / approved</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid: 1. Live Sensors & Simulator, 2. Expiry Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live IoT Cold Chain Sensors */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Cold-Chain Dataloggers (Ice-Lined Refrigerators)
            </h3>
            <span className="text-xs text-slate-400">Auto-updates via IoT Telemetry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensors.map((sensor) => {
              const isExcursion = sensor.status === 'critical_excursion';
              const isWarning = sensor.status === 'warning';

              return (
                <div
                  key={sensor.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isExcursion
                      ? 'bg-rose-950/30 border-rose-800/80 ring-1 ring-rose-500/50'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {sensor.level}
                        </span>
                        <h4 className="font-medium text-white text-sm">{sensor.facilityName}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Device: {sensor.deviceId}</p>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                        isExcursion
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isExcursion ? (
                        <>
                          <ShieldAlert className="w-3 h-3" /> Excursion
                        </>
                      ) : isWarning ? (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Warning
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> 2°C–8°C Optimal
                        </>
                      )}
                    </span>
                  </div>

                  {/* Temperature Gauge Display */}
                  <div className="mt-4 flex items-baseline justify-between bg-slate-950/50 p-3 rounded-lg border border-slate-800/70">
                    <div>
                      <span className="text-xs text-slate-500">Current Temp</span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-3xl font-extrabold tracking-tight font-mono ${
                            isExcursion ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {sensor.temperature.toFixed(1)}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">°C</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{sensor.batteryPct}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="capitalize">{sensor.powerSource.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Door & Time status */}
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Door: {sensor.doorOpen ? '⚠️ Open' : '🔒 Closed'}</span>
                    <span>Safe Band: {sensor.tempMinSafe}°C – {sensor.tempMaxSafe}°C</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* IoT Telemetry Simulation Panel for testing */}
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Simulate IoT Temperature Reading / Excursion Test
            </h4>
            <form onSubmit={handleSimulateIngest} className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={simFacility}
                onChange={(e) => setSimFacility(e.target.value)}
                className="bg-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
              >
                {sensors.map((s) => (
                  <option key={s.facilityId} value={s.facilityId}>
                    {s.facilityName} ({s.deviceId})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <input
                  type="number"
                  step="0.1"
                  value={simTemp}
                  onChange={(e) => setSimTemp(e.target.value)}
                  className="bg-transparent text-xs text-white font-mono w-16 focus:outline-none"
                  placeholder="Temp °C"
                />
                <span className="text-xs text-slate-400">°C</span>
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                {isSimulating ? 'Ingesting...' : 'Inject Telemetry Event'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimTemp('9.8');
                }}
                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-xs border border-rose-800/80 transition"
              >
                Test Heat Excursion (9.8°C)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimTemp('4.2');
                }}
                className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded text-xs border border-emerald-800/80 transition"
              >
                Reset to Normal (4.2°C)
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Expiry Radar Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Expiry Radar (&lt;90 Days)
            </h3>
            <span className="text-xs text-slate-400">{expiryLots.length} lots</span>
          </div>

          <div className="space-y-3">
            {expiryLots.length === 0 ? (
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                No lots expiring within 90 days. All stock batches fresh.
              </div>
            ) : (
              expiryLots.map((lot) => {
                const isCritical = lot.urgency === 'critical';
                const isHigh = lot.urgency === 'high';

                return (
                  <div
                    key={lot.lotId}
                    className={`p-3.5 rounded-xl border ${
                      isCritical
                        ? 'bg-rose-950/20 border-rose-800/80'
                        : isHigh
                        ? 'bg-amber-950/20 border-amber-800/60'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-xs">{lot.skuName}</span>
                          {lot.coldChain && (
                            <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[10px] font-mono border border-cyan-800/60">
                              Cold
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{lot.facilityName}</p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {lot.daysToExpiry}d left
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300 bg-slate-950/40 p-2 rounded">
                      <span>Qty: <strong>{lot.qty}</strong> units</span>
                      <span>Expires: <strong>{lot.expiresOn}</strong></span>
                    </div>

                    {lot.suggestedRecipient && (
                      <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/50">
                        <span className="font-medium">Recommended Donor Redistribution:</span>
                        <div className="flex items-center justify-between mt-1 text-slate-300">
                          <span>→ {lot.suggestedRecipient.facilityName}</span>
                          <span className="text-[10px] text-slate-400">{lot.suggestedRecipient.distanceKm} km</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cold-Chain Dispatch & Route Plans */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            Cold-Chain Route Dispatch & Passive Thermal Windows
          </h3>
          <span className="text-xs text-slate-400">Validated against cold-box passive thermal limits</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dispatchRoutes.map((route) => {
            const isApproved = route.status === 'approved';
            const isInTransit = route.status === 'in_transit';
            const isCompleted = route.status === 'completed';

            return (
              <div
                key={route.transferId}
                className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{route.skuName}</span>
                    <div className="flex items-center gap-2 mt-1 text-sm font-medium text-white">
                      <span>{route.fromFacilityName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span>{route.toFacilityName}</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono capitalize ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : isInTransit
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                        : isApproved
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {route.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Transfer Qty</span>
                    <span className="font-semibold text-white">{route.qty} units</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Transit ETA</span>
                    <span className="font-semibold text-white">{route.estimatedTransitHours}h ({route.distanceKm} km)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Thermal Margin</span>
                    <span className="font-semibold text-emerald-400">+{route.thermalSafetyMarginHours}h safe</span>
                  </div>
                </div>

                {/* Waypoint Checkpoints */}
                <div className="space-y-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">Route Checkpoints:</span>
                  <div className="space-y-1 pl-1">
                    {route.checkpoints.map((cp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          {cp.name}
                        </span>
                        <span className="font-mono text-slate-500">+{cp.etaMinutes} min</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispatch Actions */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">Vehicle: {route.vehicleType.slice(0, 24)}...</span>

                  {isApproved && (
                    <button
                      onClick={() => handleDispatchAction(route.transferId, 'start_dispatch')}
                      disabled={actionLoading === route.transferId}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition"
                    >
                      {actionLoading === route.transferId ? 'Starting...' : 'Dispatch Van'}
                    </button>
                  )}

                  {isInTransit && (
                    <button
                      onClick={() => handleDispatchAction(route.transferId, 'complete_delivery')}
                      disabled={actionLoading === route.transferId}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition"
                    >
                      {actionLoading === route.transferId ? 'Completing...' : 'Confirm Delivery'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
