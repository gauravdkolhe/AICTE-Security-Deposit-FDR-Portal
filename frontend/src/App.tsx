import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FDRListPage } from './pages/FDRListPage';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { LifecyclePage } from './pages/LifecyclePage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { FDRDetailModal } from './components/FDRDetailModal';
import { NewFDRModal } from './components/NewFDRModal';
import { LifecycleActionModal } from './components/LifecycleActionModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { FDR } from './types';

const AuthenticatedApp: React.FC = () => {
  const [selectedFDR, setSelectedFDR] = useState<FDR | null>(null);
  const [showNewFDR, setShowNewFDR] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<{
    fdr: FDR;
    type: 'renewal' | 'replacement' | 'release';
  } | null>(null);

  const handleOpenLifecycle = (fdr: FDR, type: 'renewal' | 'replacement' | 'release') => {
    setSelectedFDR(null);
    setLifecycleAction({ fdr, type });
  };

  return (
    <div className="app-container">
      <Sidebar onOpenNewFDR={() => setShowNewFDR(true)} />

      <div className="main-content">
        <Header onOpenAIAdvisor={() => setShowAIAdvisor(true)} />

        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                onOpenFDR={(fdr) => setSelectedFDR(fdr)}
                onOpenNewFDR={() => setShowNewFDR(true)}
              />
            }
          />
          <Route
            path="/fdrs"
            element={
              <FDRListPage
                onOpenFDR={(fdr) => setSelectedFDR(fdr)}
                onOpenNewFDR={() => setShowNewFDR(true)}
              />
            }
          />
          <Route
            path="/verification"
            element={
              <VerificationQueuePage
                onOpenFDR={(fdr) => setSelectedFDR(fdr)}
              />
            }
          />
          <Route
            path="/lifecycle"
            element={
              <LifecyclePage
                onOpenFDR={(fdr) => setSelectedFDR(fdr)}
              />
            }
          />
          <Route path="/institutions" element={<InstitutionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Global Modals */}
      {selectedFDR && (
        <FDRDetailModal
          fdr={selectedFDR}
          onClose={() => setSelectedFDR(null)}
          onRefresh={() => {
            // refresh data
          }}
          onOpenLifecycle={handleOpenLifecycle}
        />
      )}

      {showNewFDR && (
        <NewFDRModal
          onClose={() => setShowNewFDR(false)}
          onSuccess={() => {
            alert('Security Deposit FDR submitted successfully for 3-way verification.');
            window.location.reload();
          }}
        />
      )}

      {lifecycleAction && (
        <LifecycleActionModal
          fdr={lifecycleAction.fdr}
          actionType={lifecycleAction.type}
          onClose={() => setLifecycleAction(null)}
          onSuccess={() => {
            alert('Lifecycle application submitted successfully.');
            window.location.reload();
          }}
        />
      )}

      {showAIAdvisor && (
        <AIAssistantModal onClose={() => setShowAIAdvisor(false)} />
      )}
    </div>
  );
};

const Root: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
          CredNex
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
          Centralized AICTE Security Deposit & FDR Depository
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  );
}
