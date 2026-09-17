import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext.js';
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Languages,
  Wifi,
  WifiOff,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  outbreakMultiplier: number;
  activeLabel: string;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  outbreakMultiplier,
  activeLabel,
  onLogoClick,
}) => {
  const { user, switchRole, lang, setLang, isOnline } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800">
      {/* Outbreak Multiplier Banner if active */}
      {outbreakMultiplier > 1.0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 text-center text-xs font-medium text-amber-300 flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>{activeLabel || 'Outbreak Alert'}:</strong> {outbreakMultiplier}x demand surge applied to stockout risk thresholds
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Logo & Title (Clicking navigates to Map / Home) */}
        <button
          id="navbar-logo-btn"
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-2.5 text-left group hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg p-0.5 -m-0.5 cursor-pointer"
          title="Go to Map (Home)"
          aria-label="ArogyaNet Home"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none group-hover:text-teal-300 transition-colors">
                ArogyaNet
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/20">
                PHC MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal leading-tight hidden xs:block">
              National Medicine, Bed & Attendance Grid
            </p>
          </div>
        </button>

        {/* Right Action Controls: Network status, Language, Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online/Offline status */}
          <div
            id="network-status-badge"
            title={isOnline ? 'Connected (Cloud SQL real-time sync)' : 'Offline mode'}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-rose-400" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Hindi/English Toggle (Accessible everywhere) */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Toggle Gemini advisory language between English and Hindi"
          >
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
          </button>

          {/* Quick Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium border border-slate-700 transition text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div className="leading-tight">
                <span className="text-[10px] text-slate-400 block font-normal">Role:</span>
                <span className="text-slate-200 font-semibold truncate max-w-[90px] sm:max-w-none block">
                  {user?.role === 'phc_nurse'
                    ? 'Nurse'
                    : user?.role === 'district_officer'
                    ? 'Officer'
                    : user?.role === 'national_war_room'
                    ? 'War Room'
                    : user?.role === 'brics_analyst'
                    ? 'BRICS'
                    : 'Switch'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Role Selector */}
            {showRoleMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRoleMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-2 z-50 text-xs">
                  <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60 pb-1.5 mb-1">
                    Select Role (Instant Switch)
                  </div>
                  <div className="space-y-1">
                    {DEMO_USERS.map((u) => {
                      const isActive = user?.email === u.email;
                      return (
                        <button
                          key={u.email}
                          onClick={() => {
                            switchRole(u.email, u.password);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg flex flex-col transition border ${
                            isActive
                              ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                              : 'hover:bg-slate-700/50 border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{u.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${u.badgeColor}`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5">{u.facility}</span>
                          <span className="text-[10px] text-slate-500 truncate font-mono">{u.email}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 px-1">
                    Strict RBAC & Postgres RLS enforced per role.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
