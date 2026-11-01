import React from 'react';
import type { UserProfile, UserRole } from '../../types';
import { antidoteStore } from '../../lib/store';
import { 
  ShieldCheck, 
  FlaskConical, 
  Microscope, 
  Sparkles, 
  LogOut, 
  UserCheck,
  ChevronDown
} from 'lucide-react';

interface NavigationProps {
  currentUser: UserProfile | null;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onOpenAuth,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const handleRoleSwitch = (role: UserRole) => {
    antidoteStore.switchRole(role);
    setRoleMenuOpen(false);
    // Auto-switch to their relevant dashboard
    if (role === 'admin') onTabChange('admin');
    else if (role === 'lab') onTabChange('lab');
    else if (role === 'doctor') onTabChange('doctor');
    else onTabChange('prediction');
  };

  const roleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Chief Administrator';
      case 'lab': return 'Histology Lab';
      case 'doctor': return 'Consulting Pathologist';
      case 'end_user': return 'Patient / Public';
    }
  };

  return (
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top Clinical Notification / Demo Bar */}
      <div style={{
        background: '#0f172a',
        color: '#94a3b8',
        fontSize: '0.75rem',
        padding: '0.35rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: '#10b981' 
          }} />
          <strong style={{ color: '#f8fafc' }}>My Antidote</strong> — Medical Histopathology Data Collection &amp; AI Prediction Pipeline (FYP)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#cbd5e1' }}>Simulated Pathology Workstation</span>
          <span style={{ color: '#64748b' }}>|</span>
          <div style={{ position: 'relative' }}>
            <button 
              id="role-switcher-btn"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Switch Role Demo:</span>
              <strong style={{ color: '#38bdf8' }}>{currentUser?.role.toUpperCase()}</strong>
              <ChevronDown size={12} />
            </button>

            {roleMenuOpen && (
              <div 
                id="role-switcher-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.25rem',
                  background: '#1e293b',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid #334155',
                  zIndex: 200,
                  width: '220px',
                  padding: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.25rem 0.5rem', fontWeight: 600 }}>
                  SWITCH ACTIVE ROLE
                </div>
                <button
                  id="switch-role-admin"
                  onClick={() => handleRoleSwitch('admin')}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    textAlign: 'left',
                    background: currentUser?.role === 'admin' ? '#334155' : 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <ShieldCheck size={14} color="#38bdf8" /> Admin (Full Control)
                </button>
                <button
                  id="switch-role-lab"
                  onClick={() => handleRoleSwitch('lab')}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    textAlign: 'left',
                    background: currentUser?.role === 'lab' ? '#334155' : 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <FlaskConical size={14} color="#60a5fa" /> Lab (Upload Plates)
                </button>
                <button
                  id="switch-role-doctor"
                  onClick={() => handleRoleSwitch('doctor')}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    textAlign: 'left',
                    background: currentUser?.role === 'doctor' ? '#334155' : 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Microscope size={14} color="#34d399" /> Doctor (Annotate Slides)
                </button>
                <button
                  id="switch-role-enduser"
                  onClick={() => handleRoleSwitch('end_user')}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    textAlign: 'left',
                    background: currentUser?.role === 'end_user' ? '#334155' : 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Sparkles size={14} color="#c084fc" /> End User (AI Prediction)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => {
            if (currentUser?.role === 'admin') onTabChange('admin');
            else if (currentUser?.role === 'lab') onTabChange('lab');
            else if (currentUser?.role === 'doctor') onTabChange('doctor');
            else onTabChange('prediction');
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00685f 0%, #004d77 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(0, 104, 95, 0.25)',
          }}>
            <Microscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              My Antidote
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '-3px' }}>
              Prostate Histopathology &amp; AI
            </div>
          </div>
        </div>

        {/* Role-Guarded Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Admin Tab - strictly Admin only */}
          {currentUser?.role === 'admin' && (
            <button
              id="nav-admin"
              className={`btn ${currentTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onTabChange('admin')}
              style={{ padding: '0.5rem 0.9rem' }}
            >
              <ShieldCheck size={16} /> Admin Portal
            </button>
          )}

          {/* Lab Tab - Lab & Admin */}
          {(currentUser?.role === 'lab' || currentUser?.role === 'admin') && (
            <button
              id="nav-lab"
              className={`btn ${currentTab === 'lab' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onTabChange('lab')}
              style={{ padding: '0.5rem 0.9rem' }}
            >
              <FlaskConical size={16} /> Lab Uploads
            </button>
          )}

          {/* Doctor Tab - Doctor & Admin */}
          {(currentUser?.role === 'doctor' || currentUser?.role === 'admin') && (
            <button
              id="nav-doctor"
              className={`btn ${currentTab === 'doctor' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onTabChange('doctor')}
              style={{ padding: '0.5rem 0.9rem' }}
            >
              <Microscope size={16} /> Annotation Workstation
            </button>
          )}

          {/* End User Tab - End User & Admin (Doctor & Lab explicitly blocked per spec) */}
          {(currentUser?.role === 'end_user' || currentUser?.role === 'admin') && (
            <button
              id="nav-prediction"
              className={`btn ${currentTab === 'prediction' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onTabChange('prediction')}
              style={{ padding: '0.5rem 0.9rem' }}
            >
              <Sparkles size={16} /> AI Prediction
            </button>
          )}
        </nav>

        {/* User Badge & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  <span className={`badge badge-role-${currentUser.role}`}>
                    {roleLabel(currentUser.role)}
                  </span>
                  {currentUser.badgeNumber && (
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      #{currentUser.badgeNumber}
                    </span>
                  )}
                </div>
              </div>

              <button
                id="btn-open-auth-modal"
                onClick={onOpenAuth}
                className="btn btn-secondary btn-sm"
                title="Account Details &amp; Credentials"
                style={{ padding: '0.45rem 0.6rem' }}
              >
                <UserCheck size={16} />
              </button>

              <button
                id="btn-logout"
                onClick={() => {
                  antidoteStore.setCurrentUser(null);
                  onOpenAuth();
                }}
                className="btn btn-secondary btn-sm"
                title="Sign Out"
                style={{ padding: '0.45rem 0.6rem', color: 'var(--color-danger)' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              id="btn-sign-in"
              onClick={onOpenAuth}
              className="btn btn-primary"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
