import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RenewalRequest, ReplacementRequest, ReleaseRefundRequest, FDR } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  RefreshCw,
  Replace,
  FileCheck,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface Props {
  onOpenFDR: (fdr: FDR) => void;
}

export const LifecyclePage: React.FC<Props> = ({ onOpenFDR }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'renewals' | 'replacements' | 'releases' | 'maturing'>('renewals');
  const [loading, setLoading] = useState(true);

  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([]);
  const [releases, setReleases] = useState<ReleaseRefundRequest[]>([]);
  const [maturingFDRs, setMaturingFDRs] = useState<FDR[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ren, rep, rel, mat] = await Promise.all([
        api.getRenewalRequests(),
        api.getReplacementRequests(),
        api.getReleaseRequests(),
        api.getMaturityAlerts(90),
      ]);
      setRenewals(ren);
      setReplacements(rep);
      setReleases(rel);
      setMaturingFDRs(mat);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveRenewal = async (id: string) => {
    const newMaturity = prompt('Enter new maturity date (YYYY-MM-DD):', new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!newMaturity) return;

    try {
      await api.approveRenewal(id, {
        new_maturity_date: newMaturity,
        notes: 'Renewal approved following APH compliance review.',
      });
      alert('Renewal approved successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Renewal approval failed');
    }
  };

  const handleApproveRelease = async (id: string) => {
    const reason = prompt('Enter AICTE NOC / Release confirmation notes:', 'Prescribed 10-year period completed. No pending liabilities.');
    if (!reason) return;

    try {
      await api.approveRelease(id, { notes: reason });
      alert('Release authorized. AICTE Encashment Clearance certificate issued.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Release approval failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            FDR Lifecycle Management & Renewals
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Comprehensive workflow tracking for fixed deposit renewals, replacements, and release upon term completion.
          </p>
        </div>
        <button onClick={loadData} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('renewals')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: activeTab === 'renewals' ? '#1e40af' : '#64748b',
            borderBottom: activeTab === 'renewals' ? '3px solid #1e40af' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          Renewals Queue ({renewals.length})
        </button>

        <button
          onClick={() => setActiveTab('replacements')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: activeTab === 'replacements' ? '#1e40af' : '#64748b',
            borderBottom: activeTab === 'replacements' ? '3px solid #1e40af' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          Replacements & Mergers ({replacements.length})
        </button>

        <button
          onClick={() => setActiveTab('releases')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: activeTab === 'releases' ? '#1e40af' : '#64748b',
            borderBottom: activeTab === 'releases' ? '3px solid #1e40af' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          Release & Refund Requests ({releases.length})
        </button>

        <button
          onClick={() => setActiveTab('maturing')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: activeTab === 'maturing' ? '#c2410c' : '#64748b',
            borderBottom: activeTab === 'maturing' ? '3px solid #ea580c' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          Maturity Tracker (Next 90 Days) ({maturingFDRs.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="card">
        {activeTab === 'renewals' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Pending Renewal Applications
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>FDR Number</th>
                    <th>Institution</th>
                    <th>Requested Extension</th>
                    <th>Reason / Justification</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No pending renewal requests.
                      </td>
                    </tr>
                  ) : (
                    renewals.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <code>{r.request_number}</code>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.fdr?.fdr_number}</td>
                        <td>{r.fdr?.institution?.name}</td>
                        <td>
                          <strong>{r.requested_tenure_months} Months</strong> ({(r.requested_tenure_months / 12).toFixed(1)} Years)
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: '#475569' }}>
                          {r.reason || 'Routine regulatory tenure extension'}
                        </td>
                        <td>
                          <StatusBadge status={r.status} size="sm" />
                        </td>
                        <td>
                          {(user?.role === 'aicte_officer' || user?.role === 'system_admin') && (
                            <button
                              onClick={() => handleApproveRenewal(r.id)}
                              className="btn btn-sm btn-primary"
                            >
                              Approve Renewal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'replacements' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              FDR Replacement & Restructuring Requests
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Original FDR No</th>
                    <th>Institution</th>
                    <th>Replacement Reason</th>
                    <th>Status</th>
                    <th>Date Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {replacements.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No replacement applications on record.
                      </td>
                    </tr>
                  ) : (
                    replacements.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <code>{rep.request_number}</code>
                        </td>
                        <td style={{ fontWeight: 700 }}>{rep.original_fdr?.fdr_number}</td>
                        <td>{rep.original_fdr?.institution?.name}</td>
                        <td>{rep.replacement_reason}</td>
                        <td>
                          <StatusBadge status={rep.status} size="sm" />
                        </td>
                        <td>{new Date(rep.submitted_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'releases' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Security Deposit Release & Refund Applications
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>FDR Number</th>
                    <th>Amount</th>
                    <th>AICTE Clearance NOC</th>
                    <th>Release Ground</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No release requests currently submitted.
                      </td>
                    </tr>
                  ) : (
                    releases.map((rel) => (
                      <tr key={rel.id}>
                        <td>
                          <code>{rel.request_number}</code>
                        </td>
                        <td style={{ fontWeight: 700 }}>{rel.fdr?.fdr_number}</td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>
                          ₹{rel.fdr?.deposit_amount ? rel.fdr.deposit_amount.toLocaleString('en-IN') : '0'}
                        </td>
                        <td>
                          <code>{rel.noc_number || 'AICTE/NOC/PENDING'}</code>
                        </td>
                        <td>{rel.release_reason}</td>
                        <td>
                          <StatusBadge status={rel.status} size="sm" />
                        </td>
                        <td>
                          {(user?.role === 'aicte_officer' || user?.role === 'system_admin') && (
                            <button
                              onClick={() => handleApproveRelease(rel.id)}
                              className="btn btn-sm btn-success"
                            >
                              Authorize Release
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maturing' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                FDRs Maturing within 90 Days
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 600 }}>
                Automatic AICTE alert system is active
              </span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>FDR Number</th>
                    <th>Institution</th>
                    <th>Bank & Branch</th>
                    <th>Amount</th>
                    <th>Maturity Date</th>
                    <th>Days Remaining</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maturingFDRs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No deposits approaching maturity in this window.
                      </td>
                    </tr>
                  ) : (
                    maturingFDRs.map((fdr) => (
                      <tr key={fdr.id}>
                        <td style={{ fontWeight: 700 }}>{fdr.fdr_number}</td>
                        <td>{fdr.institution?.name}</td>
                        <td>
                          {fdr.issuing_bank}
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{fdr.bank_branch}</div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>
                          ₹{fdr.deposit_amount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#dc2626' }}>{fdr.maturity_date}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            Approaching Term End
                          </span>
                        </td>
                        <td>
                          <button onClick={() => onOpenFDR(fdr)} className="btn btn-outline btn-sm">
                            Process
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
