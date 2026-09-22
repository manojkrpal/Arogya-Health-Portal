import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ProcurementPO,
  NationalGridState,
} from '../types/client.js';
import {
  ShoppingCart,
  Globe,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Building2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Search,
  BedDouble,
  Thermometer,
  Layers,
  Filter,
} from 'lucide-react';

type SubTab = 'grid' | 'orders';

export const NationalSupplyView: React.FC = () => {
  const { user, token } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('grid');
  const [purchaseOrders, setPurchaseOrders] = useState<ProcurementPO[]>([]);
  const [nationalStates, setNationalStates] = useState<NationalGridState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filters for National Grid
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'SURGE_WARNING' | 'EMERGENCY_MOBILIZATION'>('ALL');

  // PO Modal State
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSku, setPoSku] = useState('ORS-001');
  const [poQty, setPoQty] = useState(5000);
  const [poDeliveryType, setPoDeliveryType] = useState<'bulk_consignment' | 'expedited_cold_courier'>('bulk_consignment');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [poRes, gridRes] = await Promise.all([
        fetch('/v1/procurement/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/national/grid', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (poRes.ok) {
        const data = await poRes.json();
        setPurchaseOrders(data.orders || []);
      }
      if (gridRes.ok) {
        const data = await gridRes.json();
        setNationalStates(data.states || []);
      }
    } catch (err) {
      console.error('Failed to fetch national supply data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Issue Procurement PO
  const handleCreatePO = async () => {
    try {
      const unitCost = poSku === 'ORS-001' ? 18.5 : poSku === 'INS-001' ? 145.0 : 45.0;
      const res = await fetch('/v1/procurement/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cdwHubName: 'Central Drug Warehouse (CDW-MH-01)',
          supplierName: 'State Empanelled Medical Manufacturer',
          skuCode: poSku,
          skuName:
            poSku === 'ORS-001'
              ? 'Oral Rehydration Salts WHO'
              : poSku === 'INS-001'
              ? 'Human Insulin NPH 100IU/ml'
              : 'Normal Saline IV 500ml',
          quantity: poQty,
          unitCostInr: unitCost,
          deliveryType: poDeliveryType,
        }),
      });
      if (res.ok) {
        setShowPOModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create purchase order:', err);
    }
  };

  // Receive PO Consignment
  const handleReceivePO = async (poId: string) => {
    try {
      const res = await fetch(`/v1/procurement/orders/${poId}/receive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to receive consignment:', err);
    }
  };

  // Aggregated National Grid KPI Totals
  const nationalKPIs = useMemo(() => {
    if (!nationalStates || nationalStates.length === 0) {
      return {
        totalFacilities: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        avgOccupancy: 0,
        avgCoverageDays: 0,
        avgColdChainPct: 0,
        totalAlerts: 0,
        statesCount: 0,
        healthyStates: 0,
        surgeStates: 0,
        emergencyStates: 0,
      };
    }

    const totalFacilities = nationalStates.reduce((acc, s) => acc + s.activeFacilities, 0);
    const totalBeds = nationalStates.reduce((acc, s) => acc + s.totalBeds, 0);
    const occupiedBeds = nationalStates.reduce((acc, s) => acc + s.bedsOccupied, 0);
    const avgOccupancy = Math.round((occupiedBeds / (totalBeds || 1)) * 100);
    const avgCoverageDays = (
      nationalStates.reduce((acc, s) => acc + s.avgStockCoverageDays, 0) / nationalStates.length
    ).toFixed(1);
    const avgColdChainPct = (
      nationalStates.reduce((acc, s) => acc + s.coldChainCompliancePct, 0) / nationalStates.length
    ).toFixed(1);
    const totalAlerts = nationalStates.reduce((acc, s) => acc + s.criticalAlertsCount, 0);

    const healthyStates = nationalStates.filter((s) => s.strategicBufferStatus === 'HEALTHY').length;
    const surgeStates = nationalStates.filter((s) => s.strategicBufferStatus === 'SURGE_WARNING').length;
    const emergencyStates = nationalStates.filter(
      (s) => s.strategicBufferStatus === 'EMERGENCY_MOBILIZATION'
    ).length;

    return {
      totalFacilities,
      totalBeds,
      occupiedBeds,
      avgOccupancy,
      avgCoverageDays,
      avgColdChainPct,
      totalAlerts,
      statesCount: nationalStates.length,
      healthyStates,
      surgeStates,
      emergencyStates,
    };
  }, [nationalStates]);

  // Filtered States
  const filteredStates = useMemo(() => {
    return nationalStates.filter((st) => {
      const matchesSearch =
        st.stateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.stateCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || st.strategicBufferStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [nationalStates, searchTerm, statusFilter]);

  return (
    <div className="p-3 sm:p-5 max-w-6xl mx-auto space-y-4 pb-24 text-slate-100">
      {/* Top Banner & Hub Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-teal-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                National Health Grid & Procurement
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pan-India State Buffer Reserves &middot; Hospital Capacity &middot; Central CDW PO Logistics
            </p>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700 self-start sm:self-auto"
            title="Refresh national telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>

        {/* Primary Sub-tab Switcher */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 flex-wrap">
          <button
            onClick={() => setSubTab('grid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              subTab === 'grid'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>National Health Grid</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] text-slate-300 font-mono">
              {nationalStates.length} States/UTs
            </span>
          </button>

          <button
            onClick={() => setSubTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              subTab === 'orders'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Drug Orders (POs)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] text-slate-300 font-mono">
              {purchaseOrders.length}
            </span>
          </button>
        </div>
      </div>

      {/* 1. NATIONAL HEALTH GRID VIEW */}
      {subTab === 'grid' && (
        <div className="space-y-4">
          {/* Pan-India Executive KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active PHCs</span>
                <Building2 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white font-mono">
                {nationalKPIs.totalFacilities.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{nationalKPIs.statesCount} States & UTs</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Beds</span>
                <BedDouble className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white font-mono">
                {nationalKPIs.totalBeds.toLocaleString()}
              </div>
              <span className="text-[10px] text-sky-400/80 mt-0.5 block">{nationalKPIs.avgOccupancy}% Occ Rate</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Medicine Buffer</span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
                {nationalKPIs.avgCoverageDays} Days
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">National Average</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Cold-Chain Index</span>
                <Thermometer className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-purple-300 font-mono">
                {nationalKPIs.avgColdChainPct}%
              </div>
              <span className="text-[10px] text-purple-400/80 mt-0.5 block">2°C–8°C Certified</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">
                {nationalKPIs.totalAlerts}
              </div>
              <span className="text-[10px] text-amber-500/80 mt-0.5 block">Cross-state alerts</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>State Readiness</span>
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold mt-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{nationalKPIs.healthyStates}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{nationalKPIs.surgeStates}</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">{nationalKPIs.emergencyStates}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Healthy / Surge / Emerg</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search state name or code (e.g. MH, UP)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </span>
              {(['ALL', 'HEALTHY', 'SURGE_WARNING', 'EMERGENCY_MOBILIZATION'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 font-medium ${
                    statusFilter === st
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All States'
                    : st === 'HEALTHY'
                    ? 'Healthy'
                    : st === 'SURGE_WARNING'
                    ? 'Surge Warning'
                    : 'Emergency'}
                </button>
              ))}
            </div>
          </div>

          {/* State Resource Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStates.map((st) => {
              const isEmergency = st.strategicBufferStatus === 'EMERGENCY_MOBILIZATION';
              const isSurge = st.strategicBufferStatus === 'SURGE_WARNING';

              return (
                <div
                  key={st.stateCode}
                  className={`p-4 rounded-2xl border transition-all ${
                    isEmergency
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20'
                      : isSurge
                      ? 'bg-slate-900/95 border-amber-500/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-teal-300 border border-slate-700">
                          {st.stateCode}
                        </span>
                        <h3 className="font-bold text-white text-sm">{st.stateName}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        {st.activeFacilities.toLocaleString()} Primary Health Facilities
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isEmergency
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : isSurge
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {st.strategicBufferStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Key State Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Stock Buffer</span>
                      <span
                        className={`text-sm font-bold font-mono ${
                          st.avgStockCoverageDays < 10
                            ? 'text-rose-400'
                            : st.avgStockCoverageDays < 14
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {st.avgStockCoverageDays}d
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Bed Occ.</span>
                      <span className="text-sm font-bold text-white font-mono">{st.occupancyPct}%</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Readiness</span>
                      <span className="text-sm font-bold text-purple-300 font-mono">{st.readinessIndex}/100</span>
                    </div>
                  </div>

                  {/* Bed Stats Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Beds: {st.bedsOccupied.toLocaleString()} / {st.totalBeds.toLocaleString()}</span>
                      <span className="text-slate-300 font-mono">Cold-Chain: {st.coldChainCompliancePct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          st.occupancyPct > 80 ? 'bg-rose-500' : st.occupancyPct > 70 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, st.occupancyPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. DRUG ORDERS (PURCHASE ORDERS) VIEW */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Central Drug Warehouse Replenishment Orders</h2>
              <p className="text-xs text-slate-400">Manage bulk procurement consignments directly from state manufacturers</p>
            </div>

            <button
              onClick={() => setShowPOModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Drug Order</span>
            </button>
          </div>

          <div className="space-y-3">
            {purchaseOrders.map((po) => {
              const isReceived = po.status === 'received';

              return (
                <div
                  key={po.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{po.skuName}</span>
                          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {po.poNumber}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {po.cdwHubName} &middot; Supplier: {po.supplierName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {po.quantity.toLocaleString()} units
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isReceived
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                    <div>
                      <span>
                        Total PO Value: <strong className="text-white">₹{(po.totalAmountInr || 0).toLocaleString()}</strong>
                      </span>
                      <span className="ml-3 text-slate-500">ETA: {po.etaDate}</span>
                    </div>

                    {!isReceived && (
                      <button
                        onClick={() => handleReceivePO(po.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 transition shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                Issue Central Procurement PO
              </h3>
              <button
                onClick={() => setShowPOModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Essential Medicine SKU</label>
                <select
                  value={poSku}
                  onChange={(e) => setPoSku(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                >
                  <option value="ORS-001">Oral Rehydration Salts WHO (ORS-001)</option>
                  <option value="INS-001">Human Insulin NPH 100IU/ml (INS-001)</option>
                  <option value="IVF-001">Normal Saline IV 500ml (IVF-001)</option>
                  <option value="PCM-500">Paracetamol 500mg Tablets (PCM-500)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Quantity (Units)</label>
                <input
                  type="number"
                  min="500"
                  max="100000"
                  step="500"
                  value={poQty}
                  onChange={(e) => setPoQty(Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Delivery Consignment Type</label>
                <select
                  value={poDeliveryType}
                  onChange={(e) => setPoDeliveryType(e.target.value as any)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                >
                  <option value="bulk_consignment">Standard Bulk Consignment (Truck Freight)</option>
                  <option value="expedited_cold_courier">Expedited Cold-Chain Refrigerated Courier</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePO}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  Generate & Transmit PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
