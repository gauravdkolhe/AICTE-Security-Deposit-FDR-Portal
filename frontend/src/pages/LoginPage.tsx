import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Building, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@aicte.gov.in');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    }
  };

  const setDemoRole = (role: UserRole) => {
    const cred = DEMO_CREDENTIALS[role];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.pass);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
      }}
    >
      <div className="gov-ribbon" />

      {/* Top Banner */}
      <div
        style={{
          padding: '1.25rem 2rem',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.22)',
            }}
          >
            <Shield size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>CredNex</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', background: '#eff6ff', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>AICTE</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Centralized Security Deposit & Fixed Deposit Receipt (FDR) Depository
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#ecfdf5',
            color: '#047857',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            border: '1px solid #a7f3d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }} />
          Official Central Depository
        </span>
      </div>

      {/* Main Login Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-xl)',
            padding: '2.5rem',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Regulatory Portal Login
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.375rem' }}>
              Enter authorized credentials to access regulatory deposit records.
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Authorized Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@aicte.gov.in"
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Secure Access Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick 1-Click Persona Selector */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#94a3b8',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
                textAlign: 'center',
              }}
            >
              Fast 1-Click Demo Evaluation Personas
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).slice(0, 4).map((roleKey) => {
                const cred = DEMO_CREDENTIALS[roleKey];
                const isSelected = email === cred.email;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setDemoRole(roleKey)}
                    style={{
                      padding: '0.625rem',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {cred.label}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                      {cred.email.split('@')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
