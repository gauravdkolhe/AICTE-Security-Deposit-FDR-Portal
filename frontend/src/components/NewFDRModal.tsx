import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Institution } from '../types';
import { X, Check, ArrowRight, ArrowLeft, Upload, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewFDRModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    institution_id: user?.institution_id || '',
    fdr_number: '',
    deposit_amount: '1500000',
    issuing_bank: 'State Bank of India',
    bank_branch: 'Main City Branch',
    ifsc_code: 'SBIN0001234',
    issue_date: new Date().toISOString().split('T')[0],
    maturity_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    interest_rate: '7.5',
    deposit_type: 'fixed_deposit',
    auto_renewal: true,
    renewal_tenure_months: '120',
    approval_reference: 'AICTE/NWRO/2026/FDR-09',
    notes: 'Mandatory Security Deposit under AICTE APH Chapter 1',
    joint_holder_confirmed: false,
    lien_marked_confirmed: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await api.getInstitutions({ limit: 100 });
        setInstitutions(res.items);
        if (!formData.institution_id && res.items.length > 0) {
          setFormData((prev) => ({ ...prev, institution_id: res.items[0].id }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInstitutions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.joint_holder_confirmed || !formData.lien_marked_confirmed) {
      setError('Please acknowledge the mandatory joint title and lien marking undertakings.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createdFDR = await api.createFDR({
        institution_id: formData.institution_id,
        fdr_number: formData.fdr_number,
        deposit_amount: parseFloat(formData.deposit_amount),
        issuing_bank: formData.issuing_bank,
        bank_branch: formData.bank_branch,
        ifsc_code: formData.ifsc_code,
        issue_date: formData.issue_date,
        maturity_date: formData.maturity_date,
        interest_rate: parseFloat(formData.interest_rate),
        deposit_type: formData.deposit_type,
        auto_renewal: formData.auto_renewal,
        renewal_tenure_months: formData.renewal_tenure_months,
        approval_reference: formData.approval_reference,
        notes: formData.notes,
      });

      // Submit FDR for verification
      await api.submitFDR(createdFDR.id);

      // Upload file if selected
      if (selectedFile) {
        try {
          await api.uploadFDRDocument(createdFDR.id, selectedFile, 'fdr_certificate', 'Original scanned certificate');
        } catch (uploadErr) {
          console.warn('Document upload warning:', uploadErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit FDR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Submit Security Deposit FDR
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Step {step} of 3: {step === 1 ? 'Institution & Approval' : step === 2 ? 'Deposit & Bank Specifics' : 'Compliance & Documents'}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.375rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', height: '4px', backgroundColor: '#e2e8f0' }}>
          <div
            style={{
              width: `${(step / 3) * 100}%`,
              backgroundColor: '#f97316',
              transition: 'width 0.3s ease',
            }}
          />
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {step === 1 && (
              <div>
                <div className="form-group">
                  <label className="form-label">Approved Institution</label>
                  <select
                    className="form-select"
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                    required
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.aicte_permanent_id}) - {inst.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">AICTE Approval Reference Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.approval_reference}
                    onChange={(e) => setFormData({ ...formData, approval_reference: e.target.value })}
                    placeholder="e.g. AICTE/NWRO/2026/FDR-09"
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Reference from the AICTE letter authorizing establishment or new program.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">FDR / Certificate Receipt Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.fdr_number}
                    onChange={(e) => setFormData({ ...formData, fdr_number: e.target.value })}
                    placeholder="e.g. SBI-FDR-2026-99881"
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Deposit Amount (₹ INR)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.deposit_amount}
                      onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Issuing Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.issuing_bank}
                      onChange={(e) => setFormData({ ...formData, issuing_bank: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bank Branch</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.bank_branch}
                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Issue Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maturity Date (Min 8-10 Years)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.maturity_date}
                      onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#eff6ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    id="auto_renewal"
                    checked={formData.auto_renewal}
                    onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  <label htmlFor="auto_renewal" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af' }}>
                    Mandatory Clause: Auto-renewal upon maturity unless released by AICTE
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div
                  style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <ShieldCheck size={18} color="#7e22ce" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#581c87' }}>
                      Mandatory Regulatory Undertakings
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.joint_holder_confirmed}
                        onChange={(e) => setFormData({ ...formData, joint_holder_confirmed: e.target.checked })}
                        style={{ marginTop: '3px', accentColor: '#7e22ce' }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#3b0764', lineHeight: 1.4 }}>
                        I certify that this Fixed Deposit is drawn strictly in the <strong>joint name</strong> of <em>"The Regional Officer, AICTE"</em> and the Institution.
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.lien_marked_confirmed}
                        onChange={(e) => setFormData({ ...formData, lien_marked_confirmed: e.target.checked })}
                        style={{ marginTop: '3px', accentColor: '#7e22ce' }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#3b0764', lineHeight: 1.4 }}>
                        I certify that an explicit <strong>Lien Endorsement</strong> in favor of AICTE has been marked in the issuing bank's records and cannot be liquidated without AICTE's explicit NOC.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Attach FDR Scan / Bank Letter (PDF/Image)</label>
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: selectedFile ? '#f0fdf4' : '#f8fafc',
                    }}
                    onClick={() => document.getElementById('fdr_file_input')?.click()}
                  >
                    <Upload size={24} color={selectedFile ? '#16a34a' : '#64748b'} style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {selectedFile ? selectedFile.name : 'Click to select signed FDR receipt scan'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Supported formats: PDF, PNG, JPG (Max 10MB)
                    </div>
                    <input
                      id="fdr_file_input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-secondary"
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!formData.fdr_number || !formData.approval_reference)) {
                    setError('Please complete all required fields');
                    return;
                  }
                  setError(null);
                  setStep(step + 1);
                }}
                className="btn btn-primary"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-saffron"
                disabled={loading}
              >
                {loading ? 'Submitting & Initiating 3-Way Checks...' : 'Submit to AICTE Portal'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
