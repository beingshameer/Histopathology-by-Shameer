import React, { useState, useEffect } from 'react';
import type { UserProfile, UserRole } from './types';
import { antidoteStore } from './lib/store';
import { Navigation } from './components/layout/Navigation';
import { AuthModal } from './components/auth/AuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LabDashboard } from './components/lab/LabDashboard';
import { DoctorWorkstation } from './components/doctor/DoctorWorkstation';
import { PredictionPortal } from './components/enduser/PredictionPortal';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import './styles/theme.css';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(antidoteStore.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<string>('admin');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleStoreUpdate = () => {
      const updatedUser = antidoteStore.getCurrentUser();
      setCurrentUser(updatedUser);
      
      // Auto-correct active tab if user role changes to avoid staying on forbidden route
      if (updatedUser) {
        if (updatedUser.role === 'admin') {
          // Admin can access all
        } else if (updatedUser.role === 'lab') {
          if (currentTab !== 'lab') setCurrentTab('lab');
        } else if (updatedUser.role === 'doctor') {
          if (currentTab !== 'doctor') setCurrentTab('doctor');
        } else if (updatedUser.role === 'end_user') {
          if (currentTab !== 'prediction') setCurrentTab('prediction');
        }
      }
    };

    const unsubscribe = antidoteStore.subscribe(handleStoreUpdate);
    return unsubscribe;
  }, [currentTab]);

  // Check role authorization for current tab
  const isAuthorized = (role: UserRole | undefined, tab: string): boolean => {
    if (!role) return false;
    if (role === 'admin') return true; // Full control
    if (role === 'lab') return tab === 'lab';
    if (role === 'doctor') return tab === 'doctor';
    if (role === 'end_user') return tab === 'prediction';
    return false;
  };

  const authorized = currentUser ? isAuthorized(currentUser.role, currentTab) : false;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Clinical Navigation Bar */}
      <Navigation
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main View Area with Role Guard */}
      <main style={{ flex: 1 }}>
        {!currentUser ? (
          <div className="container" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              maxWidth: '480px',
              margin: '0 auto',
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <Lock size={44} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Authentication Required</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Please sign in with your issued staff credentials (Lab or Doctor) or register as a public/patient user.
              </p>
              <button
                id="btn-prompt-signin"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => setIsAuthOpen(true)}
              >
                Open Authentication Portal
              </button>
            </div>
          </div>
        ) : !authorized ? (
          /* Access Control Enforcement Screen */
          <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <div 
              id="access-denied-container"
              style={{
                maxWidth: '540px',
                margin: '0 auto',
                background: '#ffffff',
                padding: '2.5rem',
                borderRadius: '12px',
                border: '1px solid var(--color-danger-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <ShieldAlert size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                Access Restricted: Role Unauthorized
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Your active role (<strong>{currentUser.role.toUpperCase()}</strong>) does not have permission to view the <strong className="mono">{currentTab}</strong> workstation. Strict isolation policies protect patient biopsy records and annotation datasets.
              </p>
              <button
                id="btn-return-allowed-dashboard"
                className="btn btn-primary"
                onClick={() => {
                  if (currentUser.role === 'admin') setCurrentTab('admin');
                  else if (currentUser.role === 'lab') setCurrentTab('lab');
                  else if (currentUser.role === 'doctor') setCurrentTab('doctor');
                  else setCurrentTab('prediction');
                }}
              >
                <ArrowLeft size={16} /> Return to Your Authorized Portal
              </button>
            </div>
          </div>
        ) : (
          /* Authorized View Dispatch */
          <>
            {currentTab === 'admin' && <AdminDashboard />}
            {currentTab === 'lab' && <LabDashboard currentUser={currentUser} />}
            {currentTab === 'doctor' && <DoctorWorkstation currentUser={currentUser} />}
            {currentTab === 'prediction' && <PredictionPortal currentUser={currentUser} />}
          </>
        )}
      </main>

      {/* Clinical Footer */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid var(--color-border)',
        padding: '1.25rem 1.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>My Antidote</strong> — Medical Histopathology Data-Collection &amp; AI Prediction (FYP)
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Row-Level Security (RLS) Active</span>
            <span>•</span>
            <span>Private Storage Bucket</span>
            <span>•</span>
            <span>Gleason Scoring Grade Groups 1-5</span>
          </div>
        </div>
      </footer>

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          if (user.role === 'admin') setCurrentTab('admin');
          else if (user.role === 'lab') setCurrentTab('lab');
          else if (user.role === 'doctor') setCurrentTab('doctor');
          else setCurrentTab('prediction');
        }}
      />
    </div>
  );
};

export default App;
