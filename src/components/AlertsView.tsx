import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  AlertItem,
  GeminiTransferPlan,
  ProposedTransferLine,
  EpidemicForecastItem,
} from '../types/client.js';
import {
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Snowflake,
  RefreshCw,
  Volume2,
  VolumeX,
  CloudRain,
  Sliders,
  TrendingUp,
  Activity,
  Flame,
  Layers,
  Thermometer,
  Boxes,
} from 'lucide-react';
import { GeminiAdvisoryModal } from './GeminiAdvisoryModal.js';

interface AlertsViewProps {
  alerts: AlertItem[];
  onRefresh: () => void;
  isLoading: boolean;
  onProposeTransfer: (recipientFacilityId: string, skuId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onRefresh,
  isLoading,
  onProposeTransfer,
}) => {
  const { user, token, lang } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'epidemic'>('alerts');

  // Stockout alerts modal state
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [speakingAlertId, setSpeakingAlertId] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<{
    plan: GeminiTransferPlan;
    proposedLines: ProposedTransferLine[];
    modelNotice: string;
  } | null>(null);

  // Epidemic forecast state
  const [epidemics, setEpidemics] = useState<EpidemicForecastItem[]>([]);
  const [isEpidemicLoading, setIsEpidemicLoading] = useState(false);
  const [simulatedRainfall, setSimulatedRainfall] = useState(165);

  const fetchEpidemicData = useCallback(async () => {
    if (!token) return;
    setIsEpidemicLoading(true);
    try {
      const res = await fetch('/v1/epidemic/forecasts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEpidemics(data.forecasts || []);
      }
    } catch (err) {
      console.error('Failed to load epidemic forecasts:', err);
    } finally {
      setIsEpidemicLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEpidemicData();
  }, [fetchEpidemicData]);

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

  const handleSpeakAlert = (alert: AlertItem) => {
    if ('speechSynthesis' in window) {
      if (speakingAlertId === alert.id) {
        window.speechSynthesis.cancel();
        setSpeakingAlertId(null);
        return;
      }
      window.speechSynthesis.cancel();
      let readout = '';
      if (lang === 'hi') {
        readout = `चेतावनी: ${alert.facilityName} में ${alert.message}। 7-दिवसीय स्टॉकआउट जोखिम ${(alert.stockoutProb7d * 100).toFixed(0)} प्रतिशत है।`;
      } else if (lang === 'mr') {
        readout = `इशारा: ${alert.facilityName} येथे ${alert.message}। 7 दिवसांत औषध तुटवड्याचा धोका ${(alert.stockoutProb7d * 100).toFixed(0)} टक्के आहे.`;
      } else if (lang === 'bn') {
        readout = `সতর্কতা: ${alert.facilityName}-এ ${alert.message}। আগামী ৭ দিনে স্টকের ঘাটতির আশঙ্কা ${(alert.stockoutProb7d * 100).toFixed(0)} শতাংশ।`;
      } else {
        readout = `Critical Alert: At ${alert.facilityName}, ${alert.message}. 7-day stockout probability is ${(alert.stockoutProb7d * 100).toFixed(0)} percent.`;
      }

      const utterance = new SpeechSynthesisUtterance(readout);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeakingAlertId(alert.id);
      utterance.onend = () => setSpeakingAlertId(null);
      utterance.onerror = () => setSpeakingAlertId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Gemini structured explanation & deterministic optimization in expandable modal
  const handleExplainAlert = async (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
    setIsExplaining(true);
    setAdvisoryError(null);
    setExplanationData(null);

    try {
      const res = await fetch('/v1/ai/explain-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alertId: alert.id,
          facilityId: alert.facilityId,
          skuId: alert.skuId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch Gemini Advisory');
      }

      setExplanationData({
        plan: data.geminiPlan,
        proposedLines: data.proposedLines,
        modelNotice: data.modelNotice,
      });
    } catch (err: any) {
      console.error('Failed to explain alert:', err);
      setAdvisoryError(err?.message || 'Failed to load Gemini Advisory commentary. Please try again.');
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 text-slate-100">
      {/* Top Header Card with Sub-tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h1 className="text-lg font-bold text-white tracking-tight">
                AI Early Warning & Epidemic Forecast
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Probabilistic stockout alerts &middot; Climate-linked vector disease projections
            </p>
          </div>

          <button
            onClick={() => {
              onRefresh();
              fetchEpidemicData();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700 self-start sm:self-auto"
            title="Refresh alerts & forecasts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isEpidemicLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Stockout & Surge Alerts</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('epidemic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'epidemic'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>Epidemic Outbreak Simulator</span>
            {epidemics.some((e) => e.alertLevel === 'outbreak_critical') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* 1. STOCKOUT ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-200">No Active Stockout Alerts</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All Primary Health Centres in this district currently maintain sufficient stock above 7-day forecast demand thresholds.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const stockoutPct = Math.round(alert.stockoutProb7d * 100);

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20'
                      : 'bg-slate-900 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {isCritical ? (
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCritical ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'
                            }`}
                          >
                            {alert.severity} &middot; {alert.ruleCode}
                          </span>
                          {alert.coldChain && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-300 flex items-center gap-1">
                              <Snowflake className="w-3 h-3" />
                              2°C–8°C
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-100">
                          {alert.facilityName} &middot; <span className="text-teal-400">{alert.skuName}</span>
                        </h3>
                        <p className="text-xs text-slate-300">{alert.message}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSpeakAlert(alert)}
                      className={`p-2 rounded-xl transition shrink-0 ${
                        speakingAlertId === alert.id
                          ? 'bg-teal-500 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                      title="Listen to audio alert readout"
                    >
                      {speakingAlertId === alert.id ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Current Stock</span>
                      <span className="text-sm font-bold text-white font-mono">{alert.currentQty} units</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">7-Day Demand</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">{alert.demand7d} units</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Stockout Risk</span>
                      <span
                        className={`text-sm font-bold font-mono ${
                          stockoutPct >= 80
                            ? 'text-rose-400'
                            : stockoutPct >= 50
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {stockoutPct}%
                      </span>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center justify-between mt-3 pt-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Outbreak Mult: {alert.outbreakMultiplier}x
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExplainAlert(alert)}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition border border-teal-500/30"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>AI Advisory</span>
                      </button>

                      <button
                        onClick={() => onProposeTransfer(alert.facilityId, alert.skuId)}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <span>Dispatch Transfer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. EPIDEMIC OUTBREAK FORECAST TAB */}
      {activeTab === 'epidemic' && (
        <div className="space-y-4">
          {/* Climate Simulation Slider */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-bold text-white">Monsoon Precipitation & Transmission Simulator</span>
              </div>
              <span className="text-xs font-mono font-bold text-teal-300">
                {simulatedRainfall} mm / week
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Drag to simulate rainfall surge. The algorithmic engine dynamically recomputes vector breeding indices, transmission velocity ($R_0$), and pre-allocated essential medicine buffers.
            </p>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Low (30mm)</span>
              <input
                type="range"
                min="30"
                max="350"
                step="10"
                value={simulatedRainfall}
                onChange={(e) => handleSyncClimate(Number(e.target.value))}
                className="flex-1 accent-teal-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span className="text-xs text-rose-400 font-semibold">Flood / Surge (350mm)</span>
            </div>
          </div>

          {/* Disease Outbreak Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {epidemics.map((item) => {
              const isCritical = item.alertLevel === 'outbreak_critical';
              const isWarning = item.alertLevel === 'warning';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border space-y-3 shadow-md ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/50'
                      : isWarning
                      ? 'bg-slate-900 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-400" />
                        <h3 className="text-base font-bold text-white">{item.pathogen}</h3>
                      </div>
                      <span className="text-xs text-slate-400">{item.district}</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {item.alertLevel.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Surge Mult</span>
                      <span className="text-sm font-bold text-teal-300 font-mono">{item.surgeMultiplier}x</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">R₀ Rate</span>
                      <span className="text-sm font-bold text-white font-mono">{item.r0Value}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">14d Projected</span>
                      <span className="text-sm font-bold text-amber-300 font-mono">{item.predicted14dCases}</span>
                    </div>
                  </div>

                  {/* Pre-allocated Buffers */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Recommended Pre-Allocated Medicines
                    </span>
                    {item.recommendedBufferPreAllocation.map((rec) => (
                      <div key={rec.skuCode} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 truncate max-w-[180px]">{rec.skuName}</span>
                        <span className="font-bold font-mono text-teal-300 shrink-0">
                          +{rec.recommendedUnits} units
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AI Epidemiological Note */}
                  <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                    "{item.aiEpidemiologicalNote}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gemini Advisory Modal */}
      {selectedAlert && (
        <GeminiAdvisoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          alert={selectedAlert}
          explanationData={explanationData}
          isLoading={isExplaining}
          error={advisoryError}
        />
      )}
    </div>
  );
};
