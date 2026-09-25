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
  HeartPulse,
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
  Edit2,
  Trash2,
  Save,
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

  // Bed, ICU and attendance editing state
  const [bedsAvailable, setBedsAvailable] = useState<number>(0);
  const [bedsTotal, setBedsTotal] = useState<number>(0);
  const [icuAvailable, setIcuAvailable] = useState<number>(0);
  const [icuTotal, setIcuTotal] = useState<number>(0);
  const [nursesPresent, setNursesPresent] = useState<number>(0);
  const [doctorsPresent, setDoctorsPresent] = useState<number>(0);
  const [anmsPresent, setAnmsPresent] = useState<number>(0);
  const [oxygenCylinders, setOxygenCylinders] = useState<number>(0);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState<boolean>(false);
  const [metaSavedNotice, setMetaSavedNotice] = useState<boolean>(false);

  // Facility Profile Editing Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [editLevel, setEditLevel] = useState<string>('PHC');
  const [editDistrict, setEditDistrict] = useState<string>('');
  const [editLat, setEditLat] = useState<number>(0);
  const [editLng, setEditLng] = useState<number>(0);
  const [editColdChain, setEditColdChain] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const canEdit =
    user?.role === 'district_officer' ||
    user?.role === 'national_war_room' ||
    (user?.role === 'phc_nurse' && user?.facilityId === facility?.id);

  // Fetch full details for facility
  useEffect(() => {
    if (!facility) return;
    const cap = facility.capacity as any;
    const att = facility.attendance as any;
    setBedsAvailable(cap.bedsAvailable ?? 0);
    setBedsTotal(cap.bedsTotal ?? 0);
    setIcuAvailable(cap.icuAvailable ?? 0);
    setIcuTotal(cap.icuTotal ?? 2);
    setOxygenCylinders(cap.oxygenCylinders ?? 4);
    setNursesPresent(att.nursesPresent ?? 0);
    setDoctorsPresent(att.doctorsPresent ?? 0);
    setAnmsPresent(att.anmsPresent ?? 0);

    // Populate edit state
    setEditName(facility.name || '');
    setEditCode(facility.code || '');
    setEditLevel(facility.level || 'PHC');
    setEditDistrict(facility.district || 'Pune Rural');
    setEditLat(facility.lat || 18.65);
    setEditLng(facility.lng || 74.15);
    setEditColdChain(Boolean(facility.coldChainCapable));

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
  }, [facility?.id, facility, token]);

  if (!facility) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !token) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/v1/facilities/${facility.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          code: editCode,
          level: editLevel,
          district: editDistrict,
          lat: editLat,
          lng: editLng,
          coldChainCapable: editColdChain,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setMetaSavedNotice(true);
        setTimeout(() => setMetaSavedNotice(false), 2500);
        onRefreshMap();
      }
    } catch (err) {
      console.error('Failed to save facility profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (!facility || !token) return;
    if (!window.confirm(`Are you sure you want to delete and decommission ${facility.name}?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/v1/facilities/${facility.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onRefreshMap();
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete facility:', err);
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Quick save for all facility capacity, ICU & staff metrics
  const handleSaveMeta = async (updates?: Partial<{
    bedsAvailable: number;
    bedsTotal: number;
    icuAvailable: number;
    icuTotal: number;
    nursesPresent: number;
    doctorsPresent: number;
    anmsPresent: number;
    oxygenCylinders: number;
  }>) => {
    setIsUpdatingMeta(true);
    const payload = {
      bedsAvailable: updates?.bedsAvailable ?? bedsAvailable,
      bedsTotal: updates?.bedsTotal ?? bedsTotal,
      bedsOccupied: Math.max(0, (updates?.bedsTotal ?? bedsTotal) - (updates?.bedsAvailable ?? bedsAvailable)),
      icuAvailable: updates?.icuAvailable ?? icuAvailable,
      icuTotal: updates?.icuTotal ?? icuTotal,
      icuOccupied: Math.max(0, (updates?.icuTotal ?? icuTotal) - (updates?.icuAvailable ?? icuAvailable)),
      oxygenCylinders: updates?.oxygenCylinders ?? oxygenCylinders,
      nursesPresent: updates?.nursesPresent ?? nursesPresent,
      doctorsPresent: updates?.doctorsPresent ?? doctorsPresent,
      anmsPresent: updates?.anmsPresent ?? anmsPresent,
    };

    try {
      const res = await fetch(`/v1/facilities/${facility.id}/meta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMetaSavedNotice(true);
        setTimeout(() => setMetaSavedNotice(false), 2000);
        onRefreshMap();
      }
    } catch (err) {
      console.error('Failed to update facility meta:', err);
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
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg font-bold text-slate-100">{facility.name}</h2>
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-teal-300 transition"
                  title="Edit facility profile and location in database"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
          {/* Real-time Capacity, ICU & Staff Quick Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-0.5">
              <span>Facility Capacity & Staff Deployment</span>
              {metaSavedNotice && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-normal animate-pulse">
                  <Check className="w-3 h-3" /> Updated on server
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* General Beds tile */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Bed className="w-3.5 h-3.5 text-sky-400" /> General Beds
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tot: {bedsTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-100 font-mono">{bedsAvailable}</span>
                    <span className="text-[10px] text-slate-400 ml-1">avail</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = Math.max(0, bedsAvailable - 1);
                          setBedsAvailable(next);
                          handleSaveMeta({ bedsAvailable: next });
                        }}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                        title="Decrease available beds"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const next = Math.min(bedsTotal, bedsAvailable + 1);
                          setBedsAvailable(next);
                          handleSaveMeta({ bedsAvailable: next });
                        }}
                        className="w-5 h-5 rounded bg-sky-600 hover:bg-sky-500 flex items-center justify-center text-white"
                        title="Increase available beds"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const nextTot = bedsTotal + 1;
                          const nextAvail = bedsAvailable + 1;
                          setBedsTotal(nextTot);
                          setBedsAvailable(nextAvail);
                          handleSaveMeta({ bedsTotal: nextTot, bedsAvailable: nextAvail });
                        }}
                        className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-sky-300 font-bold"
                        title="Add +1 Total Bed to Ward"
                      >
                        +Bed
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ICU Beds tile */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> ICU Beds
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tot: {icuTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-rose-300 font-mono">{icuAvailable}</span>
                    <span className="text-[10px] text-slate-400 ml-1">avail</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = Math.max(0, icuAvailable - 1);
                          setIcuAvailable(next);
                          handleSaveMeta({ icuAvailable: next });
                        }}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const next = Math.min(icuTotal, icuAvailable + 1);
                          setIcuAvailable(next);
                          handleSaveMeta({ icuAvailable: next });
                        }}
                        className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const nextTot = icuTotal + 1;
                          const nextAvail = icuAvailable + 1;
                          setIcuTotal(nextTot);
                          setIcuAvailable(nextAvail);
                          handleSaveMeta({ icuTotal: nextTot, icuAvailable: nextAvail });
                        }}
                        className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-rose-300 font-bold"
                        title="Add +1 ICU Bed"
                      >
                        +ICU
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Nurses on Duty */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-teal-400" /> Nurses on Duty
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-teal-300 font-mono">{nursesPresent} Staff</span>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = Math.max(0, nursesPresent - 1);
                          setNursesPresent(next);
                          handleSaveMeta({ nursesPresent: next });
                        }}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const next = nursesPresent + 1;
                          setNursesPresent(next);
                          handleSaveMeta({ nursesPresent: next });
                        }}
                        className="w-5 h-5 rounded bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white"
                        title="Add Nurse on Duty"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctors & ANMs on Duty */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Doctors on Duty
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-300 font-mono">{doctorsPresent} Docs</span>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = Math.max(0, doctorsPresent - 1);
                          setDoctorsPresent(next);
                          handleSaveMeta({ doctorsPresent: next });
                        }}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          const next = doctorsPresent + 1;
                          setDoctorsPresent(next);
                          handleSaveMeta({ doctorsPresent: next });
                        }}
                        className="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                        title="Add Doctor on Duty"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
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

          {/* Decommission / Delete Facility button for Admins/District Officers */}
          {canEdit && user?.role !== 'phc_nurse' && (
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleDeleteFacility}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Decommissioning...' : 'Decommission Facility'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Facility Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                Edit Facility Profile in Database
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-teal-500"
                  >
                    <option value="PHC">PHC (Primary)</option>
                    <option value="CHC">CHC (Community)</option>
                    <option value="DH">DH (District Hospital)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">District / Jurisdiction</label>
                <input
                  type="text"
                  required
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editLng}
                    onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editColdChain"
                  checked={editColdChain}
                  onChange={(e) => setEditColdChain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-0"
                />
                <label htmlFor="editColdChain" className="text-slate-300 text-xs cursor-pointer">
                  Cold-Chain Certified (Solar / ILR Refrigerator)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProfile ? 'Saving to Database...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
