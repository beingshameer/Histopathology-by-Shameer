import React, { useState } from 'react';
import type { UserProfile, UserRole } from '../../types';
import { antidoteStore } from '../../lib/store';
import { 
  X, 
  ShieldCheck, 
  FlaskConical, 
  Microscope, 
  Sparkles, 
  KeyRound, 
  UserPlus, 
  Lock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'staff' | 'register' | 'demo'>('staff');
  
  // Staff Login Form
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  
  // End User Self-Registration Form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const profiles = antidoteStore.getAllProfiles();
    const matched = profiles.find(p => p.email.toLowerCase() === staffEmail.trim().toLowerCase());

    if (!matched) {
      setError('No credential record found for this identifier. Lab and Doctor accounts must be created by an Admin.');
      return;
    }

    if (matched.role === 'end_user') {
      setError('This is a Patient account. Please log in via the Patient / Public section.');
      return;
    }

    antidoteStore.setCurrentUser(matched);
    onLoginSuccess(matched);
    onClose();
  };

  const handleEndUserRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setError('Please complete all registration fields.');
      return;
    }

    const result = antidoteStore.registerEndUser(registerEmail.trim(), registerName.trim());
    if (!result.success) {
      setError(result.error || 'Registration failed.');
      return;
    }

    setSuccessMsg('Registration successful! Welcome to My Antidote.');
    setTimeout(() => {
      if (result.user) {
        onLoginSuccess(result.user);
        onClose();
      }
    }, 800);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    const user = antidoteStore.switchRole(role);
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-bg)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>Authentication &amp; Access Control</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Medical histopathology pipeline &amp; AI prediction
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: '#ffffff',
        }}>
          <button
            id="auth-tab-staff"
            onClick={() => { setMode('staff'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: mode === 'staff' ? '#ffffff' : 'var(--color-bg)',
              borderBottom: mode === 'staff' ? '2px solid var(--color-primary)' : 'none',
              fontWeight: mode === 'staff' ? 600 : 400,
              color: mode === 'staff' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <KeyRound size={15} /> Issued Staff Login
          </button>
          <button
            id="auth-tab-register"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: mode === 'register' ? '#ffffff' : 'var(--color-bg)',
              borderBottom: mode === 'register' ? '2px solid var(--color-primary)' : 'none',
              fontWeight: mode === 'register' ? 600 : 400,
              color: mode === 'register' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <UserPlus size={15} /> Patient / Public Signup
          </button>
          <button
            id="auth-tab-demo"
            onClick={() => { setMode('demo'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: mode === 'demo' ? '#ffffff' : 'var(--color-bg)',
              borderBottom: mode === 'demo' ? '2px solid var(--color-primary)' : 'none',
              fontWeight: mode === 'demo' ? 600 : 400,
              color: mode === 'demo' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <Sparkles size={15} /> Quick Demo Switch
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: Staff Login */}
          {mode === 'staff' && (
            <form onSubmit={handleStaffLogin}>
              <div style={{
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-primary-hover)',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.5rem',
              }}>
                <Lock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Staff Access Policy:</strong> Lab and Doctor credentials are issued directly by the Chief Administrator. Self-signup for staff roles is restricted.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Staff User Email / Issued ID</label>
                <input
                  id="staff-email-input"
                  type="email"
                  className="form-input"
                  placeholder="e.g. lab.north@myantidote.health or dr.marcus@myantidote.health"
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password / Temporary Passcode</label>
                <input
                  id="staff-password-input"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-staff-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Log In to Clinical Portal
              </button>
            </form>
          )}

          {/* Mode 2: End User Self-Registration */}
          {mode === 'register' && (
            <form onSubmit={handleEndUserRegister}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
              }}>
                <strong>Public &amp; Medical Community Portal:</strong> Self-registration provides immediate access to the AI prostate cancer prediction module for inference on biopsy scans.
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="reg-fullname-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Johnathan Miller"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  id="reg-email-input"
                  type="email"
                  className="form-input"
                  placeholder="patient@example.com"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Create Password</label>
                <input
                  id="reg-password-input"
                  type="password"
                  className="form-input"
                  placeholder="At least 8 characters"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Complete Registration &amp; Enter Portal
              </button>
            </form>
          )}

          {/* Mode 3: Demo Quick Switch */}
          {mode === 'demo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Select a simulated pre-configured profile to immediately verify role-based permissions:
              </p>

              <button
                id="demo-login-admin"
                onClick={() => handleQuickDemoLogin('admin')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <ShieldCheck size={20} color="#00685f" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Chief Administrator (Admin)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    admin@myantidote.health • Full access, issue credentials, dataset export
                  </div>
                </div>
              </button>

              <button
                id="demo-login-lab"
                onClick={() => handleQuickDemoLogin('lab')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <FlaskConical size={20} color="#006398" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>North Histology Lab (Lab)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    lab.north@myantidote.health • Slide dropzone, own image tracking
                  </div>
                </div>
              </button>

              <button
                id="demo-login-doctor"
                onClick={() => handleQuickDemoLogin('doctor')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <Microscope size={20} color="#0d9488" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Dr. Marcus Vance, MD (Doctor / Pathologist)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    dr.marcus@myantidote.health • Pending queue &amp; polygon annotation workstation
                  </div>
                </div>
              </button>

              <button
                id="demo-login-enduser"
                onClick={() => handleQuickDemoLogin('end_user')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <Sparkles size={20} color="#9333ea" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Johnathan Miller (End User / Patient)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    patient.john@example.com • Self-registered, model prediction only
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
