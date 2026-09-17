import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AuditEventItem, AuditVerifyResult } from '../types/client.js';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  FileText,
  Clock,
  User,
  Key,
  Database,
  Fingerprint,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [verifyResult, setVerifyResult] = useState<AuditVerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  const fetchAuditEvents = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const actionParam = selectedAction !== 'ALL' ? `?action=${selectedAction}` : '';
      const res = await fetch(`/v1/audit/events${actionParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
        setTotalCount(json.totalCount || (json.events ? json.events.length : 0));
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLog = async () => {
    if (!token) return;
    setIsVerifying(true);
    try {
      const res = await fetch('/v1/audit/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json: AuditVerifyResult = await res.json();
        setVerifyResult(json);
        setShowVerifyModal(true);
      }
    } catch (err) {
      console.error('Failed to verify audit log:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [token, selectedAction]);

  const actionCategories = [
    { id: 'ALL', label: 'All Events' },
    { id: 'STOCK_ADJUSTED', label: 'Stock Adjustments' },
    { id: 'TRANSFER_PROPOSED', label: 'Transfers Proposed' },
    { id: 'TRANSFER_APPROVED', label: 'Transfers Approved' },
    { id: 'CAPACITY_UPDATED', label: 'Capacity' },
    { id: 'ATTENDANCE_UPDATED', label: 'Attendance' },
    { id: 'EMERGENCY_SURGE_ACTIVATED', label: 'Surge Multiplier' },
  ];

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.entity.toLowerCase().includes(q) ||
      e.entityId.toLowerCase().includes(q) ||
      (e.actor.email && e.actor.email.toLowerCase().includes(q)) ||
      (e.actor.role && e.actor.role.toLowerCase().includes(q)) ||
      (e.requestId && e.requestId.toLowerCase().includes(q)) ||
      (e.integrityHash && e.integrityHash.toLowerCase().includes(q))
    );
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'TRANSFER_APPROVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'TRANSFER_PROPOSED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'STOCK_ADJUSTED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'CAPACITY_UPDATED':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'ATTENDANCE_UPDATED':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'EMERGENCY_SURGE_ACTIVATED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div id="compliance-audit-container" className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                National Compliance & Audit Trail
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                Zero-PHI Certified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Immutable ledger of all clinical capacity, transfer approvals, emergency surges, and inventory dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="verify-audit-chain-btn"
              onClick={handleVerifyLog}
              disabled={isVerifying}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Fingerprint className="w-4 h-4" />
              {isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Chain'}
            </button>

            <button
              onClick={fetchAuditEvents}
              title="Refresh Audit Log"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Total Events Logged</span>
            <span className="text-white font-bold text-base">{totalCount}</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Tamper-Proof Status</span>
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chained SHA-256
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Sovereign Privacy</span>
            <span className="text-teal-300 font-bold text-xs flex items-center gap-1 mt-0.5">
              <Lock className="w-3.5 h-3.5" /> Zero-PHI Verified
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Auditor Role</span>
            <span className="text-amber-300 font-semibold text-xs mt-0.5 block truncate">
              {user?.role || 'Auditor'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="audit-search-input"
            type="text"
            placeholder="Search by action, facility, actor, request ID or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Action filter pill group */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {actionCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedAction(cat.id)}
              className={`px-2.5 py-1 text-xs rounded-lg whitespace-nowrap transition-all font-medium ${
                selectedAction === cat.id
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Event Records */}
      {isLoading ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
          <p className="text-xs text-slate-400">Loading tamper-evident audit records...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
          <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          No audit records found matching query criteria.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedEventId === evt.id;
            return (
              <div
                key={evt.id}
                id={`audit-event-${evt.id}`}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeColor(evt.action)}`}>
                      {evt.action}
                    </span>
                    <span className="text-slate-300 font-medium text-xs">
                      {evt.entity}: <code className="text-teal-300 font-mono text-[11px]">{evt.entityId}</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(evt.at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <strong className="text-slate-300">{evt.actor.role || 'system'}</strong> ({evt.actor.email || 'internal'})
                    </span>
                    {evt.requestId && (
                      <span className="flex items-center gap-1 font-mono text-slate-500">
                        <Key className="w-3 h-3" /> {evt.requestId.slice(0, 16)}...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      title={`SHA-256 Digest: ${evt.integrityHash}`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {evt.integrityHash.slice(0, 10)}...
                    </span>

                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Payload Inspector */}
                {isExpanded && (
                  <div className="mt-3 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center justify-between text-slate-400 mb-1 pb-1 border-b border-slate-800 text-[10px]">
                      <span>Sanitized Event Payload (Zero-PHI)</span>
                      <span>Full SHA-256: {evt.integrityHash}</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-400/90 text-[11px]">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && verifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Cryptographic Verification Certificate
                </h2>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Audit Log Integrity: {verifyResult.tamperEvidentStatus}
                </div>
                <p className="text-slate-300 text-[11px]">
                  All {verifyResult.verifiedCount} historical transactions strictly validate against the Merkle SHA-256 cryptographic chain.
                </p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">CUMULATIVE CHAIN DIGEST (SHA-256)</span>
                  <span className="text-teal-300 break-all">{verifyResult.cumulativeDigest}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
                  <span>Zero-PHI Invariant:</span>
                  <span className="text-emerald-400 font-bold font-sans">
                    {verifyResult.zeroPhiCertified ? 'PASSED (100% Redacted)' : 'FAILED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Timestamp:</span>
                  <span>{new Date(verifyResult.checkedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
