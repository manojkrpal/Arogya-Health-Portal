import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  MapPin,
  Bell,
  Package,
  ArrowLeftRight,
  Globe2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export type TabType = 'map' | 'alerts' | 'stock' | 'transfers' | 'federation' | 'audit';

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
  const isAuditor = user?.role === 'compliance_auditor';
  const canViewAudit = ['compliance_auditor', 'national_war_room', 'state_admin', 'district_officer'].includes(user?.role || '');

  const baseNavItems = [
    { id: 'map', label: 'Map', icon: MapPin, restrictedForBrics: true, hideForAuditor: true },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount, restrictedForBrics: true, hideForAuditor: false },
    { id: 'stock', label: 'Stock', icon: Package, restrictedForBrics: true, hideForAuditor: false },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight, badge: transferCount, restrictedForBrics: true, hideForAuditor: false },
    { id: 'audit', label: 'Audit', icon: ShieldCheck, restrictedForBrics: true, hideForAuditor: false, showOnlyFor: canViewAudit },
    { id: 'federation', label: 'BRICS', icon: Globe2, restrictedForBrics: false, hideForAuditor: false },
  ];

  const navItems = baseNavItems.filter((item) => {
    if (item.showOnlyFor !== undefined && !item.showOnlyFor) return false;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 safe-area-bottom">
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isRestricted = isBrics && item.restrictedForBrics;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              disabled={isRestricted}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all ${
                isRestricted
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : isActive
                  ? 'text-teal-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isRestricted && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-rose-400" />
                )}
                {item.badge !== undefined && item.badge > 0 && !isRestricted && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-teal-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

