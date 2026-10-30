import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; label: string; desc: string }> = {
  system_admin: {
    email: 'admin@aicte.gov.in',
    pass: 'Admin@12345',
    label: 'System Admin',
    desc: 'Full regulatory control, audit trail & system configs',
  },
  aicte_officer: {
    email: 'officer@aicte.gov.in',
    pass: 'Officer@12345',
    label: 'AICTE Officer',
    desc: 'Verify FDR compliance, approve renewals, releases',
  },
  bank_officer: {
    email: 'bank@sbi.co.in',
    pass: 'Bank@12345',
    label: 'Bank Officer (SBI)',
    desc: 'Authenticate FDRs, confirm lien marking & authenticity',
  },
  institution_admin: {
    email: 'inst@mit.edu.in',
    pass: 'Inst@12345',
    label: 'Institution Admin',
    desc: 'Submit new FDRs, request renewals & replacements',
  },
  auditor: {
    email: 'admin@aicte.gov.in',
    pass: 'Admin@12345',
    label: 'Regulatory Auditor',
    desc: 'Compliance monitoring and audit oversight',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aicte_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('aicte_token');
      const savedUser = localStorage.getItem('aicte_user');

      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend
          const freshUser = await api.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem('aicte_user', JSON.stringify(freshUser));
        } catch {
          // If token expired, clear
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('aicte_token', res.access_token);
      localStorage.setItem('aicte_user', JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aicte_token');
    localStorage.removeItem('aicte_user');
    setToken(null);
    setUser(null);
  };

  const switchRoleDemo = async (role: UserRole) => {
    const cred = DEMO_CREDENTIALS[role];
    if (cred) {
      await login(cred.email, cred.pass);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRoleDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
