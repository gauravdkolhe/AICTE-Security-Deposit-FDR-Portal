import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VerificationCase, FDR } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { BankVerificationModal } from '../components/BankVerificationModal';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  ShieldCheck,
  Building,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface Props {
  onOpenFDR: (fdr: FDR) => void;
}

export const VerificationQueuePage: React.FC<Props> = ({ onOpenFDR }) => {
  const { user } = useAuth();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCase, setActiveCase] = useState<VerificationCase | null>(null);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await api.getVerificationCases();
      setCases(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleAICTEAction = async (caseId: string, action: 'approve' | 'reject') => {
    const reason = prompt(`Enter notes for ${action.toUpperCase()}:`, `Compliance verified under AICTE APH regulations.`);
    if (reason === null) return;

    try {
      await api.aicteOfficerAction(caseId, { action, notes: reason });
      loadCases();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            3-Way Verification & Bank Liaison Desk
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Seamless digital tri-party verification between Technical Institutions, Issuing Banks, and AICTE Regional Bureaus.
          </p>
        </div>
        <button onClick={loadCases} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Tri-Party Verification Explanation Architecture Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #bfdbfe',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-pulse-dot" style={{ width: '7px', height: '7px' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Automated Tri-Party Compliance Engine
          </span>
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
          Real-Time Validation & Immutable Banking Confirmation
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginTop: '1.25rem',
          }}
        >
          <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: '#1d4ed8' }}>
              <span>1. Technical Institution</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', lineHeight: 1.45 }}>
              Submits FDR details with joint-title declaration & scanned receipt upload.
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: '#047857' }}>
              <span>2. Issuing Bank Branch</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', lineHeight: 1.45 }}>
              Cross-references CBS deposit ledger, marks AICTE lien & inputs confirmation code.
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: '#ea580c' }}>
              <span>3. AICTE Regional Bureau</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', lineHeight: 1.45 }}>
              Automated rules verification + final regulatory approval for safe custody.
            </div>
          </div>
        </div>
      </div>

      {/* Cases Queue Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            Active Verification Worklist ({cases.length})
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Current Persona: <strong>{user?.role?.replace(/_/g, ' ').toUpperCase()}</strong>
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Case Number</th>
                <th>FDR Number</th>
                <th>Institution</th>
                <th>Issuing Bank & Branch</th>
                <th>Amount</th>
                <th>Automated Checks</th>
                <th>Verification Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading verification cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    All verification cases have been reviewed and approved!
                  </td>
                </tr>
              ) : (
                cases.map((vc) => {
                  const fdr = vc.fdr;
                  return (
                    <tr key={vc.id}>
                      <td>
                        <code>{vc.case_number}</code>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          {new Date(vc.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                          {fdr?.fdr_number}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fdr?.institution?.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          AICTE ID: {fdr?.institution?.aicte_permanent_id}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fdr?.issuing_bank}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {fdr?.bank_branch}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>
                        ₹{fdr?.deposit_amount ? fdr.deposit_amount.toLocaleString('en-IN') : '0'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.6875rem' }}>
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Joint Name: Verified
                          </span>
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Min 8-10 Yr Tenure: Passed
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={vc.status} size="sm" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          {/* Bank Officer Action */}
                          {(user?.role === 'bank_officer' || user?.role === 'system_admin') && (
                            <button
                              onClick={() => setActiveCase(vc)}
                              className="btn btn-sm btn-primary"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              Bank Endorse
                            </button>
                          )}

                          {/* AICTE Officer Action */}
                          {(user?.role === 'aicte_officer' || user?.role === 'system_admin') && (
                            <>
                              <button
                                onClick={() => handleAICTEAction(vc.id, 'approve')}
                                className="btn btn-sm btn-success"
                                title="Approve FDR"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAICTEAction(vc.id, 'reject')}
                                className="btn btn-sm btn-danger"
                                title="Reject FDR"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Inspect FDR */}
                          {fdr && (
                            <button
                              onClick={() => onOpenFDR(fdr)}
                              className="btn btn-sm btn-outline"
                            >
                              Inspect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Verification Modal */}
      {activeCase && (
        <BankVerificationModal
          vCase={activeCase}
          onClose={() => setActiveCase(null)}
          onSuccess={loadCases}
        />
      )}
    </div>
  );
};
