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
} from 'lucide-react';
import { GeminiAdvisoryModal } from './GeminiAdvisoryModal.js';

interface TransfersViewProps {
  transfers: TransferOrder[];
  facilities: FacilitySnapshot[];
  skus: SkuItem[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  transfers,
  facilities,
  skus,
  onRefresh,
  isLoading,
}) => {
  const { user, token } = useAuth();
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
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-teal-400" />
            Cross-Facility Medicine Transfers
          </h2>
          <p className="text-xs text-slate-400">
            Human-in-the-loop: orders require explicit officer approval before stock moves
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPropose && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Propose Transfer
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
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
        <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No Transfer Orders Logged</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When clinics fall below 7-day stockout risk thresholds, use the optimizer to propose inter-PHC replenishments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((order) => {
            const isProposed = order.status === 'proposed';
            const isApproved = order.status === 'approved';
            const isRejected = order.status === 'rejected';

            return (
              <div
                key={order.id}
                className={`p-4 rounded-xl border transition shadow-lg ${
                  isProposed
                    ? 'bg-slate-800/90 border-teal-500/40'
                    : isApproved
                    ? 'bg-slate-900/70 border-emerald-500/30'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {order.skuCode}
                      </span>
                      {order.coldChain && (
                        <span className="text-[10px] text-blue-300 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <Snowflake className="w-3 h-3 text-blue-400" /> Cold-Chain 2-8°C
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">{order.skuName}</h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isProposed
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : isApproved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}
                  >
                    {isProposed ? (
                      <Clock className="w-3 h-3" />
                    ) : isApproved ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {order.status}
                  </span>
                </div>

                {/* Route: From -> To */}
                <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block">Donor Facility</span>
                    <strong className="text-slate-200">{order.fromFacilityName}</strong>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      On-hand: {order.donorCurrentQty} &bull; 7d Demand: {order.donorDemand7d}
                    </div>
                  </div>

                  <div className="px-2 text-center">
                    <ArrowLeftRight className="w-4 h-4 text-teal-400 mx-auto" />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {order.distanceKm} km (~{order.etaHours}h)
                    </span>
                  </div>

                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-slate-400 block">Recipient Facility</span>
                    <strong className="text-teal-300">{order.toFacilityName}</strong>
                    <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
                      +{order.qty} {order.unit}
                    </div>
                  </div>
                </div>

                {/* Donor cover verification banner */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    Donor retains &ge; 7 days of forecast demand
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                {/* Action Controls & Gemini Advisory */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => handleExplainOrder(order)}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Gemini Advisory (EN/HI)
                  </button>

                  {isProposed && canApprove && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleDecide(order.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Reject
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleDecide(order.id, 'approve')}
                        className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow shadow-teal-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Execute Stock Transfer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
