import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Institution } from '../types';
import { Building2, Search, MapPin, Phone, Mail, FileCheck, RefreshCw } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const res = await api.getInstitutions({ search: search || undefined });
      setInstitutions(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            AICTE Approved Institutions
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Technical education institutes directory and deposit compliance records.
          </p>
        </div>
        <button onClick={loadInstitutions} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadInstitutions();
          }}
          style={{ display: 'flex', gap: '1rem' }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Institution Name, AICTE Permanent ID, or City..."
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Grid of Institutions */}
      <div className="grid-3">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading institutions...
          </div>
        ) : institutions.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No institutions found matching your criteria.
          </div>
        ) : (
          institutions.map((inst) => (
            <div key={inst.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: '#ecfdf5',
                      color: '#047857',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    AICTE Approved
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {inst.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Permanent ID: <strong>{inst.aicte_permanent_id}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem', color: '#475569', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} color="#64748b" />
                    <span>{inst.city}, {inst.state} ({inst.region} Region)</span>
                  </div>
                  {inst.contact_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={14} color="#64748b" />
                      <span>{inst.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Deposit Compliance</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>
                    Active & Lien Marked
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = `/fdrs?search=${encodeURIComponent(inst.aicte_permanent_id)}`)}
                  className="btn btn-outline btn-sm"
                >
                  View FDRs
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
