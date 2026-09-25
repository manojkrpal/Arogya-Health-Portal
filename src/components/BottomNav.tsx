import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  MapPin,
  Bell,
  Package,
  Globe2,
  Lock,
  Truck,
  Building2,
  ShoppingCart,
  ShieldCheck,
  Snowflake,
  Cpu,
} from 'lucide-react';

export type TabType =
  | 'map'
  | 'alerts'
  | 'facility'
  | 'transfers'
  | 'coldchain'
  | 'grid'
  | 'orders'
  | 'stock'
  | 'federation'
  | 'models'
  | 'audit';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  alertCount: number;
  transferCount: number;
}

interface NavItemConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  activeMatcher: (tab: TabType) => boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  transferCount,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'district_officer';

  // Role-Specific Navigation Configurations
  const getNavItems = (): NavItemConfig[] => {
    switch (role) {
      case 'phc_nurse':
        return [
          {
            id: 'facility',
            label: 'My Facility',
            icon: Building2,
            activeMatcher: (tab) => tab === 'facility',
          },
          {
            id: 'coldchain',
            label: 'Cold-Chain IoT',
            icon: Snowflake,
            activeMatcher: (tab) => tab === 'coldchain',
          },
          {
            id: 'alerts',
            label: 'Facility Alerts',
            icon: Bell,
            badge: alertCount,
            activeMatcher: (tab) => tab === 'alerts',
          },
          {
            id: 'transfers',
            label: 'Transfers',
            icon: Truck,
            badge: transferCount,
            activeMatcher: (tab) => tab === 'transfers',
          },
        ];

      case 'national_war_room':
        return [
          {
            id: 'grid',
            label: 'National Grid',
            icon: Building2,
            activeMatcher: (tab) => tab === 'grid',
          },
          {
            id: 'orders',
            label: 'Drug Orders (POs)',
            icon: ShoppingCart,
            activeMatcher: (tab) => tab === 'orders',
          },
          {
            id: 'alerts',
            label: 'Epidemic Watch',
            icon: Bell,
            badge: alertCount,
            activeMatcher: (tab) => tab === 'alerts',
          },
          {
            id: 'map',
            label: 'National Map',
            icon: MapPin,
            activeMatcher: (tab) => tab === 'map',
          },
          {
            id: 'audit',
            label: 'Audit Trail',
            icon: ShieldCheck,
            activeMatcher: (tab) => tab === 'audit',
          },
        ];

      case 'brics_analyst':
        return [
          {
            id: 'federation',
            label: 'BRICS Indices',
            icon: Globe2,
            activeMatcher: (tab) => tab === 'federation',
          },
          {
            id: 'models',
            label: 'AI Models',
            icon: Cpu,
            activeMatcher: (tab) => tab === 'models',
          },
          {
            id: 'audit',
            label: 'Zero-PHI Audit',
            icon: ShieldCheck,
            activeMatcher: (tab) => tab === 'audit',
          },
        ];

      case 'district_officer':
      default:
        return [
          {
            id: 'map',
            label: 'District Map',
            icon: MapPin,
            activeMatcher: (tab) => tab === 'map',
          },
          {
            id: 'alerts',
            label: 'AI Forecast',
            icon: Bell,
            badge: alertCount,
            activeMatcher: (tab) => tab === 'alerts',
          },
          {
            id: 'transfers',
            label: 'Redistribute',
            icon: Truck,
            badge: transferCount,
            activeMatcher: (tab) => tab === 'transfers',
          },
          {
            id: 'stock',
            label: 'District Stock',
            icon: Package,
            activeMatcher: (tab) => tab === 'stock',
          },
          {
            id: 'coldchain',
            label: 'Cold-Chain',
            icon: Snowflake,
            activeMatcher: (tab) => tab === 'coldchain',
          },
        ];
    }
  };

  const navItems = getNavItems();
  const gridColsClass =
    navItems.length === 3
      ? 'grid-cols-3 max-w-sm'
      : navItems.length === 4
      ? 'grid-cols-4 max-w-lg'
      : 'grid-cols-5 max-w-2xl';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 safe-area-bottom shadow-2xl">
      <div className={`mx-auto grid ${gridColsClass} px-2 py-1.5 gap-1`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeMatcher(activeTab);

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-teal-400' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none animate-pulse shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight leading-none truncate max-w-full ${
                  isActive ? 'text-teal-300 font-bold' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
