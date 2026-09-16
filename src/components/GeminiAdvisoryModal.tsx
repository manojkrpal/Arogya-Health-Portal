import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Languages,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Snowflake,
  ExternalLink,
} from 'lucide-react';
import { AlertItem, GeminiTransferPlan, ProposedTransferLine } from '../types/client.js';

interface GeminiAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertItem | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  explanationData: {
    plan: GeminiTransferPlan;
    proposedLines: ProposedTransferLine[];
    modelNotice: string;
  } | null;
  onConfirmTransfer?: (facilityId: string, skuId: string) => void;
  canProposeTransfer?: boolean;
}

export const GeminiAdvisoryModal: React.FC<GeminiAdvisoryModalProps> = ({
  isOpen,
  onClose,
  alert,
  isLoading,
  error,
  onRetry,
  explanationData,
  onConfirmTransfer,
  canProposeTransfer = true,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullScreen, onClose]);

  if (!isOpen) return null;

  const currentText = explanationData
    ? lang === 'hi'
      ? explanationData.plan.explanation_hi
      : explanationData.plan.explanation_en
    : '';

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="gemini-advisory-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        id="gemini-advisory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-modal-title"
        className={`flex flex-col bg-slate-900 border border-teal-500/30 shadow-2xl transition-all duration-200 overflow-hidden ${
          isFullScreen
            ? 'fixed inset-0 w-full h-full rounded-none border-0 z-50'
            : 'w-full max-w-3xl max-h-[90vh] rounded-2xl'
        }`}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-slate-800/90 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="gemini-modal-title"
                  className="text-sm sm:text-base font-bold text-slate-100 truncate"
                >
                  Gemini Clinical & Logistics Advisory
                </h2>
                {explanationData && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {explanationData.modelNotice} &bull; Zod Validated
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                AI reasoning with strict deterministic donor-protection safeguards
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Toggle */}
            <button
              id="gemini-lang-toggle-btn"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-600/50"
              title="Toggle Language"
            >
              <Languages className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">
                {lang === 'en' ? 'हिंदी' : 'English'}
              </span>
            </button>

            {/* Copy Button */}
            {explanationData && (
              <button
                id="gemini-copy-btn"
                onClick={handleCopy}
                className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-600/50"
                title={copied ? 'Copied to clipboard' : 'Copy advisory commentary'}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              id="gemini-fullscreen-toggle-btn"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-600/50"
              title={isFullScreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4 text-teal-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Close Button */}
            <button
              id="gemini-close-modal-btn"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-700/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 hover:border-rose-500/30 transition border border-slate-600/50"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-200">
          {/* Target Facility & SKU Context Banner */}
          {alert && (
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {alert.ruleCode} &bull; {alert.severity}
                  </span>
                  {alert.coldChain && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Snowflake className="w-3 h-3 text-blue-400" /> Cold Chain 2-8°C
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{alert.district} District</span>
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  {alert.facilityName} &mdash;{' '}
                  <span className="text-teal-300">{alert.skuName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-right shrink-0">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">On-Hand</span>
                  <span className="font-bold text-rose-400">{alert.currentQty} units</span>
                </div>
                <div className="border-l border-slate-700 pl-3">
                  <span className="text-[10px] text-slate-400 block uppercase">7-Day Demand</span>
                  <span className="font-semibold text-slate-300">{alert.demand7d} units</span>
                </div>
                <div className="border-l border-slate-700 pl-3">
                  <span className="text-[10px] text-slate-400 block uppercase">Stockout Prob</span>
                  <span className="font-bold text-amber-400">
                    {Math.round(alert.stockoutProb7d * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Analyzing Stockout Dynamics & Generating Advisory...
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Running multi-PHC inventory graph optimization and querying Gemini API for bilingual clinical decision support.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-sm font-semibold">Unable to complete advisory call</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Advisory
                </button>
              )}
            </div>
          )}

          {/* Successful Content */}
          {!isLoading && explanationData && (
            <div className={`space-y-4 ${isFullScreen ? 'max-w-5xl mx-auto py-2' : ''}`}>
              {/* Clinical Commentary Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-800/80 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'hi' ? 'चिकित्सकीय और रसद सलाह' : 'Clinical & Logistics Commentary'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Confidence:{' '}
                      <strong className="text-teal-300">
                        {Math.round(explanationData.plan.confidence * 100)}%
                      </strong>
                    </span>
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-400 rounded-full"
                        style={{ width: `${Math.round(explanationData.plan.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-lg bg-slate-900/90 border border-slate-700/70 text-sm leading-relaxed text-slate-100 font-normal">
                  {currentText}
                </div>
              </div>

              {/* Deterministic Optimizer Transfer Routing Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-teal-400" />
                    Deterministic Optimizer Routing Plan
                  </h4>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Strict Donor 7-Day Cover Guarantee Enforced
                  </span>
                </div>

                {explanationData.proposedLines.length > 0 ? (
                  <div className="space-y-2">
                    {explanationData.proposedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-3 sm:p-4 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-teal-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="font-semibold text-teal-300">
                              {line.fromFacilityName}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold text-slate-100">
                              {line.toFacilityName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>{line.distanceKm} km road distance</span>
                            <span>&bull;</span>
                            <span>~{line.etaHours}h road transit</span>
                          </div>
                        </div>

                        <div className="sm:text-right space-y-1 bg-slate-900/60 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
                          <div className="text-base font-bold text-emerald-400">
                            +{line.qty} units
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Donor retains {line.donorRemainingQty} (required reserve &ge;{' '}
                            {line.donorRequiredCover})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-relaxed">
                    No donor facility within this district has sufficient surplus to spare stock without violating its own mandatory 7-day reserve cover. Rebalancing requires escalation to National / State Depot.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {isFullScreen ? 'Press Esc to exit full screen' : 'Press Esc to close'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
            >
              Close
            </button>

            {!isLoading &&
              explanationData &&
              canProposeTransfer &&
              alert &&
              onConfirmTransfer && (
                <button
                  id="gemini-confirm-transfer-btn"
                  onClick={() => {
                    onConfirmTransfer(alert.facilityId, alert.skuId);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow shadow-teal-500/25"
                >
                  Confirm & Propose Transfer Order
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
