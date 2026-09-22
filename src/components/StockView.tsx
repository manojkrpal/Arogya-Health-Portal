import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { FacilitySnapshot, StockItem } from '../types/client.js';
import { VoiceNurseAssistantModal } from './VoiceNurseAssistantModal.js';
import { MultimodalTriageModal } from './MultimodalTriageModal.js';
import {
  Package,
  Plus,
  Minus,
  Check,
  Snowflake,
  ShieldAlert,
  AlertTriangle,
  Building2,
  RefreshCw,
  Flame,
  Mic,
  Camera,
} from 'lucide-react';

interface StockViewProps {
  facilities: FacilitySnapshot[];
  onRefreshAll: () => void;
  outbreakMultiplier: number;
  onSetOutbreakMultiplier: (mult: number, label: string) => void;
}

export const StockView: React.FC<StockViewProps> = ({
  facilities,
  onRefreshAll,
  outbreakMultiplier,
  onSetOutbreakMultiplier,
}) => {
  const { user, token, t } = useAuth();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    user?.facilityId || facilities[0]?.id || ''
  );
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingSkuId, setSavingSkuId] = useState<string | null>(null);
  const [savedSkuId, setSavedSkuId] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);

  // If nurse, lock facility to their assigned facility
  const isNurse = user?.role === 'phc_nurse';
  const effectiveFacilityId = isNurse && user.facilityId ? user.facilityId : selectedFacilityId;

  const currentFacility = facilities.find((f) => f.id === effectiveFacilityId);

  useEffect(() => {
    if (!effectiveFacilityId) return;

    async function fetchStock() {
      setIsLoading(true);
      try {
        const res = await fetch(`/v1/facilities/${effectiveFacilityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStock(data.stock || []);
        }
      } catch (err) {
        console.error('Failed to fetch stock in StockView:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStock();
  }, [effectiveFacilityId, token]);

  const handleAdjustStock = async (skuId: string, delta: number) => {
    const targetItem = stock.find((s) => s.skuId === skuId);
    if (!targetItem) return;

    const newQty = Math.max(0, targetItem.qty + delta);
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
          facilityId: effectiveFacilityId,
          skuId,
          newQty,
        }),
      });

      if (res.ok) {
        setSavedSkuId(skuId);
        setTimeout(() => setSavedSkuId(null), 1200);
        onRefreshAll();
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setSavingSkuId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            {isNurse ? 'PHC Ward Stock Register' : 'Facility Inventory Management'}
          </h2>
          <p className="text-xs text-slate-400">
            {isNurse
              ? 'Large touch steppers, voice assistant & multimodal vision verification'
              : 'Multi-facility inventory monitoring and emergency surge control'}
          </p>
        </div>

        {/* Voice Assistant & Vision Inspection Action Triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-teal-500/10"
            title="Voice-first inventory adjustments"
          >
            <Mic className="w-3.5 h-3.5 text-teal-400" />
            <span>Voice Update</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInspectionModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Multimodal Shelf OCR and Cold-Chain Verification"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Shelf OCR & Vision</span>
          </button>
        </div>
      </div>

      {/* Emergency Outbreak Multiplier Control (War Room & District Officer) */}
      {(user?.role === 'national_war_room' || user?.role === 'district_officer') && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">
                Outbreak Surge Demand Multiplier
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">
              {outbreakMultiplier.toFixed(1)}x Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Simulate seasonal spikes (monsoon dengue/cholera) to test automated transfer triggers.
          </p>
          <div className="flex items-center gap-2 pt-1">
            {[
              { mult: 1.0, label: 'Baseline (1.0x)' },
              { mult: 1.5, label: 'Moderate Surge (1.5x)' },
              { mult: 2.0, label: 'Monsoon Spike (2.0x)' },
              { mult: 3.0, label: 'Severe Epidemic (3.0x)' },
            ].map((preset) => (
              <button
                key={preset.mult}
                onClick={() => onSetOutbreakMultiplier(preset.mult, preset.label)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${
                  Math.abs(outbreakMultiplier - preset.mult) < 0.05
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {preset.mult}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Facility Selector (for District Officer / War Room) */}
      {!isNurse && (
        <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-xs">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <span className="text-slate-400">Facility:</span>
          <select
            value={effectiveFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-slate-200"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.level}, {f.district}) - {f.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Facility Header Card if Nurse */}
      {isNurse && currentFacility && (
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-mono text-teal-400 font-bold">
              {currentFacility.level} &bull; {currentFacility.district}
            </span>
            <h3 className="text-sm font-bold text-slate-100">{currentFacility.name}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Available Beds</span>
            <span className="font-bold text-slate-200">
              {currentFacility.capacity.bedsAvailable} / {currentFacility.capacity.bedsTotal}
            </span>
          </div>
        </div>
      )}

      {/* Stock Cards with Nurse Steppers */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Loading stock items from database...
        </div>
      ) : (
        <div className="space-y-2.5">
          {stock.map((item) => {
            const isHighRisk = item.stockoutProb7d > 0.4 || item.qty < item.demand7d;

            return (
              <div
                key={item.skuId}
                className={`p-3.5 rounded-xl border transition shadow ${
                  isHighRisk
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      {item.coldChain && (
                        <span className="text-[10px] text-blue-300 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                          <Snowflake className="w-2.5 h-2.5 text-blue-400" /> 2-8°C
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{item.code}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isHighRisk
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {Math.round(item.stockoutProb7d * 100)}% 7d Risk
                  </span>
                </div>

                {/* Stock values & Steppers */}
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock On-Hand</span>
                    <span className="text-lg font-bold text-slate-100">
                      {item.qty}{' '}
                      <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">7d Demand</span>
                    <span className="text-xs font-semibold text-slate-300">
                      ~{Math.round(item.demand7d)} {item.unit}
                    </span>
                  </div>

                  {/* Large +/- touch buttons for instant adjustment */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustStock(item.skuId, -5)}
                      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-base transition shadow"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(item.skuId, 5)}
                      className="w-9 h-9 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white flex items-center justify-center font-bold text-base transition shadow shadow-teal-500/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {savedSkuId === item.skuId && (
                  <div className="mt-1.5 text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Updated in PostgreSQL
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <VoiceNurseAssistantModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onSuccess={() => {
            onRefreshAll();
            // Refetch current facility stock
            if (effectiveFacilityId) {
              fetch(`/v1/facilities/${effectiveFacilityId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then((res) => res.json())
                .then((data) => setStock(data.stock || []))
                .catch(console.error);
            }
          }}
          facilities={facilities}
        />
      )}

      {/* Multimodal Vision & Shelf Inspection Modal */}
      {showInspectionModal && (
        <MultimodalTriageModal
          facilityName={currentFacility?.name || 'Primary Health Centre'}
          onClose={() => setShowInspectionModal(false)}
        />
      )}
    </div>
  );
};
