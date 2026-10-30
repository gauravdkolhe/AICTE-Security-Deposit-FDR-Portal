import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats, FDR } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck2,
  IndianRupee,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Landmark,
  Compass,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  onOpenFDR: (fdr: FDR) => void;
  onOpenNewFDR: () => void;
}

export const DashboardPage: React.FC<Props> = ({ onOpenFDR, onOpenNewFDR }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [maturityAlerts, setMaturityAlerts] = useState<FDR[]>([]);
  const [recentFDRs, setRecentFDRs] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsData, alertsData, fdrsData] = await Promise.all([
        api.getDashboardStats(),
        api.getMaturityAlerts(90),
        api.getFDRs({ limit: 6 }),
      ]);
      setStats(statsData);
      setMaturityAlerts(alertsData);
      setRecentFDRs(fdrsData.items);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatLakhsCrores = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amount / 100000).toFixed(2)} Lakhs`;
  };

  const getBankColor = (index: number) => {
    const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
    return palette[index % palette.length];
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <RefreshCw size={36} className="spin" color="#2563eb" style={{ margin: '0 auto 1.25rem' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Loading Centralized FDR Depository</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Aggregating verified liens, compliance schedules, and institutional records...
        </p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Top Banner & Quick Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Executive Regulatory Dashboard
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: '#ecfdf5',
                color: '#047857',
                fontSize: '0.725rem',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }} />
              Live & Synchronized
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '720px' }}>
            Centralized institutional fixed deposit depository, statutory lien records, and automated maturity compliance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-outline btn-sm"
            style={{ minWidth: '92px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <button onClick={onOpenNewFDR} className="btn btn-saffron btn-sm">
            <PlusCircle size={15} />
            <span>Submit FDR</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        {/* Card 1: Active Deposits */}
        <div className="stat-card blue">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Security Deposits
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
              {stats?.active_fdrs ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#047857', fontWeight: 600, marginTop: '0.35rem' }}>
              <TrendingUp size={13} />
              <span>Out of {stats?.total_fdrs ?? 0} Total Deposited</span>
            </div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck2 size={24} />
          </div>
        </div>

        {/* Card 2: Total Corpus */}
        <div className="stat-card green">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Lien Corpus
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
              {formatLakhsCrores(stats?.total_active_amount ?? 0)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '0.35rem' }}>
              <Building2 size={13} color="#64748b" />
              <span>Across {stats?.institutions_count ?? 0} Institutions</span>
            </div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IndianRupee size={24} />
          </div>
        </div>

        {/* Card 3: 3-Way Verification */}
        <div className="stat-card amber">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Verifications
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
              {stats?.pending_verification ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: (stats?.discrepancy_count ?? 0) > 0 ? '#b45309' : '#059669', fontWeight: 600, marginTop: '0.35rem' }}>
              {stats?.discrepancy_count ?? 0} Discrepancies Flagged
            </div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '12px',
              backgroundColor: '#fffbeb',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} />
          </div>
        </div>

        {/* Card 4: Maturity Pipeline */}
        <div className="stat-card saffron">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Maturity Pipeline (&lt;90 Days)
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
              {(stats?.maturing_30_days ?? 0) + (stats?.maturing_60_days ?? 0) + (stats?.maturing_90_days ?? 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 700, marginTop: '0.35rem' }}>
              {stats?.maturing_30_days ?? 0} due within 30 days
            </div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '12px',
              backgroundColor: '#fff7ed',
              color: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Critical Maturity Pipeline Alert Strip */}
      {maturityAlerts.length > 0 && (
        <div
          style={{
            marginBottom: '1.75rem',
            padding: '1.35rem 1.5rem',
            backgroundColor: '#fffbf5',
            border: '1px solid #fed7aa',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={16} color="#ea580c" />
              </div>
              <div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#9a3412' }}>
                  FDRs Approaching Maturity &mdash; Action Required
                </span>
                <div style={{ fontSize: '0.725rem', color: '#c2410c' }}>
                  Automated renewal notices dispatched per APH regulatory guidelines.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/lifecycle')}
              className="btn btn-outline btn-sm"
              style={{
                fontSize: '0.725rem',
                borderColor: '#fed7aa',
                backgroundColor: '#ffffff',
                color: '#9a3412',
                fontWeight: 700,
              }}
            >
              <span>Manage Renewals</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.875rem',
            }}
          >
            {maturityAlerts.slice(0, 4).map((fdr) => (
              <div
                key={fdr.id}
                onClick={() => onOpenFDR(fdr)}
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #fed7aa',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(234, 88, 12, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    {fdr.fdr_number}
                  </span>
                  <span
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                    }}
                  >
                    Due: {fdr.maturity_date}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fdr.institution?.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669' }}>
                    ₹{fdr.deposit_amount.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>
                    {fdr.issuing_bank}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Bank Distribution & Regional Jurisdiction */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Issuing Bank Distribution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={18} color="#2563eb" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Issuing Bank Distribution
                </h3>
                <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Scheduled Commercial Banks</span>
              </div>
            </div>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              CBS Endorsed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats?.bank_distribution &&
              Object.entries(stats.bank_distribution).map(([bank, count], idx) => {
                const total = stats.total_fdrs || 1;
                const pct = Math.round((count / total) * 100);
                const barColor = getBankColor(idx);
                return (
                  <div key={bank}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{bank}</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                        {count} FDRs <span style={{ color: '#94a3b8' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '9999px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: barColor,
                          borderRadius: '9999px',
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Regional Jurisdiction */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={18} color="#ea580c" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  AICTE Regional Jurisdiction
                </h3>
                <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Statutory Regional Bureaus</span>
              </div>
            </div>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#ea580c', backgroundColor: '#fff7ed', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              Joint Holdings
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats?.region_distribution &&
              Object.entries(stats.region_distribution).map(([region, count]) => {
                const total = stats.total_fdrs || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={region}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{region} Region</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                        {count} FDRs <span style={{ color: '#94a3b8' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '9999px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: '#f97316',
                          borderRadius: '9999px',
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recently Logged Security Deposits */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                Recently Logged Security Deposits
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                }}
              >
                {recentFDRs.length} Latest
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Verified deposits from institutional submissions and bank Core Banking lien records.
            </p>
          </div>
          <button
            onClick={() => navigate('/fdrs')}
            className="btn btn-outline btn-sm"
            style={{ fontWeight: 600 }}
          >
            <span>View All FDRs</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>FDR Number</th>
                <th>Institution</th>
                <th>Bank & Branch</th>
                <th>Deposit Amount</th>
                <th>Maturity Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentFDRs.map((fdr) => (
                <tr key={fdr.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.75rem',
                        backgroundColor: '#f8fafc',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                      }}
                    >
                      {fdr.fdr_record_id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    {fdr.fdr_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {fdr.institution?.name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      PID: {fdr.institution?.aicte_permanent_id || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {fdr.issuing_bank}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {fdr.bank_branch}
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.9375rem' }}>
                    ₹{fdr.deposit_amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {fdr.maturity_date}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={fdr.status} size="sm" />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onOpenFDR(fdr)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.35rem 0.65rem' }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
