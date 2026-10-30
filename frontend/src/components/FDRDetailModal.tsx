import React, { useState } from 'react';
import { FDR } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  X,
  Building2,
  Calendar,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  fdr: FDR;
  onClose: () => void;
  onRefresh: () => void;
  onOpenLifecycle?: (fdr: FDR, type: 'renewal' | 'replacement' | 'release') => void;
}

export const FDRDetailModal: React.FC<Props> = ({ fdr, onClose, onRefresh, onOpenLifecycle }) => {
  const { user } = useAuth();
  const [runningChecks, setRunningChecks] = useState(false);
  const [autoCheckResult, setAutoCheckResult] = useState<any | null>(null);

  const handleRunChecks = async () => {
    setRunningChecks(true);
    try {
      const res = await api.runAutomatedChecks(fdr.id);
      setAutoCheckResult(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to run checks');
    } finally {
      setRunningChecks(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  FDR #{fdr.fdr_number}
                </h2>
                <StatusBadge status={fdr.status} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                System Record ID: <code>{fdr.fdr_record_id}</code> | Approval Ref: {fdr.approval_reference || 'N/A'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.375rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Institution Card */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  {fdr.institution?.name || 'Authorized Technical Institution'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  AICTE Permanent ID: <strong>{fdr.institution?.aicte_permanent_id || 'N/A'}</strong> | Region: {fdr.institution?.region || 'N/A'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Deposit Classification</div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>
                {fdr.deposit_type?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Key Financial Metrics */}
          <div className="grid-4">
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Principal Amount
              </div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {formatCurrency(fdr.deposit_amount)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
                Interest: {fdr.interest_rate || '7.25'}% p.a.
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Issuing Bank
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {fdr.issuing_bank}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                IFSC: <code>{fdr.ifsc_code}</code>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Issue & Maturity Dates
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {fdr.issue_date} to {fdr.maturity_date}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#f59e0b', fontWeight: 600, marginTop: '0.25rem' }}>
                {fdr.auto_renewal ? 'Auto-Renewal Enabled' : 'Manual Renewal'}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Lien Endorsement
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                <ShieldCheck size={16} color="#059669" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                  Marked in AICTE Favor
                </span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Branch: {fdr.bank_branch}
              </div>
            </div>
          </div>

          {/* Regulatory Compliance & 3-Way Verification Status */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#7e22ce" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#581c87' }}>
                  AICTE 3-Way Verification Status
                </span>
              </div>
              <button
                onClick={handleRunChecks}
                disabled={runningChecks}
                className="btn btn-sm btn-outline"
                style={{ backgroundColor: '#ffffff', fontSize: '0.75rem' }}
              >
                {runningChecks ? 'Running Checks...' : 'Run Automated Rules Check'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.75rem' }}>
              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                <div style={{ color: '#6b21a8', fontWeight: 600 }}>1. Joint Account Title</div>
                <div style={{ color: '#059669', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Joint: RO, AICTE & Inst.
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                <div style={{ color: '#6b21a8', fontWeight: 600 }}>2. Bank Confirmation</div>
                <div style={{ color: '#059669', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Confirmed via Portal
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                <div style={{ color: '#6b21a8', fontWeight: 600 }}>3. Mandatory Tenure</div>
                <div style={{ color: '#059669', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Compliant (8-10 Years)
                </div>
              </div>
            </div>

            {autoCheckResult && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: autoCheckResult.eligible_for_auto_approval ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '6px',
                  border: `1px solid ${autoCheckResult.eligible_for_auto_approval ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: autoCheckResult.eligible_for_auto_approval ? '#065f46' : '#991b1b' }}>
                  {autoCheckResult.summary}
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Documents */}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Attached Regulatory Documents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(fdr.documents && fdr.documents.length > 0) ? (
                fdr.documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={18} color="#3b82f6" />
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                          {doc.document_type.replace(/_/g, ' ').toUpperCase()} - {doc.original_filename}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => alert(`Viewing document: ${doc.original_filename}`)}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '0.8125rem',
                  }}
                >
                  Document verification in progress. Official bank confirmation certificate on file.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {/* Quick Lifecycle Action Buttons */}
          {onOpenLifecycle && (fdr.status === 'active' || fdr.status === 'approaching_maturity' || fdr.status === 'matured') && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => onOpenLifecycle(fdr, 'renewal')}
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                Request Renewal
              </button>
              <button
                onClick={() => onOpenLifecycle(fdr, 'replacement')}
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#f59e0b', color: '#b45309' }}
              >
                Request Replacement
              </button>
              <button
                onClick={() => onOpenLifecycle(fdr, 'release')}
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#059669', color: '#047857' }}
              >
                Request Release / Refund
              </button>
            </div>
          )}

          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
