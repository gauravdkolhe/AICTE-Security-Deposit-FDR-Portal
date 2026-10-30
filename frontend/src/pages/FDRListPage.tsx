import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FDR } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  RefreshCw,
  FileText,
  Building,
  CheckCircle,
} from 'lucide-react';

interface Props {
  onOpenFDR: (fdr: FDR) => void;
  onOpenNewFDR: () => void;
}

export const FDRListPage: React.FC<Props> = ({ onOpenFDR, onOpenNewFDR }) => {
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');

  const loadFDRs = async () => {
    setLoading(true);
    try {
      const res = await api.getFDRs({
        search: search || undefined,
        status: statusFilter || undefined,
        bank: bankFilter || undefined,
        limit: 50,
      });
      setFdrs(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFDRs();
  }, [statusFilter, bankFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFDRs();
  };

  const exportCSV = () => {
    const headers = ['Record ID', 'FDR Number', 'Institution', 'Bank', 'Branch', 'IFSC', 'Amount', 'Issue Date', 'Maturity Date', 'Status'];
    const rows = fdrs.map((f) => [
      f.fdr_record_id,
      f.fdr_number,
      `"${f.institution?.name || ''}"`,
      `"${f.issuing_bank}"`,
      `"${f.bank_branch}"`,
      f.ifsc_code,
      f.deposit_amount,
      f.issue_date,
      f.maturity_date,
      f.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AICTE_FDR_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Central Security Deposit Depository
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Search, inspect, and track fixed deposit receipts submitted across all approved technical institutions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportCSV} className="btn btn-outline btn-sm">
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button onClick={onOpenNewFDR} className="btn btn-saffron btn-sm">
            <PlusCircle size={14} />
            <span>Submit FDR</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by FDR No, Institution Name, or Approval Ref..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ width: '200px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active & Lien Marked</option>
              <option value="pending_verification">Pending 3-Way Verification</option>
              <option value="verified">Bank Verified</option>
              <option value="approaching_maturity">Approaching Maturity</option>
              <option value="matured">Matured</option>
              <option value="discrepancy_found">Discrepancy Found</option>
              <option value="released">Released / Closed</option>
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
            >
              <option value="">All Issuing Banks</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="Canara Bank">Canara Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            <span>Filter</span>
          </button>

          {(search || statusFilter || bankFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setBankFilter('');
                loadFDRs();
              }}
              className="btn btn-outline btn-sm"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Main Depository Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
            Showing <strong>{fdrs.length}</strong> of <strong>{total}</strong> deposit records
          </div>
          <button onClick={loadFDRs} className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
            <RefreshCw size={12} />
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>FDR Certificate No</th>
                <th>Institution Name</th>
                <th>Issuing Bank & Branch</th>
                <th>Principal Amount</th>
                <th>Interest Rate</th>
                <th>Maturity Date</th>
                <th>Regulatory Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading depository records...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No security deposits matching your filter criteria.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr key={fdr.id}>
                    <td>
                      <code>{fdr.fdr_record_id}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{fdr.fdr_number}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        Ref: {fdr.approval_reference || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {fdr.institution?.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {fdr.institution?.city}, {fdr.institution?.state}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{fdr.issuing_bank}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {fdr.bank_branch} ({fdr.ifsc_code})
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.9375rem' }}>
                      ₹{fdr.deposit_amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {fdr.interest_rate || '7.25'}%
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{fdr.maturity_date}</div>
                      <div style={{ fontSize: '0.6875rem', color: fdr.auto_renewal ? '#059669' : '#ea580c' }}>
                        {fdr.auto_renewal ? 'Auto-Renew' : 'Manual'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={fdr.status} size="sm" />
                    </td>
                    <td>
                      <button
                        onClick={() => onOpenFDR(fdr)}
                        className="btn btn-outline btn-sm"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
