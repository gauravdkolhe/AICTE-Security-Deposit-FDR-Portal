import React, { useState } from 'react';
import { FDR } from '../types';
import { api } from '../services/api';
import { X, RefreshCw, Replace, FileCheck, AlertCircle } from 'lucide-react';

interface Props {
  fdr: FDR;
  actionType: 'renewal' | 'replacement' | 'release';
  onClose: () => void;
  onSuccess: () => void;
}

export const LifecycleActionModal: React.FC<Props> = ({ fdr, actionType, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [tenureMonths, setTenureMonths] = useState(60);
  const [reason, setReason] = useState('');
  const [nocNumber, setNocNumber] = useState(`AICTE/NOC/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  
  // Replacement state
  const [newFDRNumber, setNewFDRNumber] = useState(`${fdr.fdr_number}-REPL`);
  const [newAmount, setNewAmount] = useState(fdr.deposit_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (actionType === 'renewal') {
        await api.submitRenewalRequest({
          fdr_id: fdr.id,
          requested_tenure_months: tenureMonths,
          reason: reason || 'Scheduled regulatory renewal per AICTE APH provisions.',
        });
      } else if (actionType === 'replacement') {
        await api.submitReplacementRequest({
          original_fdr_id: fdr.id,
          replacement_reason: reason || 'Bank merger / restructure replacement.',
          new_fdr_data: {
            fdr_number: newFDRNumber,
            deposit_amount: newAmount,
            issuing_bank: fdr.issuing_bank,
            bank_branch: fdr.bank_branch,
            ifsc_code: fdr.ifsc_code,
            issue_date: new Date().toISOString().split('T')[0],
            maturity_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        });
      } else if (actionType === 'release') {
        await api.submitReleaseRequest({
          fdr_id: fdr.id,
          request_type: 'release',
          release_reason: reason || 'Mandatory 10-year term completed with satisfactory compliance.',
          noc_number: nocNumber,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'renewal': return 'Submit FDR Renewal Application';
      case 'replacement': return 'Submit FDR Replacement Application';
      case 'release': return 'Request Security Deposit Release / Refund';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {getTitle()}
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              For FDR #{fdr.fdr_number} (₹{fdr.deposit_amount.toLocaleString('en-IN')})
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.375rem' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              margin: '1rem 1.5rem 0',
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {actionType === 'renewal' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Extension Tenure (Months)</label>
                  <select
                    className="form-select"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                  >
                    <option value={36}>3 Years (36 Months)</option>
                    <option value={60}>5 Years (60 Months)</option>
                    <option value={96}>8 Years (96 Months)</option>
                    <option value={120}>10 Years (120 Months)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Renewal Justification</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide details of approval letter or continued regulatory compliance requirement..."
                  />
                </div>
              </div>
            )}

            {actionType === 'replacement' && (
              <div>
                <div className="form-group">
                  <label className="form-label">New Replacement FDR Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newFDRNumber}
                    onChange={(e) => setNewFDRNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Amount (₹ INR)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason for Replacement</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Bank amalgamation, correction of typographical error, or instrument restructuring..."
                    required
                  />
                </div>
              </div>
            )}

            {actionType === 'release' && (
              <div>
                <div
                  style={{
                    padding: '0.875rem',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '0.8125rem',
                    marginBottom: '1rem',
                  }}
                >
                  <strong>AICTE Release Policy:</strong> Fixed deposits can only be released upon completion of mandatory tenure (e.g. 10 years for technical institutions) or official closure of the institution/course with AICTE Executive Council approval.
                </div>
                <div className="form-group">
                  <label className="form-label">AICTE Clearance / NOC Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={nocNumber}
                    onChange={(e) => setNocNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Release Grounds & Justification</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Completion of prescribed 10 years term with zero outstanding student/regulatory liabilities."
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting Application...' : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
