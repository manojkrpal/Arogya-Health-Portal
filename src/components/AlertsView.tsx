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
  const { user, token } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<{
    plan: GeminiTransferPlan;
    proposedLines: ProposedTransferLine[];
    modelNotice: string;
  } | null>(null);

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

      {/* Gemini Structured Explanation Modal (Expandable to full size) */}
      <GeminiAdvisoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAlert(null);
        }}
        alert={selectedAlert}
        isLoading={isExplaining}
        error={advisoryError}
        explanationData={explanationData}
        onRetry={() => selectedAlert && handleExplainAlert(selectedAlert)}
        onConfirmTransfer={onProposeTransfer}
        canProposeTransfer={user?.role !== 'phc_nurse'}
      />
    </div>
  );
};
