import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext.js';
import { LANGUAGE_OPTIONS, Language } from '../lib/i18n.js';
import { VoiceNurseAssistantModal } from './VoiceNurseAssistantModal.js';
import { UserManualModal } from './UserManualModal.js';
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Languages,
  ChevronDown,
  Mic,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  outbreakMultiplier: number;
  activeLabel: string;
  onLogoClick?: () => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  outbreakMultiplier,
  activeLabel,
  onLogoClick,
  onRefreshData,
}) => {
  const { user, switchRole, lang, setLang, t } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === lang) || LANGUAGE_OPTIONS[0];

  return (
    <>
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

        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2">
          {/* Logo & Title */}
          <button
            id="navbar-logo-btn"
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-1.5 sm:gap-2.5 text-left group hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg p-0.5 cursor-pointer min-w-0 shrink"
            title="Go to Map (Home)"
            aria-label="ArogyaNet Home"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-base font-bold text-slate-100 tracking-tight leading-none group-hover:text-teal-300 transition-colors truncate">
                  <span className="sm:hidden">ArogyaNet</span>
                  <span className="hidden sm:inline">{t.appName || 'ArogyaNet'}</span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-tight hidden md:block">
                {t.nationalGrid || 'National Medicine, Bed & Attendance Grid'}
              </p>
            </div>
          </button>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Voice Assistant Mic Button for Remote Nurses */}
            <button
              id="voice-assistant-navbar-btn"
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center justify-center w-7 h-7 sm:w-auto sm:h-auto p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 hover:text-teal-200 text-xs font-semibold border border-teal-500/30 transition shadow-sm animate-pulse-subtle shrink-0"
              title="Voice Assistant: Dictate inventory updates in English, Hindi, Marathi, Bengali"
            >
              <Mic className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="hidden md:inline ml-1.5">Voice Assistant</span>
            </button>

            {/* User Manual Button (Interactive Guide & PDF Reader) */}
            <button
              id="user-manual-btn"
              type="button"
              onClick={() => setShowManualModal(true)}
              className="flex items-center justify-center w-7 h-7 sm:w-auto sm:h-auto p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-sky-200 text-xs font-semibold border border-sky-500/30 transition shadow-sm cursor-pointer shrink-0"
              title="Open ArogyaNet User Manual, Interactive Field Guide & PDF"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden md:inline ml-1.5">User Manual</span>
            </button>

            {/* Multilingual Selector Dropdown (English, Hindi, Marathi, Bengali) */}
            <div className="relative shrink-0">
              <button
                id="language-selector-btn"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center justify-center h-7 sm:h-auto px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shrink-0"
                title="Select interface and AI voice language"
              >
                <span className="text-xs">
                  {currentLang.flag}
                </span>
                <span className="font-medium hidden sm:inline ml-1">
                  {currentLang.scriptName}
                </span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {showLangMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-1.5 z-50 text-xs">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60 mb-1">
                      Regional Language
                    </div>
                    <div className="space-y-0.5">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.code}
                          onClick={() => {
                            setLang(opt.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                            lang === opt.code
                              ? 'bg-teal-500/20 text-teal-300 font-semibold'
                              : 'hover:bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{opt.flag}</span>
                            <span>{opt.scriptName}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({opt.code})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Role Switcher Pill */}
            <div className="relative shrink-0">
              <button
                id="role-switcher-btn"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1 h-7 sm:h-auto px-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium border border-slate-700 transition text-left shrink-0"
                title="Switch Demo Role"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-slate-200 font-semibold text-[11px] sm:text-xs">
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
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
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

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <VoiceNurseAssistantModal
          onClose={() => setShowVoiceModal(false)}
          onStockUpdated={() => {
            onRefreshData?.();
          }}
        />
      )}

      {/* Official Field User Manual Modal (Interactive Guide, Embedded PDF & Download) */}
      <UserManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />
    </>
  );
};

