import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Shield,
  Bell,
  LogOut,
  Sparkles,
  ChevronDown,
  Building2,
  CheckCircle,
} from 'lucide-react';

interface Props {
  onOpenAIAdvisor: () => void;
}

export const Header: React.FC<Props> = ({ onOpenAIAdvisor }) => {
  const { user, logout, switchRoleDemo } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <div>
      <div className="gov-ribbon" />
      <header className="portal-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.22)',
            }}
          >
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                CredNex
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  border: '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="live-pulse-dot" style={{ width: '5px', height: '5px' }} />
                Central Portal
              </span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
              AICTE Centralized Security Deposit & FDR Management System
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* AI Advisor Button */}
          <button
            onClick={onOpenAIAdvisor}
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              color: '#166534',
              border: '1px solid #bbf7d0',
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} color="#15803d" />
            <span>AI Regulatory Assistant</span>
          </button>

          {/* Quick Role Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="btn btn-outline btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: '#cbd5e1',
                background: '#ffffff',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Role: <strong style={{ color: '#1e40af' }}>{user?.role?.replace(/_/g, ' ').toUpperCase()}</strong>
              </span>
              <ChevronDown size={14} color="#64748b" />
            </button>

            {showRoleMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  width: '280px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid #e2e8f0',
                  padding: '0.5rem',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    padding: '0.375rem 0.5rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Switch Portal Persona
                </div>
                {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).map((roleKey) => {
                  const cred = DEMO_CREDENTIALS[roleKey];
                  const isCurrent = user?.role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      onClick={() => {
                        switchRoleDemo(roleKey);
                        setShowRoleMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: isCurrent ? '#eff6ff' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: isCurrent ? '#1d4ed8' : '#1e293b',
                          }}
                        >
                          {cred.label}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {cred.desc}
                        </div>
                      </div>
                      {isCurrent && <CheckCircle size={14} color="#2563eb" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid #e2e8f0',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                {user?.full_name || 'Authorized User'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="btn btn-outline btn-sm"
              style={{ padding: '0.5rem', color: '#dc2626' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};
