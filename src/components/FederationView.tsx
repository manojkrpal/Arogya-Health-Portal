import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { FederationItem, FederationModelCard } from '../types/client.js';
import { AuditView } from './AuditView.js';
import {
  Globe2,
  ShieldCheck,
  Cpu,
  Lock,
  BarChart3,
  RefreshCw,
  FileCode,
  Info,
  ScrollText,
} from 'lucide-react';

interface FederationViewProps {
  initialSubTab?: 'indices' | 'model-card' | 'audit';
}

export const FederationView: React.FC<FederationViewProps> = ({ initialSubTab = 'indices' }) => {
  const { token, user } = useAuth();
  const [fedData, setFedData] = useState<FederationItem[]>([]);
  const [modelCards, setModelCards] = useState<FederationModelCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'indices' | 'model-card' | 'audit'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const canViewAudit = ['national_war_room', 'district_officer', 'brics_analyst'].includes(user?.role || '');

  useEffect(() => {
    async function fetchFederation() {
      setIsLoading(true);
      try {
        const [essRes, cardRes] = await Promise.all([
          fetch('/v1/federation/ess', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/v1/federation/model-card', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (essRes.ok) {
          const ess = await essRes.json();
          setFedData(ess.data || []);
        }
        if (cardRes.ok) {
          const cards = await cardRes.json();
          setModelCards(cards.modelCards || []);
        }
      } catch (err) {
        console.error('Failed to fetch federation indices:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFederation();
  }, [token]);

  return (
    <div className="p-3 sm:p-5 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-purple-400" />
            Global Health Federation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-national sovereign health indices & shared models
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs self-start sm:self-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('indices')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeSubTab === 'indices'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sovereign Indices
          </button>
          <button
            onClick={() => setActiveSubTab('model-card')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeSubTab === 'model-card'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model Cards
          </button>
          {canViewAudit && (
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                activeSubTab === 'audit'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Audit Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* View Content */}
      {activeSubTab === 'audit' ? (
        <div className="pt-2">
          <AuditView />
        </div>
      ) : (
        <>
          {/* Sovereign Privacy Banner */}
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">
                Aggregated Sovereign Indices
              </span>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                Privacy-preserving treaty: only high-level surplus and epidemic rates are shared.
              </p>
            </div>
          </div>

          {/* Sub-view: Indices */}
          {activeSubTab === 'indices' ? (
            <div className="space-y-3">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Loading sovereign indices from federation node...
                </div>
              ) : fedData.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No federation indices available.
                </div>
              ) : (
                fedData.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5 shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {item.countryCode}
                        </span>
                        <span className="font-bold text-slate-200">{item.tenantName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.date ? item.date.substring(0, 10) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Medicine Category:</span>{' '}
                        <strong className="text-slate-200">{item.skuName}</strong>
                        <span className="font-mono text-slate-500 ml-1">({item.skuCode})</span>
                      </div>

                      {/* Surplus band: LOW / MED / HIGH only - NEVER raw qty */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Surplus Band:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.surplusBand === 'HIGH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.surplusBand === 'MED'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.surplusBand}
                        </span>
                      </div>
                    </div>

                    {/* Demand Index and Stockout Probability visual bars */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded bg-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Predicted Demand Index</span>
                          <strong className="text-slate-200">{item.predictedDemandIndex}</strong>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, item.predictedDemandIndex * 50)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Stockout Probability (P)</span>
                          <strong className="text-rose-300">
                            {(item.stockoutProbability * 100).toFixed(0)}%
                          </strong>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, item.stockoutProbability * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Sub-view: Differential Privacy Model Cards */
            <div className="space-y-3">
              {modelCards.map((card) => (
                <div
                  key={card.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2 shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-slate-100">{card.version}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Applied: {card.applied_at ? card.applied_at.substring(0, 10) : 'Recent'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Bayesian Prior:
                    </span>
                    <span className="font-mono text-purple-300">{card.prior_name}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">{card.notes}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
