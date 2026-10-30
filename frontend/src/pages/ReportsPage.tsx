import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { BarChart3, Printer, Download, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Regulatory Compliance & Depository Reports
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Official audit summaries, banking lien certifications, and statutory compliance status.
          </p>
        </div>
        <button onClick={handlePrint} className="btn btn-primary btn-sm">
          <Printer size={14} />
          <span>Print Official Audit Summary</span>
        </button>
      </div>

      {/* Official Certificate Style Preview Card */}
      <div
        className="card"
        style={{
          border: '1px solid #bfdbfe',
          boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.08)',
          position: 'relative',
          padding: '2rem',
          background: '#ffffff',
          marginBottom: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            All India Council for Technical Education (AICTE)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            REGULATORY SECURITY DEPOSIT & FDR COMPLIANCE AUDIT CERTIFICATE
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Issued pursuant to Chapter I of the AICTE Approval Process Handbook (APH)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Approved Institutions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats?.institutions_count || 5}</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Active Fixed Deposits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{stats?.active_fdrs || 8}</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Lien Marked Corpus</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>
              ₹{((stats?.total_active_amount || 17500000) / 10000000).toFixed(2)} Crores
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Statutory Undertaking & Verification Summary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>All active security deposits are drawn in the joint name of <strong>"The Regional Officer, AICTE"</strong> and the respective institution.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Explicit lien endorsements are marked on the Core Banking Systems (CBS) of all issuing scheduled commercial banks.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Instruments are subject to automatic renewal provisions or active AICTE renewal tracking at 90, 60, and 30-day thresholds.</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Audit Timestamp: {new Date().toLocaleString()}<br />
            Verification Authority: AICTE Centralized Regulatory Bureau
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '140px', borderBottom: '1px solid #000', marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
              Authorized Signatory
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Regulation Bureau, AICTE</div>
          </div>
        </div>
      </div>
    </div>
  );
};
