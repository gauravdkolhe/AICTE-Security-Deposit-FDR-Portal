import React, { useState } from 'react';
import { VerificationCase } from '../types';
import { api } from '../services/api';
import { X, CheckCircle, AlertTriangle, Shield, Building, CreditCard } from 'lucide-react';

interface Props {
  vCase: VerificationCase;
  onClose: () => void;
  onSuccess: () => void;
}

export const BankVerificationModal: React.FC<Props> = ({ vCase, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [bankRef, setBankRef] = useState(
    vCase.bank_reference_number || `CBS-LIEN-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [actionType, setActionType] = useState<'confirm' | 'discrepancy'>('confirm');
  const [notes, setNotes] = useState('');
  const [selectedDiscrepancies, setSelectedDiscrepancies] = useState<string[]>([]);

  const discrepancyOptions = [
    'FDR is not in the joint name of Regional Officer, AICTE and the Institution',
    'Lien in favor of AICTE has NOT been noted on Core Banking System (CBS)',
    'Deposit amount differs from bank ledger records',
    'FDR tenure is less than the AICTE mandated 8-10 years',
    'Authorized branch signature or stamp missing on physical instrument',
  ];

  const handleDiscrepancyToggle = (item: string) => {
    if (selectedDiscrepancies.includes(item)) {
      setSelectedDiscrepancies(selectedDiscrepancies.filter((d) => d !== item));
    } else {
      setSelectedDiscrepancies([...selectedDiscrepancies, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (actionType === 'confirm') {
        await api.bankVerify(vCase.id, {
          bank_reference_number: bankRef,
          verified: true,
          notes: notes || 'Verified with CBS ledger records. Lien endorsed in favor of AICTE.',
        });
      } else {
        if (selectedDiscrepancies.length === 0) {
          alert('Please select at least one discrepancy reason.');
          setLoading(false);
          return;
        }
        await api.bankVerify(vCase.id, {
          bank_reference_number: bankRef,
          verified: false,
          notes: notes || 'Discrepancy raised during bank branch verification.',
          discrepancy_reasons: selectedDiscrepancies,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    } finally {
      setLoading(false);
    }
  };

  const fdr = vCase.fdr;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Bank Liaison & 3-Way Verification
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Verification Case #{vCase.case_number}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.375rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* FDR Details Card */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>FDR Number:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{fdr?.fdr_number}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Amount:</span>{' '}
                <strong style={{ color: '#059669' }}>
                  ₹{fdr?.deposit_amount ? fdr.deposit_amount.toLocaleString('en-IN') : '0'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Issuing Bank:</span>{' '}
                <strong>{fdr?.issuing_bank}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Branch / IFSC:</span>{' '}
                <strong>{fdr?.bank_branch} ({fdr?.ifsc_code})</strong>
              </div>
            </div>

            {/* Action Type Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActionType('confirm')}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: `2px solid ${actionType === 'confirm' ? '#059669' : '#e2e8f0'}`,
                  backgroundColor: actionType === 'confirm' ? '#ecfdf5' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  color: actionType === 'confirm' ? '#047857' : '#64748b',
                }}
              >
                <CheckCircle size={18} />
                <span>Confirm & Mark Lien</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('discrepancy')}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: `2px solid ${actionType === 'discrepancy' ? '#dc2626' : '#e2e8f0'}`,
                  backgroundColor: actionType === 'discrepancy' ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  color: actionType === 'discrepancy' ? '#b91c1c' : '#64748b',
                }}
              >
                <AlertTriangle size={18} />
                <span>Raise Discrepancy</span>
              </button>
            </div>

            {/* Inputs based on Action */}
            {actionType === 'confirm' ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Core Banking (CBS) Lien Reference Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Reference code confirming lien endorsement on bank CBS system.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Bank Officer Remarks</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Deposit verified with branch registers. AICTE lien recorded under APH mandate."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label">Select Discrepancy Reasons</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {discrepancyOptions.map((item) => (
                    <label
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDiscrepancies.includes(item)}
                        onChange={() => handleDiscrepancyToggle(item)}
                        style={{ marginTop: '2px', accentColor: '#dc2626' }}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <div className="form-group">
                  <label className="form-label">Specific Branch Observations</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter instructions for the institution to rectify..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${actionType === 'confirm' ? 'btn-success' : 'btn-danger'}`}
              disabled={loading}
            >
              {loading ? 'Processing...' : actionType === 'confirm' ? 'Submit Bank Endorsement' : 'Return with Discrepancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
