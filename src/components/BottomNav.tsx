import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  MapPin,
  Bell,
  Package,
  ArrowLeftRight,
  Globe2,
  Lock,
  Truck,
} from 'lucide-react';

export type TabType = 'map' | 'alerts' | 'stock' | 'transfers' | 'coldchain' | 'logistics' | 'federation' | 'audit';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  alertCount: number;
  transferCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  transferCount,
}) => {
  const { user } = useAuth();
  const isBrics = user?.role === 'brics_analyst';

  // Primary 5 Navigation Items
  const navItems = [
    {
      id: 'map',
      label: 'PHC Network',
      icon: MapPin,
      restrictedForBrics: true,
      activeMatcher: (tab: TabType) => tab === 'map',
    },
    {
      id: 'alerts',
      label: 'AI Forecast',
      icon: Bell,
      badge: alertCount,
      restrictedForBrics: true,
      activeMatcher: (tab: TabType) => tab === 'alerts',
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: Package,
      restrictedForBrics: true,
      activeMatcher: (tab: TabType) => tab === 'stock',
    },
    {
      id: 'transfers',
      label: 'Redistribute',
      icon: Truck,
      badge: transferCount,
      restrictedForBrics: true,
      activeMatcher: (tab: TabType) => ['transfers', 'coldchain', 'logistics'].includes(tab),
    },
    {
      id: 'federation',
      label: 'BRICS',
      icon: Globe2,
      restrictedForBrics: false,
      activeMatcher: (tab: TabType) => ['federation', 'audit'].includes(tab),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 safe-area-bottom shadow-2xl">
      <div className="max-w-xl mx-auto grid grid-cols-5 px-2 py-1.5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isRestricted = isBrics && item.restrictedForBrics;
          const isActive = item.activeMatcher(activeTab);

          return (
            <button
              key={item.id}
              disabled={isRestricted}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isRestricted
                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                  : isActive
                  ? 'bg-slate-900/90 text-teal-300 font-bold border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-teal-400' : 'stroke-2'}`} />
                {isRestricted && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-rose-400" />
                )}
                {item.badge !== undefined && item.badge > 0 && !isRestricted && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none animate-pulse shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight leading-none truncate max-w-full ${isActive ? 'text-teal-300 font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
