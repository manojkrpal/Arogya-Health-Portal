import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { TelemetryDevice, ExpiryRadarItem } from '../types/client.js';
import {
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Battery,
  ShieldCheck,
  RefreshCw,
  Zap,
  Activity,
  Snowflake,
  Send,
} from 'lucide-react';

export const ColdChainView: React.FC = () => {
  const { token } = useAuth();
  const [sensors, setSensors] = useState<TelemetryDevice[]>([]);
  const [expiryLots, setExpiryLots] = useState<ExpiryRadarItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ingestion simulation state
  const [simTemp, setSimTemp] = useState('4.2');
  const [simFacility, setSimFacility] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [telRes, expRes] = await Promise.all([
        fetch('/v1/telemetry/live', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/expiry/radar', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!telRes.ok || !expRes.ok) {
        throw new Error('Failed to load cold chain telemetry');
      }

      const telData = await telRes.json();
      const expData = await expRes.json();

      setSensors(telData.sensors || []);
      setSummary(telData.summary || null);
      setExpiryLots(expData.lots || []);

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
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSimulateIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simFacility || !token) return;

    setIsSimulating(true);
    setSimSuccess(null);
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
      setSimSuccess(`Updated ${targetSensor?.facilityName || 'sensor'} to ${simTemp}°C`);
      setTimeout(() => setSimSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError('Ingest error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const safeSensors = sensors.filter((s) => s.temperature >= 2.0 && s.temperature <= 8.0);
  const excursionSensors = sensors.filter((s) => s.temperature < 2.0 || s.temperature > 8.0);

  return (
    <div className="space-y-4 text-slate-100">
      {/* Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div>
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Cold-Chain IoT Telemetry</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Ice-Lined Refrigerator (ILR) sensors tracking standard 2°C – 8°C vaccine stability
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700 self-start sm:self-auto"
          title="Refresh telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total ILRs</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white">{sensors.length}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Connected units</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Safe (2°C-8°C)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{safeSensors.length}</div>
          <span className="text-[10px] text-emerald-500/80 mt-0.5 block">100% compliant</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Excursions</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-xl font-bold ${excursionSensors.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
            {excursionSensors.length}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-0.5 block">Thermal breach</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Battery Avg</span>
            <Battery className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {sensors.length > 0 ? Math.round(sensors.reduce((a, b) => a + (b.batteryPct || 90), 0) / sensors.length) : 95}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Solar & backup grid</span>
        </div>
      </div>

      {/* Simulator Panel */}
      <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
        <form onSubmit={handleSimulateIngest} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Test IoT Temperature Ping</span>
              <p className="text-[11px] text-slate-400">Inject real-time sensor reading to simulate temperature changes</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={simFacility}
              onChange={(e) => setSimFacility(e.target.value)}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              {sensors.map((s) => (
                <option key={s.facilityId} value={s.facilityId}>
                  {s.facilityName}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSimTemp('4.2')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                  simTemp === '4.2' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                4.2°C (Safe)
              </button>
              <button
                type="button"
                onClick={() => setSimTemp('9.8')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                  simTemp === '9.8' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                9.8°C (Excursion)
              </button>
            </div>

            <button
              type="submit"
              disabled={isSimulating}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Sending...' : 'Send Ping'}</span>
            </button>
          </div>
        </form>

        {simSuccess && (
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{simSuccess}</span>
          </div>
        )}
      </div>

      {/* Live Sensors Grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connected Facility ILRs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sensors.map((sensor) => {
            const isSafe = sensor.temperature >= 2.0 && sensor.temperature <= 8.0;

            return (
              <div
                key={sensor.deviceId}
                className={`p-4 rounded-2xl border transition-all ${
                  isSafe
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sensor.facilityName}</span>
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        {sensor.deviceId}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {sensor.district || 'District PHC'} &middot; Solar Dometic TCX 220
                    </span>
                  </div>

                  {/* Temperature Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-xl font-mono text-base font-bold flex items-center gap-1.5 ${
                      isSafe
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                    }`}
                  >
                    <Thermometer className="w-4 h-4" />
                    <span>{sensor.temperature.toFixed(1)}°C</span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
                  <div className="text-slate-400">
                    <span className="block text-[10px] text-slate-500">Status</span>
                    <span className={`font-semibold ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isSafe ? 'Normal 2-8°C' : 'Thermal Excursion'}
                    </span>
                  </div>

                  <div className="text-slate-400">
                    <span className="block text-[10px] text-slate-500">Battery</span>
                    <span className="font-semibold text-slate-200">{sensor.batteryPct || 94}%</span>
                  </div>

                  <div className="text-slate-400">
                    <span className="block text-[10px] text-slate-500">Door</span>
                    <span className={`font-semibold ${sensor.doorOpen ? 'text-amber-400' : 'text-slate-300'}`}>
                      {sensor.doorOpen ? 'Open (Warning)' : 'Sealed'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
