import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { History, Shield, RefreshCw, Search } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({ limit: 100 });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Regulatory Audit Trail
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Immutable, tamper-evident log of all FDR submissions, bank verifications, lien markings, and regulatory approvals.
          </p>
        </div>
        <button onClick={loadLogs} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Identity</th>
                <th>Role</th>
                <th>Action Taken</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.user_email}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                        }}
                      >
                        {log.user_role}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#1e40af' }}>{log.action}</td>
                    <td>
                      <code>{log.resource_type}</code>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#475569' }}>{log.details || '-'}</td>
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
