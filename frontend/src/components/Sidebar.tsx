import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  CheckSquare,
  RefreshCw,
  Building,
  BarChart3,
  History,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  onOpenNewFDR: () => void;
}

export const Sidebar: React.FC<Props> = ({ onOpenNewFDR }) => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/',
      label: 'Executive Dashboard',
      icon: <LayoutDashboard size={18} />,
      roles: ['system_admin', 'aicte_officer', 'bank_officer', 'institution_admin', 'auditor'],
    },
    {
      to: '/fdrs',
      label: 'FDR Depository',
      icon: <FileCheck2 size={18} />,
      roles: ['system_admin', 'aicte_officer', 'bank_officer', 'institution_admin', 'auditor'],
    },
    {
      to: '/verification',
      label: '3-Way Verification Desk',
      icon: <CheckSquare size={18} />,
      badge: 'Live',
      roles: ['system_admin', 'aicte_officer', 'bank_officer'],
    },
    {
      to: '/lifecycle',
      label: 'Lifecycle & Renewals',
      icon: <RefreshCw size={18} />,
      roles: ['system_admin', 'aicte_officer', 'institution_admin', 'auditor'],
    },
    {
      to: '/institutions',
      label: 'Approved Institutions',
      icon: <Building size={18} />,
      roles: ['system_admin', 'aicte_officer', 'auditor'],
    },
    {
      to: '/reports',
      label: 'Compliance Reports',
      icon: <BarChart3 size={18} />,
      roles: ['system_admin', 'aicte_officer', 'auditor'],
    },
    {
      to: '/audit',
      label: 'Regulatory Audit Log',
      icon: <History size={18} />,
      roles: ['system_admin', 'auditor'],
    },
  ];

  const allowedNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#ffffff',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '1.5rem 1.25rem' }}>
        {/* New FDR Action Button */}
        {(user?.role === 'institution_admin' || user?.role === 'system_admin' || user?.role === 'aicte_officer') && (
          <button
            onClick={onOpenNewFDR}
            className="btn btn-saffron"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.875rem',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)',
            }}
          >
            <PlusCircle size={18} />
            <span>Submit New FDR</span>
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#94a3b8',
            padding: '0.5rem 0.75rem',
          }}
        >
          Main Depository
        </div>

        {allowedNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.7rem 0.875rem',
              borderRadius: '10px',
              color: isActive ? '#1d4ed8' : '#475569',
              backgroundColor: isActive ? '#eff6ff' : 'transparent',
              borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              transition: 'all 0.18s ease',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  padding: '0.125rem 0.45rem',
                  borderRadius: '9999px',
                }}
              >
                <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }} />
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Regulatory Badge */}
      <div
        style={{
          margin: '1.25rem 1rem',
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <ShieldAlert size={16} color="#f97316" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
            APH Regulations
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.45 }}>
          Joint FDR with AICTE Regional Officer & mandatory auto-renewal compliance.
        </div>
      </div>
    </aside>
  );
};
