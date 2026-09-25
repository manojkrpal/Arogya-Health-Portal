import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { BottomNav, TabType } from './components/BottomNav.js';
import { MapView } from './components/MapView.js';
import { FacilityDrawer } from './components/FacilityDrawer.js';
import { AlertsView } from './components/AlertsView.js';
import { TransfersView } from './components/TransfersView.js';
import { FederationView } from './components/FederationView.js';
import { StockView } from './components/StockView.js';
import { NationalSupplyView } from './components/NationalSupplyView.js';
import { NurseFacilityView } from './components/NurseFacilityView.js';
import {
  FacilitySnapshot,
  AlertItem,
  TransferOrder,
  SkuItem,
} from './types/client.js';

function ArogyaNetApp() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [facilities, setFacilities] = useState<FacilitySnapshot[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [outbreakMultiplier, setOutbreakMultiplier] = useState<number>(1.0);
  const [activeLabel, setActiveLabel] = useState<string>('');
  const [selectedFacility, setSelectedFacility] = useState<FacilitySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Set default view on role switch
  useEffect(() => {
    if (!user?.role) return;

    setSelectedFacility(null);
    switch (user.role) {
      case 'phc_nurse':
        setActiveTab('facility');
        break;
      case 'national_war_room':
        setActiveTab('grid');
        break;
      case 'brics_analyst':
        setActiveTab('federation');
        break;
      case 'district_officer':
      default:
        setActiveTab('map');
        break;
    }
  }, [user?.role]);

  // Fetch all map snapshots, alerts, and transfers
  const refreshData = useCallback(async () => {
    if (!token || user?.role === 'brics_analyst') return;
    setIsLoading(true);
    try {
      const [mapRes, alertsRes, transfersRes, skusRes] = await Promise.all([
        fetch('/v1/map/snapshot', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/alerts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/transfers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/v1/skus', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setFacilities(mapData.facilities || []);
        if (mapData.emergency) {
          setOutbreakMultiplier(mapData.emergency.outbreakMultiplier || 1.0);
          setActiveLabel(mapData.emergency.activeLabel || '');
        }
      }
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
      if (transfersRes.ok) {
        const transfersData = await transfersRes.json();
        setTransfers(transfersData.transfers || []);
      }
      if (skusRes.ok) {
        const skusData = await skusRes.json();
        setSkus(skusData.skus || []);
      }
    } catch (err) {
      console.error('Failed to refresh ArogyaNet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle setting emergency outbreak surge
  const handleSetOutbreakMultiplier = async (mult: number, label: string) => {
    try {
      const res = await fetch('/v1/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          outbreakMultiplier: mult,
          activeLabel: label,
        }),
      });
      if (res.ok) {
        setOutbreakMultiplier(mult);
        setActiveLabel(label);
        refreshData();
      }
    } catch (err) {
      console.error('Failed to set emergency outbreak multiplier:', err);
    }
  };

  const handleProposeTransferFromAlert = (facilityId: string, skuId: string) => {
    setActiveTab('transfers');
  };

  const handleNavigateHome = () => {
    if (user?.role === 'phc_nurse') {
      setActiveTab('facility');
    } else if (user?.role === 'national_war_room') {
      setActiveTab('grid');
    } else if (user?.role === 'brics_analyst') {
      setActiveTab('federation');
    } else {
      setActiveTab('map');
      setSelectedFacility(null);
    }
  };

  // Filter alerts for nurse's facility if role is nurse
  const displayedAlerts =
    user?.role === 'phc_nurse' && user?.facilityId
      ? alerts.filter((a) => a.facilityId === user.facilityId)
      : alerts;

  // Filter transfers for nurse's facility if role is nurse
  const displayedTransfers =
    user?.role === 'phc_nurse' && user?.facilityId
      ? transfers.filter(
          (t) => t.senderFacilityId === user.facilityId || t.recipientFacilityId === user.facilityId
        )
      : transfers;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Top Application Header */}
      <Navbar
        outbreakMultiplier={outbreakMultiplier}
        activeLabel={activeLabel}
        onLogoClick={handleNavigateHome}
        onRefreshData={refreshData}
      />

      {/* Google Maps Platform Demo Quota Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
              for instructions to update your account.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full relative pb-20">
        {/* 1. NURSE FACILITY WARD CONSOLE */}
        {activeTab === 'facility' && (
          <NurseFacilityView
            facilities={facilities}
            onRefresh={refreshData}
            onNavigateToTab={setActiveTab}
            onProposeTransfer={handleProposeTransferFromAlert}
          />
        )}

        {/* 2. DISTRICT / NATIONAL MAP */}
        {activeTab === 'map' && user?.role !== 'brics_analyst' && (
          <MapView
            facilities={facilities}
            onSelectFacility={(fac) => setSelectedFacility(fac)}
            selectedFacilityId={selectedFacility?.id || null}
            onRefresh={refreshData}
            isLoading={isLoading}
          />
        )}

        {/* 3. ALERTS & SURGE FORECAST */}
        {activeTab === 'alerts' && user?.role !== 'brics_analyst' && (
          <AlertsView
            alerts={displayedAlerts}
            onRefresh={refreshData}
            isLoading={isLoading}
            onProposeTransfer={handleProposeTransferFromAlert}
          />
        )}

        {/* 4. NATIONAL HEALTH GRID */}
        {activeTab === 'grid' && (
          <NationalSupplyView initialSubTab="grid" />
        )}

        {/* 5. DRUG ORDERS / POs */}
        {activeTab === 'orders' && (
          <NationalSupplyView initialSubTab="orders" />
        )}

        {/* 6. TRANSFERS */}
        {activeTab === 'transfers' && user?.role !== 'brics_analyst' && (
          <TransfersView
            transfers={displayedTransfers}
            facilities={facilities}
            skus={skus}
            onRefresh={refreshData}
            isLoading={isLoading}
            initialSubTab="transfers"
          />
        )}

        {/* 7. COLD-CHAIN IOT RADAR */}
        {activeTab === 'coldchain' && user?.role !== 'brics_analyst' && (
          <TransfersView
            transfers={displayedTransfers}
            facilities={facilities}
            skus={skus}
            onRefresh={refreshData}
            isLoading={isLoading}
            initialSubTab="coldchain"
          />
        )}

        {/* 8. DISTRICT STOCK & EXPIRY RADAR */}
        {activeTab === 'stock' && user?.role !== 'brics_analyst' && (
          <StockView
            facilities={facilities}
            onRefreshAll={refreshData}
            outbreakMultiplier={outbreakMultiplier}
            onSetOutbreakMultiplier={handleSetOutbreakMultiplier}
          />
        )}

        {/* 9. BRICS FEDERATION INDICES */}
        {activeTab === 'federation' && (
          <FederationView initialSubTab="indices" />
        )}

        {/* 10. AI FEDERATED MODELS */}
        {activeTab === 'models' && (
          <FederationView initialSubTab="model-card" />
        )}

        {/* 11. ZERO-PHI AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <FederationView initialSubTab="audit" />
        )}

        {/* Facility Detail Slide-over Drawer for Map selections */}
        {selectedFacility && (
          <FacilityDrawer
            facility={selectedFacility}
            onClose={() => setSelectedFacility(null)}
            onOpenTransferModal={(facId, skuId) => {
              setSelectedFacility(null);
              setActiveTab('transfers');
            }}
            onRefreshMap={refreshData}
          />
        )}
      </main>

      {/* Role-Aware Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={displayedAlerts.length}
        transferCount={displayedTransfers.filter((t) => t.status === 'proposed').length}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ArogyaNetApp />
    </AuthProvider>
  );
}
