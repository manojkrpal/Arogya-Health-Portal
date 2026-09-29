import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrentUser } from '../types/client.js';
import { Language, translations, TranslationDict } from '../lib/i18n.js';

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  lang: Language;
  t: TranslationDict;
  setLang: (lang: Language) => void;
  login: (email: string, pass: string) => Promise<void>;
  switchRole: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  dbEngine: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS = [
  {
    role: 'phc_nurse',
    title: 'PHC Nurse',
    facility: 'Shirur PHC',
    email: 'nurse@shirur.phc.gov.in',
    password: 'nurse123',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    role: 'phc_nurse',
    title: 'CHC Nurse',
    facility: 'Manchar CHC',
    email: 'nurse@manchar.chc.gov.in',
    password: 'nurse123',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  },
  {
    role: 'district_officer',
    title: 'District Officer',
    facility: 'Pune District',
    email: 'officer@pune.health.gov.in',
    password: 'officer123',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    role: 'national_war_room',
    title: 'War Room (MoHFW)',
    facility: 'National Command',
    email: 'warroom@mohfw.gov.in',
    password: 'warroom123',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    role: 'brics_analyst',
    title: 'BRICS Analyst',
    facility: 'Federation ESS',
    email: 'analyst@brics-health.org',
    password: 'analyst123',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('arogyanet_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbEngine, setDbEngine] = useState<string>('PostgreSQL');
  const [lang, setLangState] = useState<Language>(
    (localStorage.getItem('arogyanet_lang') as Language) || 'en'
  );
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('arogyanet_lang', newLang);
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Authentication failed (${res.status})`);
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      if (data.dbEngine) setDbEngine(data.dbEngine);
      localStorage.setItem('arogyanet_token', data.token);
    } catch (err: any) {
      console.warn('Network login attempt failed, evaluating demo user fallback:', err);
      const demo = DEMO_USERS.find((d) => d.email.toLowerCase() === email.toLowerCase());
      if (demo) {
        const fallbackUser: CurrentUser = {
          id: demo.role === 'national_war_room'
            ? '90000000-0000-0000-0000-000000000003'
            : demo.role === 'district_officer'
            ? '90000000-0000-0000-0000-000000000002'
            : demo.role === 'brics_analyst'
            ? '90000000-0000-0000-0000-000000000004'
            : demo.facility === 'Manchar CHC'
            ? '90000000-0000-0000-0000-000000000005'
            : '90000000-0000-0000-0000-000000000001',
          email: demo.email,
          role: demo.role as any,
          tenantId: '11111111-1111-1111-1111-111111111111',
          tenantName: demo.role === 'national_war_room' ? 'National Command Centre (MoHFW)' : 'Pune Rural District',
          countryCode: 'IN',
          facilityId: demo.facility === 'Shirur PHC'
            ? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
            : demo.facility === 'Manchar CHC'
            ? 'cccccccc-cccc-cccc-cccc-cccccccccccc'
            : null,
          facilityName: demo.facility,
        };
        setUser(fallbackUser);
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (email: string, pass: string) => {
    await login(email, pass);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('arogyanet_token');
  };

  // Restore session or auto-login with default nurse account for zero-click instant usability
  useEffect(() => {
    async function restoreSession() {
      if (token) {
        try {
          const res = await fetch('/v1/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            if (data.dbEngine) setDbEngine(data.dbEngine);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Session token invalid, auto-logging into default demo account');
        }
      }

      // Default start as District Officer (Pune) so all clinics & transfers are immediately visible
      try {
        await login('officer@pune.health.gov.in', 'officer123');
      } catch (err) {
        console.error('Auto login failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isOnline,
        lang,
        t: translations[lang] || translations.en,
        setLang,
        login,
        switchRole,
        logout,
        dbEngine,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
