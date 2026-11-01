import React, { useState, useEffect } from 'react';
import type { UserProfile, HistologyImage } from '../../types';
import { antidoteStore } from '../../lib/store';
import { 
  ShieldCheck, 
  UserPlus, 
  Download, 
  Users, 
  FlaskConical, 
  Microscope, 
  CheckCircle2, 
  Copy, 
  Clock, 
  Filter,
  FileSpreadsheet
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create user form
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'lab' | 'doctor'>('lab');
  const [formOrg, setFormOrg] = useState('');
  const [issuedCreds, setIssuedCreds] = useState<{ email: string; pass: string; badge: string; role: string } | null>(null);

  // Table filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'annotated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    setProfiles(antidoteStore.getAllProfiles());
    setImages(antidoteStore.getImagesForCurrentRole());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = antidoteStore.subscribe(refreshData);
    return unsubscribe;
  }, []);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formName || !formOrg) return;

    const res = antidoteStore.adminCreateStaffUser({
      email: formEmail,
      fullName: formName,
      role: formRole,
      organization: formOrg,
    });

    if (res.success && res.user && res.tempPassword) {
      setIssuedCreds({
        email: res.user.email,
        pass: res.tempPassword,
        badge: res.user.badgeNumber || 'N/A',
        role: res.user.role.toUpperCase(),
      });
      setFormEmail('');
      setFormName('');
      setFormOrg('');
    }
  };

  const handleExportDataset = () => {
    try {
      const jsonString = antidoteStore.exportDatasetJson();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my_antidote_annotated_dataset_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const filteredImages = images.filter(img => {
    const matchesStatus = statusFilter === 'all' || img.status === statusFilter;
    const matchesSearch = img.specimenId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          img.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          img.tissueType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAnnotated = images.filter(i => i.status === 'annotated').length;
  const totalPending = images.filter(i => i.status === 'pending').length;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Top Header & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ShieldCheck size={26} color="var(--color-primary)" />
            <h1 style={{ fontSize: '1.75rem' }}>Chief Administrator Control Center</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Centralized role issuance, histopathology pipeline oversight, and dataset export for ML training.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            id="btn-issue-credentials"
            className="btn btn-primary"
            onClick={() => { setIssuedCreds(null); setIsCreateModalOpen(true); }}
          >
            <UserPlus size={16} /> Issue Staff Credentials
          </button>

          <button
            id="btn-export-dataset"
            className="btn btn-secondary"
            onClick={handleExportDataset}
          >
            <Download size={16} /> Export Dataset (JSON)
          </button>
        </div>
      </div>

      {/* Metrics Bento Cards */}
      <div className="bento-grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                TRAINING READY (ANNOTATED)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                {totalAnnotated}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--color-success-bg)', borderRadius: '8px', color: 'var(--color-success)' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Ground-truth segmented slides with Gleason labels
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                DOCTOR QUEUE (PENDING)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                {totalPending}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--color-warning-bg)', borderRadius: '8px', color: 'var(--color-warning)' }}>
              <Clock size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Awaiting pathologist region contouring
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                REGISTERED LABS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
                {profiles.filter(p => p.role === 'lab').length}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--color-secondary-light)', borderRadius: '8px', color: 'var(--color-secondary)' }}>
              <FlaskConical size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Authorized histopathology acquisition nodes
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                PATHOLOGISTS / DOCTORS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                {profiles.filter(p => p.role === 'doctor').length}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--color-primary-light)', borderRadius: '8px', color: 'var(--color-primary)' }}>
              <Microscope size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Board-certified annotating contributors
          </div>
        </div>
      </div>

      {/* Main Content Sections: Dataset Pipeline + User Directory */}
      <div className="bento-grid">
        {/* Pipeline Monitor (Left 8 cols) */}
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.1rem' }}>Global Histopathology Plate Pipeline</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Real-time visibility across all uploaded specimen plates and annotation status
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="search-specimens"
                type="text"
                placeholder="Search Specimen ID..."
                className="form-input"
                style={{ width: '180px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                id="filter-status"
                className="form-select"
                style={{ width: '130px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="annotated">Annotated</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slide Preview</th>
                  <th>Specimen ID</th>
                  <th>Uploader Node</th>
                  <th>Magnification</th>
                  <th>Status</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {filteredImages.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No biopsy records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredImages.map(img => (
                    <tr key={img.id}>
                      <td style={{ width: '70px' }}>
                        <img
                          src={img.fileUrl}
                          alt={img.specimenId}
                          style={{
                            width: '48px',
                            height: '36px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            border: '1px solid var(--color-border)',
                          }}
                        />
                      </td>
                      <td>
                        <strong className="mono" style={{ color: 'var(--color-primary)' }}>{img.specimenId}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{img.tissueType}</div>
                      </td>
                      <td>
                        <div>{img.uploaderName || 'Unspecified Lab'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Node #{img.uploaderId}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {img.magnification}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${img.status}`}>
                          {img.status === 'annotated' ? 'Annotated (Ready)' : 'Pending Review'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(img.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Accounts & Issued Credentials (Right 4 cols) */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <h2 style={{ fontSize: '1.1rem' }}>Active Accounts Directory</h2>
            <span className="badge" style={{ background: '#f8fafc', color: 'var(--color-text-muted)' }}>
              {profiles.length} total
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
            {profiles.map(usr => (
              <div
                key={usr.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{usr.fullName}</strong>
                  <span className={`badge badge-role-${usr.role}`}>
                    {usr.role}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {usr.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {usr.organization || 'General User'}
                </div>
                {usr.temporaryPassword && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.35rem 0.5rem',
                    background: '#fef3c7',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    color: '#92400e',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>Issued Temp Pass: <strong className="mono">{usr.temporaryPassword}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Issue Staff Credentials */}
      {isCreateModalOpen && (
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
            padding: '1.5rem',
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Issue Medical Staff Credentials</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Create an authorized account for a Histopathology Lab or Consulting Pathologist.
            </p>

            {issuedCreds ? (
              <div style={{
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <CheckCircle2 size={18} /> Credentials Generated Successfully!
                </div>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#1e293b' }}>
                  <div><strong>Issued Role:</strong> {issuedCreds.role}</div>
                  <div><strong>Badge Identifier:</strong> <span className="mono">{issuedCreds.badge}</span></div>
                  <div><strong>Staff Email / Login ID:</strong> <span className="mono">{issuedCreds.email}</span></div>
                  <div><strong>Generated Password:</strong> <span className="mono" style={{ background: '#ffffff', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{issuedCreds.pass}</span></div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                  Provide these credentials securely to the authorized staff member.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`Email: ${issuedCreds.email}\nPassword: ${issuedCreds.pass}\nBadge: ${issuedCreds.badge}`);
                      alert('Credentials copied to clipboard');
                    }}
                  >
                    <Copy size={14} /> Copy Credentials
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateStaff}>
                <div className="form-group">
                  <label className="form-label">Role Category</label>
                  <select
                    id="new-staff-role"
                    className="form-select"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as any)}
                  >
                    <option value="lab">Histopathology Lab (Upload Plates &amp; View Own Uploads)</option>
                    <option value="doctor">Doctor / Pathologist (Annotate Plates in Queue)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name / Facility Title</label>
                  <input
                    id="new-staff-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Julian Croft or Central Histology Core"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email / Login Identifier</label>
                  <input
                    id="new-staff-email"
                    type="email"
                    className="form-input"
                    placeholder="staff@myantidote.health"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization / Hospital Affiliation</label>
                  <input
                    id="new-staff-org"
                    type="text"
                    className="form-input"
                    placeholder="e.g. University Oncology Core"
                    value={formOrg}
                    onChange={e => setFormOrg(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-create-staff"
                    type="submit"
                    className="btn btn-primary"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
