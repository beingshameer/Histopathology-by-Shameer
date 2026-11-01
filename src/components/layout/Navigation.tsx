import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, UserRole } from '../../types';
import { antidoteStore } from '../../lib/store';
import { 
  ShieldCheck, 
  FlaskConical, 
  Microscope, 
  Sparkles, 
  LogOut, 
  UserCheck,
  ChevronDown,
  RotateCcw,
  Check
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
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = (role: UserRole) => {
    antidoteStore.switchRole(role);
    setRoleMenuOpen(false);
    if (role === 'admin') onTabChange('admin');
    else if (role === 'lab') onTabChange('lab');
    else if (role === 'doctor') onTabChange('doctor');
    else onTabChange('prediction');
  };

  const roleMeta = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          title: 'Administrator',
          desc: 'Staff credentials & system control',
          icon: <ShieldCheck size={16} color="#0284c7" />,
          color: '#0284c7',
          bg: '#f0f9ff',
          border: '#bae6fd',
        };
      case 'lab':
        return {
          title: 'Lab Technician',
          desc: 'Specimen acquisition & uploads',
          icon: <FlaskConical size={16} color="#2563eb" />,
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#bfdbfe',
        };
      case 'doctor':
        return {
          title: 'Pathologist',
          desc: 'QuPath digital slide annotation & Gleason',
          icon: <Microscope size={16} color="#059669" />,
          color: '#059669',
          bg: '#ecfdf5',
          border: '#a7f3d0',
        };
      case 'end_user':
        return {
          title: 'Clinician',
          desc: 'AI Second Opinion & Diagnostic Prediction',
          icon: <Sparkles size={16} color="#7c3aed" />,
          color: '#7c3aed',
          bg: '#faf5ff',
          border: '#ddd6fe',
        };
    }
  };

  const currentRoleInfo = currentUser ? roleMeta(currentUser.role) : null;

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '66px',
        gap: '1.25rem',
      }}>
        {/* Brand Logo & Clean Single-Line Lockup */}
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
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00685f 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 3px 10px rgba(0, 104, 95, 0.22)',
            transition: 'transform 0.15s ease',
          }}>
            <Microscope size={20} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: 700, 
              color: '#0f172a', 
              letterSpacing: '-0.02em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              My Antidote
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#00685f',
              background: '#e6f6f4',
              border: '1px solid #a3e0d8',
              padding: '0.18rem 0.55rem',
              borderRadius: '999px',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              Pathology AI
            </span>
          </div>
        </div>

        {/* Clean Segmented Tab Navigation */}
        <nav style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: '#f1f5f9', 
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          gap: '0.2rem',
        }}>
          {/* Admin Tab */}
          {currentUser?.role === 'admin' && (
            <button
              id="nav-admin"
              onClick={() => onTabChange('admin')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'admin' ? 600 : 500,
                color: currentTab === 'admin' ? '#00685f' : '#64748b',
                background: currentTab === 'admin' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                boxShadow: currentTab === 'admin' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={15} color={currentTab === 'admin' ? '#00685f' : '#94a3b8'} />
              <span>Admin Portal</span>
            </button>
          )}

          {/* Lab Tab */}
          {(currentUser?.role === 'lab' || currentUser?.role === 'admin') && (
            <button
              id="nav-lab"
              onClick={() => onTabChange('lab')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'lab' ? 600 : 500,
                color: currentTab === 'lab' ? '#00685f' : '#64748b',
                background: currentTab === 'lab' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                boxShadow: currentTab === 'lab' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <FlaskConical size={15} color={currentTab === 'lab' ? '#00685f' : '#94a3b8'} />
              <span>Lab Uploads</span>
            </button>
          )}

          {/* Doctor Tab */}
          {(currentUser?.role === 'doctor' || currentUser?.role === 'admin') && (
            <button
              id="nav-doctor"
              onClick={() => onTabChange('doctor')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'doctor' ? 600 : 500,
                color: currentTab === 'doctor' ? '#00685f' : '#64748b',
                background: currentTab === 'doctor' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                boxShadow: currentTab === 'doctor' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Microscope size={15} color={currentTab === 'doctor' ? '#00685f' : '#94a3b8'} />
              <span>Annotation Workstation</span>
            </button>
          )}

          {/* End User Tab */}
          {(currentUser?.role === 'end_user' || currentUser?.role === 'admin') && (
            <button
              id="nav-prediction"
              onClick={() => onTabChange('prediction')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'prediction' ? 600 : 500,
                color: currentTab === 'prediction' ? '#00685f' : '#64748b',
                background: currentTab === 'prediction' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                boxShadow: currentTab === 'prediction' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={15} color={currentTab === 'prediction' ? '#00685f' : '#94a3b8'} />
              <span>AI Prediction</span>
            </button>
          )}
        </nav>

        {/* Right Section: Smooth Role Switcher + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Smooth Integrated Role Switcher Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  id="role-switcher-btn"
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    background: currentRoleInfo?.bg || '#f1f5f9',
                    border: `1px solid ${currentRoleInfo?.border || '#cbd5e1'}`,
                    borderRadius: '8px',
                    color: currentRoleInfo?.color || '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Switch Role"
                >
                  {currentRoleInfo?.icon}
                  <span style={{ textTransform: 'capitalize' }}>
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'doctor' ? 'Pathologist' : currentUser.role === 'lab' ? 'Lab Technician' : 'Clinician'}
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.6 }} />
                </button>

                {roleMenuOpen && (
                  <div
                    id="role-switcher-dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.15), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                      border: '1px solid #e2e8f0',
                      zIndex: 300,
                      width: '270px',
                      padding: '0.5rem',
                      animation: 'fadeIn 0.15s ease',
                    }}
                  >
                    <div style={{
                      padding: '0.4rem 0.6rem 0.4rem',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                        SWITCH WORKSPACE ROLE
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#00685f', fontWeight: 600, background: '#e6f6f4', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        Live Demo
                      </span>
                    </div>

                    {/* Role Option Admin */}
                    <button
                      id="switch-role-admin"
                      onClick={() => handleRoleSwitch('admin')}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        textAlign: 'left',
                        background: currentUser.role === 'admin' ? '#f0fdfa' : 'transparent',
                        border: currentUser.role === 'admin' ? '1px solid #99f6e4' : '1px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        marginBottom: '0.2rem',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#e0f2fe' }}>
                          <ShieldCheck size={16} color="#0284c7" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Admin</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Full control &amp; staff issue</div>
                        </div>
                      </div>
                      {currentUser.role === 'admin' && <Check size={15} color="#00685f" />}
                    </button>

                    {/* Role Option Lab */}
                    <button
                      id="switch-role-lab"
                      onClick={() => handleRoleSwitch('lab')}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        textAlign: 'left',
                        background: currentUser.role === 'lab' ? '#eff6ff' : 'transparent',
                        border: currentUser.role === 'lab' ? '1px solid #bfdbfe' : '1px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        marginBottom: '0.2rem',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#dbeafe' }}>
                          <FlaskConical size={16} color="#2563eb" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Lab Technician</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Biopsy plate acquisition</div>
                        </div>
                      </div>
                      {currentUser.role === 'lab' && <Check size={15} color="#2563eb" />}
                    </button>

                    {/* Role Option Pathologist */}
                    <button
                      id="switch-role-doctor"
                      onClick={() => handleRoleSwitch('doctor')}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        textAlign: 'left',
                        background: currentUser.role === 'doctor' ? '#ecfdf5' : 'transparent',
                        border: currentUser.role === 'doctor' ? '1px solid #a7f3d0' : '1px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        marginBottom: '0.2rem',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#d1fae5' }}>
                          <Microscope size={16} color="#059669" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Pathologist</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>QuPath digital slide annotation</div>
                        </div>
                      </div>
                      {currentUser.role === 'doctor' && <Check size={15} color="#059669" />}
                    </button>

                    {/* Role Option Clinician */}
                    <button
                      id="switch-role-enduser"
                      onClick={() => handleRoleSwitch('end_user')}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        textAlign: 'left',
                        background: currentUser.role === 'end_user' ? '#faf5ff' : 'transparent',
                        border: currentUser.role === 'end_user' ? '1px solid #ddd6fe' : '1px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#ede9fe' }}>
                          <Sparkles size={16} color="#7c3aed" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Clinician</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>AI Second Opinion Tool</div>
                        </div>
                      </div>
                      {currentUser.role === 'end_user' && <Check size={15} color="#7c3aed" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Subtle Vertical Divider */}
              <div style={{ width: '1px', height: '22px', background: '#e2e8f0', margin: '0 0.1rem' }} />

              {/* User Identity Chip */}
              <div 
                onClick={onOpenAuth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                title="Account Settings"
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#334155',
                }}>
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.fullName}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1 }}>
                    {currentUser.badgeNumber ? `#${currentUser.badgeNumber}` : currentUser.organization || 'Active'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Credentials Modal, Reset Data, Logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  id="btn-open-auth-modal"
                  onClick={onOpenAuth}
                  className="btn btn-secondary btn-sm"
                  title="Credentials &amp; Roles"
                  style={{ 
                    padding: '0.4rem', 
                    borderRadius: '7px',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <UserCheck size={15} />
                </button>

                <button
                  id="btn-reset-data"
                  onClick={() => {
                    if (confirm('Clear all uploaded images and annotations to start 100% fresh?')) {
                      antidoteStore.resetToDefaults();
                      window.location.reload();
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Clear Local Demo Data"
                  style={{ 
                    padding: '0.4rem', 
                    borderRadius: '7px',
                    color: '#94a3b8',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  id="btn-logout"
                  onClick={() => {
                    antidoteStore.setCurrentUser(null);
                    onOpenAuth();
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Sign Out"
                  style={{ 
                    padding: '0.4rem', 
                    borderRadius: '7px',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    background: '#fff5f5',
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          ) : (
            <button
              id="btn-sign-in"
              onClick={onOpenAuth}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.45rem 1rem' }}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
