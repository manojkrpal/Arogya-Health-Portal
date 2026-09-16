import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  FacilitySnapshot,
  StockItem,
  StockLot,
} from '../types/client.js';
import {
  X,
  Bed,
  Users,
  Snowflake,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  ArrowLeftRight,
  TrendingDown,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';

interface FacilityDrawerProps {
  facility: FacilitySnapshot | null;
  onClose: () => void;
  onOpenTransferModal: (facilityId: string, skuId: string) => void;
  onRefreshMap: () => void;
}

export const FacilityDrawer: React.FC<FacilityDrawerProps> = ({
  facility,
  onClose,
  onOpenTransferModal,
  onRefreshMap,
}) => {
  const { user, token } = useAuth();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<StockLot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingSkuId, setSavingSkuId] = useState<string | null>(null);
  const [saveSuccessSkuId, setSaveSuccessSkuId] = useState<string | null>(null);

  // Bed and attendance quick editing state for Nurse
  const [bedsAvailable, setBedsAvailable] = useState<number>(0);
  const [nursesPresent, setNursesPresent] = useState<number>(0);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState<boolean>(false);

  const canEdit =
    user?.role === 'district_officer' ||
    user?.role === 'national_war_room' ||
    (user?.role === 'phc_nurse' && user?.facilityId === facility?.id);

  // Fetch full details for facility
  useEffect(() => {
    if (!facility) return;
    setBedsAvailable(facility.capacity.bedsAvailable);
    setNursesPresent(facility.attendance.nursesPresent);

    async function fetchFacilityData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/v1/facilities/${facility?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStock(data.stock || []);
          setLots(data.lots || []);
        }
      } catch (err) {
        console.error('Failed to fetch facility stock:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFacilityData();
  }, [facility?.id, token]);

  if (!facility) return null;

  // Handle nurse rapid stock stepper (+ / -) with instant auto-save
  const handleAdjustStock = async (skuId: string, delta: number) => {
    const targetItem = stock.find((s) => s.skuId === skuId);
    if (!targetItem) return;

    const newQty = Math.max(0, targetItem.qty + delta);

    // Optimistic UI update
    setStock((prev) =>
      prev.map((item) => (item.skuId === skuId ? { ...item, qty: newQty } : item))
    );
    setSavingSkuId(skuId);

    try {
      const res = await fetch('/v1/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: facility.id,
          skuId,
          newQty,
        }),
      });

      if (res.ok) {
        setSaveSuccessSkuId(skuId);
        setTimeout(() => setSaveSuccessSkuId(null), 1500);
        onRefreshMap();
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setSavingSkuId(null);
    }
  };

  // Quick save for bed count
  const handleSaveCapacity = async () => {
    setIsUpdatingMeta(true);
    try {
      await fetch('/v1/capacity', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: facility.id,
          bedsAvailable,
          bedsTotal: facility.capacity.bedsTotal,
        }),
      });
      onRefreshMap();
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  // Quick save for nurse count
  const handleSaveAttendance = async () => {
    setIsUpdatingMeta(true);
    try {
      await fetch('/v1/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: facility.id,
          nursesPresent,
          doctorsPresent: facility.attendance.doctorsPresent,
          anmsPresent: facility.attendance.anmsPresent,
          rosterNurses: facility.attendance.rosterNurses,
        }),
      });
      onRefreshMap();
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div
        className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {facility.level}
              </span>
              {facility.coldChainCapable ? (
                <span className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/20">
                  <Snowflake className="w-3 h-3 text-blue-400" /> Cold-Chain Certified
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  No Cold Storage
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">{facility.name}</h2>
            <p className="text-xs text-slate-400">
              {facility.district} District &bull; {facility.code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {/* Real-time Capacity & Attendance quick tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Bed capacity tile */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-medium">
                  <Bed className="w-3.5 h-3.5 text-teal-400" /> Available Beds
                </span>
                <span className="text-[10px] text-slate-500">
                  Total: {facility.capacity.bedsTotal}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-bold text-slate-100">{bedsAvailable}</span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setBedsAvailable((b) => Math.max(0, b - 1));
                        handleSaveCapacity();
                      }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setBedsAvailable((b) => Math.min(facility.capacity.bedsTotal, b + 1));
                        handleSaveCapacity();
                      }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance tile (Zero PHI, Counts only) */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-blue-400" /> Nurses on Duty
                </span>
                <span className="text-[10px] text-slate-500">
                  Roster: {facility.attendance.rosterNurses}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-bold text-slate-100">{nursesPresent}</span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setNursesPresent((n) => Math.max(0, n - 1));
                        handleSaveAttendance();
                      }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setNursesPresent((n) => n + 1);
                        handleSaveAttendance();
                      }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Medicine Stock & 7-Day Outbreak Indicator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Essential Medicine Inventory
                </h3>
                <p className="text-[11px] text-slate-400">
                  Live on-hand vs. 7-day forecast demand
                </p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                model: stub
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Querying PostgreSQL stock records...
              </div>
            ) : (
              <div className="space-y-2">
                {stock.map((item) => {
                  const isHighRisk = item.stockoutProb7d > 0.4 || item.qty < item.demand7d;
                  const isModerateRisk = item.stockoutProb7d > 0.15;

                  return (
                    <div
                      key={item.skuId}
                      className={`p-3 rounded-xl border transition ${
                        isHighRisk
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : isModerateRisk
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-100">
                              {item.name}
                            </span>
                            {item.coldChain && (
                              <span
                                title="Cold Chain Required"
                                className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] flex items-center gap-0.5"
                              >
                                <Snowflake className="w-2.5 h-2.5" /> 2-8°C
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Code: <span className="font-mono">{item.code}</span> &bull; {item.unit}
                          </div>
                        </div>

                        {/* Stockout Risk Indicator Badge */}
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHighRisk
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isModerateRisk
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isHighRisk && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                            {Math.round(item.stockoutProb7d * 100)}% 7d Risk
                          </span>
                        </div>
                      </div>

                      {/* Stock on Hand & Steppers */}
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">Current On-Hand</div>
                          <div className="text-base font-bold text-slate-100 flex items-center gap-1">
                            {item.qty}
                            <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-[10px] text-slate-400">7d Demand</div>
                          <div className="text-xs font-semibold text-slate-300">
                            ~{Math.round(item.demand7d)} {item.unit}
                          </div>
                        </div>

                        {/* Primary Action: Nurse Large Steppers with instant auto-save */}
                        {canEdit ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAdjustStock(item.skuId, -5)}
                              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-base transition shadow"
                              title="Decrease 5 units"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleAdjustStock(item.skuId, 5)}
                              className="w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white flex items-center justify-center font-bold text-base transition shadow shadow-teal-500/20"
                              title="Increase 5 units"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            {saveSuccessSkuId === item.skuId && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 ml-1">
                                <Check className="w-3 h-3" /> Saved
                              </span>
                            )}
                          </div>
                        ) : isHighRisk ? (
                          /* Non-nurse / Officer 1-tap Propose Transfer button */
                          <button
                            onClick={() => onOpenTransferModal(facility.id, item.skuId)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow shadow-teal-500/20"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Propose Transfer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Physical Lots (FIFO Expiry Verification) */}
          {lots.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                Active Physical Lots (FIFO Expiry Enforcement)
              </h4>
              <div className="space-y-1 text-xs">
                {lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-none text-[11px]"
                  >
                    <span className="font-mono text-slate-300">{lot.skuCode}</span>
                    <span className="text-slate-400">{lot.qty} units</span>
                    <span className="text-amber-300/80 font-mono text-[10px]">
                      Exp: {lot.expiresOn ? lot.expiresOn.substring(0, 10) : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
