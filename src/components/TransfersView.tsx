import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  TransferOrder,
  FacilitySnapshot,
  SkuItem,
  AlertItem,
  GeminiTransferPlan,
  ProposedTransferLine,
} from '../types/client.js';
import { ColdChainView } from './ColdChainView.js';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Snowflake,
  RefreshCw,
  Plus,
  Truck,
  MapPin,
  Sparkles,
  Thermometer,
} from 'lucide-react';
import { GeminiAdvisoryModal } from './GeminiAdvisoryModal.js';

interface TransfersViewProps {
  transfers: TransferOrder[];
  facilities: FacilitySnapshot[];
  skus: SkuItem[];
  onRefresh: () => void;
  isLoading: boolean;
  initialSubTab?: 'transfers' | 'coldchain';
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  transfers,
  facilities,
  skus,
  onRefresh,
  isLoading,
  initialSubTab = 'transfers',
}) => {
  const { user, token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'transfers' | 'coldchain'>(initialSubTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Gemini Advisory Modal state
  const [isAdvisoryOpen, setIsAdvisoryOpen] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [advisoryAlert, setAdvisoryAlert] = useState<AlertItem | null>(null);
  const [explanationData, setExplanationData] = useState<{
    plan: GeminiTransferPlan;
    proposedLines: ProposedTransferLine[];
    modelNotice: string;
  } | null>(null);

  // Transfer Proposal modal state
  const [showModal, setShowModal] = useState(false);
  const [recipientFacilityId, setRecipientFacilityId] = useState(facilities[0]?.id || '');
  const [skuId, setSkuId] = useState(skus[0]?.id || '');
  const [qty, setQty] = useState(25);

  const canApprove =
    user?.role === 'district_officer' || user?.role === 'national_war_room';
  const canPropose =
    user?.role === 'district_officer' ||
    user?.role === 'national_war_room' ||
    user?.role === 'phc_nurse';

  const handleExplainOrder = async (order: TransferOrder) => {
    setIsAdvisoryOpen(true);
    setIsExplaining(true);
    setAdvisoryError(null);
    setExplanationData(null);

    const syntheticAlert: AlertItem = {
      id: order.id,
      facilityId: order.toFacilityId,
      facilityName: order.toFacilityName,
      district: 'Jurisdiction',
      skuId: order.skuId,
      skuCode: order.skuCode,
      skuName: order.skuName,
      coldChain: order.coldChain,
      severity: 'warn',
      ruleCode: 'PROPOSED_TRANSFER',
      message: `Inter-facility stock transfer proposed: ${order.qty} ${order.unit} from ${order.fromFacilityName} to ${order.toFacilityName}`,
      open: true,
      currentQty: 0,
      demand7d: order.donorDemand7d,
      stockoutProb7d: 0.85,
      outbreakMultiplier: 1.0,
      modelNotice: 'Gemini Advisory',
      createdAt: order.createdAt,
    };
    setAdvisoryAlert(syntheticAlert);

    try {
      const res = await fetch('/v1/ai/explain-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: order.toFacilityId,
          skuId: order.skuId,
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
      setAdvisoryError(err?.message || 'Failed to generate advisory');
    } finally {
      setIsExplaining(false);
    }
  };

  // Handle Approve (calls atomic transaction) or Reject
  const handleDecide = async (orderId: string, action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/v1/transfers/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to process transfer order');
      }

      setSuccessMsg(
        action === 'approve'
          ? `Transfer approved! Atomic PostgreSQL transaction locked donor lots, verified 7-day cover, and decremented inventory.`
          : 'Transfer order marked as rejected.'
      );
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Propose
  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/v1/transfers/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientFacilityId,
          skuId,
          qty: Number(qty),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to propose transfer');
      }

      setSuccessMsg(`Proposed ${data.proposals?.length || 1} transfer orders. Ready for officer review.`);
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-4xl mx-auto space-y-4 pb-24">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-400" />
            Logistics & Redistribution
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Inter-district stock rebalancing, IoT cold-chain telemetry, and autonomous drone dispatch
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs self-start sm:self-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('transfers')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              activeSubTab === 'transfers'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfers</span>
            {transfers.filter((t) => t.status === 'proposed').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {transfers.filter((t) => t.status === 'proposed').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('coldchain')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
              activeSubTab === 'coldchain'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Cold-Chain IoT</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'coldchain' ? (
        <ColdChainView />
      ) : (
        <>
          {/* Action row for Transfers */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-slate-400">
              {transfers.length} transfer orders &middot; Auto-optimizing for &ge; 7-day donor safety buffer
            </span>
            <div className="flex items-center gap-2">
              {canPropose && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Transfer</span>
                </button>
              )}
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
                title="Refresh transfers"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {actionError}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Transfer Orders List */}
          {transfers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
              <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No Transfers Needed</h3>
              <p className="text-xs text-slate-500 mt-1">
                All PHCs currently maintain safe medicine buffer stock.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((order) => {
                const isProposed = order.status === 'proposed';
                const isApproved = order.status === 'approved';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isProposed
                        ? 'bg-slate-900/95 border-amber-500/40 shadow-md'
                        : isApproved
                        ? 'bg-slate-900/90 border-emerald-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            order.coldChain
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          }`}
                        >
                          {order.coldChain ? <Snowflake className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{order.skuName}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-300 font-medium truncate">{order.fromFacilityName}</span>
                            <ArrowLeftRight className="w-3 h-3 text-teal-400 shrink-0" />
                            <span className="text-teal-300 font-medium truncate">{order.toFacilityName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Status Badge */}
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="text-lg font-bold text-white">
                          +{order.qty} <span className="text-xs text-slate-400">{order.unit}</span>
                        </div>
                        <span
                          className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isProposed
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : isApproved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Quick 1-Tap Action Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleExplainOrder(order)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>AI Reason</span>
                      </button>

                      {isProposed && canApprove && (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleDecide(order.id, 'reject')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                          >
                            Reject
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleDecide(order.id, 'approve')}
                            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Transfer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Gemini Advisory Modal (Expandable to Full Screen) */}
      <GeminiAdvisoryModal
        isOpen={isAdvisoryOpen}
        onClose={() => {
          setIsAdvisoryOpen(false);
          setAdvisoryAlert(null);
        }}
        alert={advisoryAlert}
        isLoading={isExplaining}
        error={advisoryError}
        explanationData={explanationData}
        onRetry={() => {
          const currentOrder = transfers.find((t) => t.id === advisoryAlert?.id);
          if (currentOrder) handleExplainOrder(currentOrder);
        }}
        canProposeTransfer={false}
      />

      {/* Propose Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-400" />
                Propose Inter-Facility Transfer
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Recipient Facility (In Need)
                </label>
                <select
                  value={recipientFacilityId}
                  onChange={(e) => setRecipientFacilityId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.level}, {f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Medicine SKU</label>
                <select
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {s.coldChain ? '❄️ Cold-chain' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Desired Replenishment Quantity
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The optimizer will identify donor facilities within the district that maintain &ge; 7 days buffer post-transfer.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {isSubmitting ? 'Optimizing...' : 'Generate Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
