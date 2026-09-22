import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { FacilitySnapshot, StockItem, StockLot } from '../types/client.js';
import { VoiceNurseAssistantModal } from './VoiceNurseAssistantModal.js';
import { MultimodalTriageModal } from './MultimodalTriageModal.js';
import {
  Building2,
  Bed,
  Users,
  Snowflake,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  RefreshCw,
  Mic,
  Camera,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Thermometer,
  Calendar,
  Layers,
  HeartPulse,
  Send,
  X,
} from 'lucide-react';

interface NurseFacilityViewProps {
  facilities: FacilitySnapshot[];
  onRefresh: () => void;
  onNavigateToTab: (tab: any) => void;
  onProposeTransfer: (facilityId: string, skuId: string) => void;
}

export const NurseFacilityView: React.FC<NurseFacilityViewProps> = ({
  facilities,
  onRefresh,
  onNavigateToTab,
  onProposeTransfer,
}) => {
  const { user, token, t } = useAuth();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<StockLot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingSkuId, setSavingSkuId] = useState<string | null>(null);
  const [savedSkuId, setSavedSkuId] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'cold_chain'>('all');

  // Ward capacity state
  const [bedsOccupied, setBedsOccupied] = useState<number>(0);
  const [bedsTotal, setBedsTotal] = useState<number>(10);
  const [icuOccupied, setIcuOccupied] = useState<number>(0);
  const [icuTotal, setIcuTotal] = useState<number>(2);
  const [nursesPresent, setNursesPresent] = useState<number>(1);
  const [doctorsPresent, setDoctorsPresent] = useState<number>(1);
  const [anmsPresent, setAnmsPresent] = useState<number>(1);
  const [oxygenCylinders, setOxygenCylinders] = useState<number>(4);
  const [dailyAttendance, setDailyAttendance] = useState<number>(0);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState<boolean>(false);
  const [metaSaved, setMetaSaved] = useState<boolean>(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState<boolean>(false);

  // Active facility resolution state
  const [activeFacilityId, setActiveFacilityId] = useState<string>(
    user?.facilityId || (facilities[0]?.id) || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  );
  const [loadedFacility, setLoadedFacility] = useState<FacilitySnapshot | null>(null);

  // Sync active facility if user.facilityId or facilities change
  useEffect(() => {
    if (user?.facilityId) {
      setActiveFacilityId(user.facilityId);
    } else if (facilities.length > 0 && !facilities.some((f) => f.id === activeFacilityId)) {
      setActiveFacilityId(facilities[0].id);
    }
  }, [user?.facilityId, facilities, activeFacilityId]);

  // Find nurse's assigned facility with rich fallback
  const assignedFacility: FacilitySnapshot =
    facilities.find((f) => f.id === activeFacilityId) ||
    loadedFacility || {
      id: activeFacilityId || user?.facilityId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      code: 'PHC-SHIRUR',
      name: user?.facilityName || 'Shirur Primary Health Centre',
      level: 'PHC',
      district: 'Pune Rural',
      lat: 18.8288,
      lng: 74.3789,
      coldChainCapable: true,
      tenantId: user?.tenantId || '11111111-1111-1111-1111-111111111111',
      tenantName: user?.tenantName || 'Pune Rural District',
      countryCode: user?.countryCode || 'IN',
      status: 'healthy',
      capacity: {
        bedsTotal: bedsTotal,
        bedsAvailable: Math.max(0, bedsTotal - bedsOccupied),
        bedsOccupied: bedsOccupied,
        icuTotal: icuTotal,
        icuAvailable: Math.max(0, icuTotal - icuOccupied),
        icuOccupied: icuOccupied,
        oxygenCylinders: oxygenCylinders,
      },
      attendance: {
        nursesPresent: nursesPresent,
        doctorsPresent: doctorsPresent,
        anmsPresent: anmsPresent,
        rosterNurses: 2,
        opdCount: dailyAttendance,
      },
      risk: {
        criticalCount: 0,
        warnCount: 0,
        maxStockoutProb: 0,
        highestRiskSku: null,
      },
    };

  const [isRestocking, setIsRestocking] = useState<boolean>(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState<boolean>(false);

  const fetchStockData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const targetId = activeFacilityId || user?.facilityId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const res = await fetch(`/v1/facilities/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.facility) {
          setLoadedFacility(data.facility);
          const cap = data.facility.capacity;
          const att = data.facility.attendance;
          if (cap) {
            setBedsTotal(cap.bedsTotal ?? 10);
            setBedsOccupied(cap.bedsOccupied !== undefined ? cap.bedsOccupied : Math.max(0, (cap.bedsTotal ?? 10) - (cap.bedsAvailable ?? 6)));
            setIcuTotal(cap.icuTotal ?? 2);
            setIcuOccupied(cap.icuOccupied !== undefined ? cap.icuOccupied : Math.max(0, (cap.icuTotal ?? 2) - (cap.icuAvailable ?? 1)));
            setOxygenCylinders(cap.oxygenCylinders ?? 4);
          }
          if (att) {
            setNursesPresent(att.nursesPresent ?? 1);
            setDoctorsPresent(att.doctorsPresent ?? 1);
            setAnmsPresent(att.anmsPresent ?? 1);
            setDailyAttendance(att.opdCount !== undefined ? att.opdCount : (att.dailyAttendance ?? 0));
          }
        }

        // Normalize stock items so both frontend and backend naming match 100%
        const rawStock = data.stock || [];
        const normalizedStock: StockItem[] = rawStock.map((s: any) => {
          const qty = Number(s.quantity !== undefined ? s.quantity : (s.qty !== undefined ? s.qty : 0));
          const reorder = Number(s.safetyStockThreshold !== undefined ? s.safetyStockThreshold : (s.reorderPoint !== undefined ? s.reorderPoint : 50));
          const demand = Number(s.demand7d ?? 14);
          const burn = Number(s.dailyBurnRate ?? (demand > 0 ? Math.round((demand / 7) * 10) / 10 : 2));
          const daysSupply = Number(s.daysOfSupplyRemaining ?? (burn > 0 ? Math.round(qty / burn) : (qty > 0 ? 30 : 0)));
          const isCritical = Boolean(s.isCriticalStockout !== undefined ? s.isCriticalStockout : (Number(s.stockoutProb7d ?? 0) >= 0.6 || qty < reorder * 0.5));

          return {
            ...s,
            skuId: s.skuId || s.id,
            skuCode: s.skuCode || s.code || 'MED',
            skuName: s.skuName || s.name || 'Essential Medicine',
            code: s.code || s.skuCode || 'MED',
            name: s.name || s.skuName || 'Essential Medicine',
            unit: s.unit || 'units',
            coldChain: Boolean(s.coldChain),
            qty,
            quantity: qty,
            reorderPoint: reorder,
            safetyStockThreshold: reorder,
            dailyBurnRate: burn,
            daysOfSupplyRemaining: daysSupply,
            isCriticalStockout: isCritical,
          };
        });

        setStock(normalizedStock);
        setLots(data.lots || []);
      }
    } catch (err) {
      console.error('Failed to load nurse facility stock:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFacilityId, user?.facilityId, token]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Restock or seed standard 6 essential medicines
  const handleRestockEssential = async () => {
    if (!token) return;
    setIsRestocking(true);
    try {
      const targetId = activeFacilityId || user?.facilityId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const res = await fetch(`/v1/facilities/${targetId}/stock/seed-essential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchStockData();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to restock essential medicines:', err);
    } finally {
      setIsRestocking(false);
    }
  };

  // Adjust stock quantity with resilient fallback & optimistic UI update
  const handleAdjustStock = async (skuId: string, currentQty: number | undefined, delta: number) => {
    const validCurrent = typeof currentQty === 'number' && !isNaN(currentQty) ? currentQty : 0;
    const newQty = Math.max(0, validCurrent + delta);
    setSavingSkuId(skuId);

    // Optimistic UI update
    setStock((prev) =>
      prev.map((item) => {
        if (item.skuId !== skuId) return item;
        const burn = item.dailyBurnRate && item.dailyBurnRate > 0 ? item.dailyBurnRate : 2;
        return {
          ...item,
          qty: newQty,
          quantity: newQty,
          daysOfSupplyRemaining: Math.round(newQty / burn),
          isCriticalStockout: item.safetyStockThreshold ? newQty < item.safetyStockThreshold * 0.5 : false,
        };
      })
    );

    try {
      const targetId = assignedFacility?.id || activeFacilityId || user?.facilityId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      let res = await fetch(`/v1/facilities/${targetId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skuId, quantity: newQty, newQty, delta }),
      });

      if (!res.ok) {
        // Fallback to stock/adjust
        res = await fetch('/v1/stock/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            facilityId: targetId,
            skuId,
            newQty,
            delta,
          }),
        });
      }

      if (res.ok) {
        setSavedSkuId(skuId);
        setTimeout(() => setSavedSkuId(null), 1800);
        onRefresh();
      } else {
        fetchStockData();
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
      fetchStockData();
    } finally {
      setSavingSkuId(null);
    }
  };

  // Update Ward Capacity, Staff & Attendance
  const handleSaveWardMeta = async (customPayload?: Record<string, any>) => {
    if (!token) return;
    setIsUpdatingMeta(true);
    setMetaSaved(false);

    const targetId = assignedFacility?.id || activeFacilityId || user?.facilityId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const payload = customPayload || {
      bedsOccupied,
      bedsTotal,
      bedsAvailable: Math.max(0, bedsTotal - bedsOccupied),
      icuOccupied,
      icuTotal,
      icuAvailable: Math.max(0, icuTotal - icuOccupied),
      oxygenCylinders,
      nursesPresent,
      doctorsPresent,
      anmsPresent,
      dailyAttendance,
      opdCount: dailyAttendance,
    };

    try {
      const res = await fetch(`/v1/facilities/${targetId}/meta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMetaSaved(true);
        setTimeout(() => setMetaSaved(false), 2500);
        onRefresh();
      } else {
        console.error('Failed to update ward capacity, status:', res.status);
      }
    } catch (err) {
      console.error('Failed to update ward capacity:', err);
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const filteredStock = stock.filter((item) => {
    if (filterType === 'critical') return item.isCriticalStockout;
    if (filterType === 'cold_chain') return item.coldChain;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-5 space-y-4 text-slate-100">
      {/* Top Banner: Facility Identity & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {facilities.length > 1 && user?.role !== 'phc_nurse' ? (
                  <select
                    value={activeFacilityId}
                    onChange={(e) => {
                      setActiveFacilityId(e.target.value);
                    }}
                    className="bg-slate-800 text-white font-bold text-base sm:text-lg rounded-lg px-2.5 py-1 border border-slate-700 outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} ({fac.level})
                      </option>
                    ))}
                  </select>
                ) : (
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {assignedFacility.name}
                  </h1>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {assignedFacility.level} &middot; {assignedFacility.district}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Nurse Station Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Direct Ward Capacity, Staff Allocation & Inventory Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Quick Add Resource Button */}
            <button
              onClick={() => setShowAddResourceModal(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
              title="Add Beds, ICU Capacity, Staff, or Oxygen"
            >
              <Plus className="w-4 h-4" />
              <span>Add Beds / Staff</span>
            </button>

            {/* Voice Dictation Button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition border border-teal-500/30"
              title="Voice Assistant: Dictate stock updates in Hindi, Marathi, Bengali, English"
            >
              <Mic className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Voice Input</span>
            </button>

            {/* AI Barcode / Package Scanner */}
            <button
              onClick={() => setShowInspectionModal(true)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
              title="Camera Scan: Batch Inspection"
            >
              <Camera className="w-4 h-4 text-teal-400" />
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchStockData();
                onRefresh();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
              title="Refresh facility stock"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Ward Capacity & Resource Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Facility Capacity & Staff on Duty</h2>
              <p className="text-[11px] text-slate-400">Add or adjust beds, ICU capacity, doctor/nurse roster, and oxygen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddResourceModal(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>Direct Add</span>
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-[11px] text-slate-300 font-mono border border-slate-700">
              {bedsTotal > 0 ? Math.round((bedsOccupied / bedsTotal) * 100) : 0}% Ward Occupancy
            </span>
          </div>
        </div>

        {/* Dynamic Resource Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* General Beds (Total & Occupied) */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-sky-400" /> General Beds
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {Math.max(0, bedsTotal - bedsOccupied)} Available
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Capacity:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white font-mono">{bedsTotal}</span>
                  <button
                    onClick={() => {
                      const next = Math.max(bedsOccupied, bedsTotal - 1);
                      setBedsTotal(next);
                    }}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                    title="Remove 1 total bed"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => {
                      const next = bedsTotal + 1;
                      setBedsTotal(next);
                    }}
                    className="w-5 h-5 rounded bg-sky-600 hover:bg-sky-500 flex items-center justify-center text-white"
                    title="Add 1 total bed"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => {
                      const next = bedsTotal + 5;
                      setBedsTotal(next);
                    }}
                    className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-sky-300 font-bold"
                    title="Add 5 total beds"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Occupied Beds:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-300 font-mono">{bedsOccupied}</span>
                  <button
                    onClick={() => setBedsOccupied(Math.max(0, bedsOccupied - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                    title="Discharge / 1 less occupied"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setBedsOccupied(Math.min(bedsTotal, bedsOccupied + 1))}
                    className="w-5 h-5 rounded bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white"
                    title="Admit patient / 1 more occupied"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ICU Beds (Total & Occupied) */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-400" /> ICU Beds
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {Math.max(0, icuTotal - icuOccupied)} Available
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ICU Total:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white font-mono">{icuTotal}</span>
                  <button
                    onClick={() => setIcuTotal(Math.max(icuOccupied, icuTotal - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                    title="Remove 1 ICU bed"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setIcuTotal(icuTotal + 1)}
                    className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white"
                    title="Add 1 ICU bed"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setIcuTotal(icuTotal + 2)}
                    className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-rose-300 font-bold"
                    title="Add 2 ICU beds"
                  >
                    +2
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ICU Occupied:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-rose-300 font-mono">{icuOccupied}</span>
                  <button
                    onClick={() => setIcuOccupied(Math.max(0, icuOccupied - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setIcuOccupied(Math.min(icuTotal, icuOccupied + 1))}
                    className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Healthcare Staff on Duty */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Staff on Duty
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {nursesPresent + doctorsPresent + anmsPresent} Total Staff
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nurses:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-teal-300 font-mono">{nursesPresent}</span>
                  <button
                    onClick={() => setNursesPresent(Math.max(0, nursesPresent - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setNursesPresent(nursesPresent + 1)}
                    className="w-5 h-5 rounded bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Doctors:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-300 font-mono">{doctorsPresent}</span>
                  <button
                    onClick={() => setDoctorsPresent(Math.max(0, doctorsPresent - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setDoctorsPresent(doctorsPresent + 1)}
                    className="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">ANMs / CHWs:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-300 font-mono">{anmsPresent}</span>
                  <button
                    onClick={() => setAnmsPresent(Math.max(0, anmsPresent - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setAnmsPresent(anmsPresent + 1)}
                    className="w-5 h-5 rounded bg-sky-600 hover:bg-sky-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Oxygen & OPD Footfall */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" /> Oxygen & OPD
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Status
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Oxygen Cylinders:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-cyan-300 font-mono">{oxygenCylinders}</span>
                  <button
                    onClick={() => setOxygenCylinders(Math.max(0, oxygenCylinders - 1))}
                    className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setOxygenCylinders(oxygenCylinders + 1)}
                    className="w-5 h-5 rounded bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">OPD Patients:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-amber-300 font-mono">{dailyAttendance}</span>
                  <button
                    onClick={() => setDailyAttendance(Math.max(0, dailyAttendance - 5))}
                    className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => setDailyAttendance(dailyAttendance + 5)}
                    className="px-1 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-[10px] text-white"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sync / Save Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {metaSaved ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Capacity & Staff synced to National Health Grid
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Click Save to sync bed counts, ICU, staff on duty, and oxygen with District Command.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveWardMeta()}
              disabled={isUpdatingMeta}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-md disabled:opacity-50"
            >
              {isUpdatingMeta ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save & Sync to Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Direct Add Resource Form */}
      {showAddResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add / Update Facility Resources</h3>
                  <p className="text-xs text-slate-400">{assignedFacility.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddResourceModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Total Beds (Capacity)</label>
                <input
                  type="number"
                  min="0"
                  value={bedsTotal}
                  onChange={(e) => setBedsTotal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Occupied Beds</label>
                <input
                  type="number"
                  min="0"
                  max={bedsTotal}
                  value={bedsOccupied}
                  onChange={(e) => setBedsOccupied(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Total ICU Beds</label>
                <input
                  type="number"
                  min="0"
                  value={icuTotal}
                  onChange={(e) => setIcuTotal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Occupied ICU Beds</label>
                <input
                  type="number"
                  min="0"
                  max={icuTotal}
                  value={icuOccupied}
                  onChange={(e) => setIcuOccupied(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nurses on Duty</label>
                <input
                  type="number"
                  min="0"
                  value={nursesPresent}
                  onChange={(e) => setNursesPresent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Doctors on Duty</label>
                <input
                  type="number"
                  min="0"
                  value={doctorsPresent}
                  onChange={(e) => setDoctorsPresent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">ANMs / Community Health</label>
                <input
                  type="number"
                  min="0"
                  value={anmsPresent}
                  onChange={(e) => setAnmsPresent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Oxygen Cylinders</label>
                <input
                  type="number"
                  min="0"
                  value={oxygenCylinders}
                  onChange={(e) => setOxygenCylinders(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">Today's OPD Patient Count</label>
                <input
                  type="number"
                  min="0"
                  value={dailyAttendance}
                  onChange={(e) => setDailyAttendance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddResourceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveWardMeta();
                  setShowAddResourceModal(false);
                }}
                disabled={isUpdatingMeta}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cold Chain Refrigerator Snapshot */}
      {Boolean(assignedFacility.coldChainCapable || (assignedFacility as any).coldChain) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Snowflake className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">ILR Refrigerator Telemetry</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                  Target: 2°C–8°C
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Current: <strong className="text-sky-300 font-mono">{(assignedFacility as any).coldChain?.tempCelsius ?? 4.2}°C</strong> &middot; Battery: <span className="text-emerald-400 font-mono">{(assignedFacility as any).coldChain?.batteryBackupHours ?? 18}h backup</span> &middot; Door: <span className="text-slate-300">{(assignedFacility as any).coldChain?.doorStatus ?? 'closed'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('coldchain')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
          >
            <span>Open Cold-Chain Radar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Essential Medicines Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-teal-400" />
                Essential Medicines Stock & Quick Dispense
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                PostgreSQL & Cloud Synced
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust stock levels with one tap. Changes save to PostgreSQL and synchronize in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  filterType === 'all'
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({stock.length})
              </button>
              <button
                onClick={() => setFilterType('critical')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  filterType === 'critical'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Critical Risk ({stock.filter((s) => s.isCriticalStockout).length})
              </button>
              <button
                onClick={() => setFilterType('cold_chain')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  filterType === 'cold_chain'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Cold Chain (2°C–8°C)
              </button>
            </div>

            {/* Restock Essentials Button */}
            <button
              onClick={handleRestockEssential}
              disabled={isRestocking}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              title="Restock or reset the 6 standard essential medicines"
            >
              {isRestocking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>Restock Essentials</span>
            </button>
          </div>
        </div>

        {/* Stock Items List */}
        <div className="space-y-2.5">
          {isLoading && stock.length === 0 ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse border border-slate-700/50" />
              ))}
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-3">
              <Boxes className="w-10 h-10 text-slate-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-white text-sm">No Medicines Visible in this View</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {filterType !== 'all'
                    ? `No medicine items match the "${filterType}" filter.`
                    : 'No stock records currently found for this health facility.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition"
                  >
                    View All ({stock.length})
                  </button>
                )}
                <button
                  onClick={handleRestockEssential}
                  disabled={isRestocking}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  {isRestocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Restock 6 Essential Medicines</span>
                </button>
              </div>
            </div>
          ) : (
            filteredStock.map((item) => {
              const isSaving = savingSkuId === item.skuId;
              const isSaved = savedSkuId === item.skuId;
              const currentQuantity = item.quantity ?? item.qty ?? 0;
              const safetyThreshold = item.safetyStockThreshold ?? item.reorderPoint ?? 50;
              const stockPct = Math.min(100, Math.round((currentQuantity / (safetyThreshold * 2 || 1)) * 100));
              const burnRate = item.dailyBurnRate && item.dailyBurnRate > 0 ? item.dailyBurnRate : 2;
              const daysRemaining = item.daysOfSupplyRemaining !== undefined ? item.daysOfSupplyRemaining : Math.round(currentQuantity / burnRate);
              const isCritical = Boolean(item.isCriticalStockout || currentQuantity < safetyThreshold * 0.5);

              return (
                <div
                  key={item.skuId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-rose-950/25 border-rose-500/50 shadow-sm'
                      : currentQuantity <= safetyThreshold
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-800/70 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {item.skuName || item.name || 'Essential Medicine'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {item.skuCode || item.code || 'MED'}
                        </span>
                        {item.coldChain && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            <Snowflake className="w-3 h-3" />
                            2°C–8°C
                          </span>
                        )}
                        {isCritical && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            Stockout Imminent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>
                          Safety Buffer: <strong className="text-slate-200">{safetyThreshold} units</strong>
                        </span>
                        <span>
                          Coverage:{' '}
                          <strong className={daysRemaining <= 7 ? 'text-rose-400' : 'text-emerald-400'}>
                            {daysRemaining} Days
                          </strong>
                        </span>
                        <span>
                          Daily Burn: <strong>{burnRate} / day</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right: Quantity Adjuster Controls */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {isCritical && (
                        <button
                          onClick={() => onProposeTransfer(assignedFacility.id, item.skuId)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm shrink-0"
                          title="Request emergency transfer dispatch"
                        >
                          <Send className="w-3 h-3" />
                          <span>Request Stock</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
                        <button
                          onClick={() => handleAdjustStock(item.skuId, currentQuantity, -10)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition font-bold text-xs"
                          title="Dispense -10 units"
                        >
                          -10
                        </button>

                        <button
                          onClick={() => handleAdjustStock(item.skuId, currentQuantity, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                          title="Dispense -1 unit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <div className="px-3 min-w-[70px] text-center">
                          <span className="font-mono text-base font-bold text-white block">
                            {currentQuantity}
                          </span>
                          <span className="text-[9px] text-slate-500 block uppercase">
                            {item.unit || 'Units'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAdjustStock(item.skuId, currentQuantity, 1)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                          title="Add +1 unit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleAdjustStock(item.skuId, currentQuantity, 10)}
                          className="w-7 h-7 rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition font-bold text-xs shadow-sm"
                          title="Add +10 units"
                        >
                          +10
                        </button>
                      </div>

                      {isSaved && (
                        <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 animate-bounce">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Visualizer */}
                  <div className="w-full h-1.5 rounded-full bg-slate-900 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCritical
                          ? 'bg-rose-500'
                          : currentQuantity <= safetyThreshold
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <VoiceNurseAssistantModal
          onClose={() => setShowVoiceModal(false)}
          onStockUpdated={() => {
            fetchStockData();
            onRefresh();
          }}
        />
      )}

      {/* Inspection Modal */}
      {showInspectionModal && (
        <MultimodalTriageModal
          onClose={() => setShowInspectionModal(false)}
          onConfirmStockChange={(skuCode, quantityDelta, note) => {
            const target = stock.find((s) => s.skuCode === skuCode);
            if (target) {
              handleAdjustStock(target.skuId, target.quantity, quantityDelta);
            }
          }}
        />
      )}
    </div>
  );
};
