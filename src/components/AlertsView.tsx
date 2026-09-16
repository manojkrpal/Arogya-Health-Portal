import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AlertItem, GeminiTransferPlan, ProposedTransferLine } from '../types/client.js';
import {
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Snowflake,
  RefreshCw,
  Languages,
} from 'lucide-react';

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
  const { user, token, lang, setLang } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationData, setExplanationData] = useState<{
    plan: GeminiTransferPlan;
    proposedLines: ProposedTransferLine[];
    modelNotice: string;
  } | null>(null);

  // Trigger Gemini structured explanation & deterministic optimization
  const handleExplainAlert = async (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsExplaining(true);
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

      if (res.ok) {
        const data = await res.json();
        setExplanationData({
          plan: data.geminiPlan,
          proposedLines: data.proposedLines,
          modelNotice: data.modelNotice,
        });
      }
    } catch (err) {
      console.error('Failed to explain alert:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            7-Day Clinical Stockout & Surge Alerts
          </h2>
          <p className="text-xs text-slate-400">
            Automated alerts evaluated against forecast demand & surge multipliers
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          title="Refresh alerts"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
        </button>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">No Active Stockout Alerts</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All Primary Health Centres in this district currently maintain sufficient stock above 7-day forecast demand thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition shadow-lg ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-amber-950/20 border-amber-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {isCritical ? (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-100">
                          {alert.facilityName}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {alert.ruleCode}
                        </span>
                        {alert.coldChain && (
                          <span className="text-[10px] text-blue-300 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            <Snowflake className="w-3 h-3 text-blue-400" /> Cold-Chain
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-medium">{alert.message}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                {/* Stock telemetry summary */}
                <div className="mt-3 pt-2.5 border-t border-slate-700/40 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Current Stock</span>
                    <span className="font-bold text-slate-200">{alert.currentQty}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">7d Demand</span>
                    <span className="font-bold text-slate-200">~{Math.round(alert.demand7d)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Stockout Prob</span>
                    <span className="font-bold text-rose-400">
                      {(alert.stockoutProb7d * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Action: AI Explain & Propose Transfer */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {alert.modelNotice}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExplainAlert(alert)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      Gemini Advisory (EN/HI)
                    </button>

                    {user?.role !== 'phc_nurse' && (
                      <button
                        onClick={() => onProposeTransfer(alert.facilityId, alert.skuId)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow shadow-teal-500/20"
                      >
                        Propose Transfer
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gemini Structured Explanation Modal / Card */}
      {(isExplaining || explanationData) && selectedAlert && (
        <div className="p-4 rounded-2xl bg-slate-800/95 border border-teal-500/40 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Gemini Clinical & Logistics Commentary (Advisory Only)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
              >
                <Languages className="w-3 h-3 text-teal-400" />
                {lang === 'en' ? 'हिंदी में पढ़ें' : 'Read in English'}
              </button>
              <button
                onClick={() => {
                  setExplanationData(null);
                  setSelectedAlert(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {isExplaining ? (
            <div className="py-6 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300">
                Running deterministic optimizer & querying Gemini 3.8 Flash...
              </p>
            </div>
          ) : explanationData ? (
            <div className="space-y-3">
              {/* English or Hindi advisory text */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs leading-relaxed text-slate-200">
                {lang === 'hi'
                  ? explanationData.plan.explanation_hi
                  : explanationData.plan.explanation_en}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Confidence:{' '}
                  <strong className="text-teal-300">
                    {Math.round(explanationData.plan.confidence * 100)}%
                  </strong>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {explanationData.modelNotice} &bull; Zod Validated
                </span>
              </div>

              {/* Proposed Allocation Lines */}
              {explanationData.proposedLines.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Deterministic Optimizer Routing (Donor Cover Verified):
                  </div>
                  {explanationData.proposedLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="text-teal-300 font-semibold">
                          {line.fromFacilityName}
                        </span>
                        <span className="text-slate-400 mx-1.5">&rarr;</span>
                        <span className="text-slate-200 font-semibold">
                          {line.toFacilityName}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {line.distanceKm} km &bull; ~{line.etaHours}h road transit
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400">
                          +{line.qty} {line.skuCode}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Donor keeps {line.donorRemainingQty} (req &ge; {line.donorRequiredCover})
                        </div>
                      </div>
                    </div>
                  ))}

                  {user?.role !== 'phc_nurse' && (
                    <button
                      onClick={() => {
                        onProposeTransfer(selectedAlert.facilityId, selectedAlert.skuId);
                        setExplanationData(null);
                        setSelectedAlert(null);
                      }}
                      className="w-full mt-2 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
                    >
                      Confirm and Propose This Transfer
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  No single donor facility in this district can spare stock without violating the 7-day donor cover rule. Escalation to National War Room recommended.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
