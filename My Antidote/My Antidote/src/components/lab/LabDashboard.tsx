import React, { useState, useEffect, useRef } from 'react';
import type { HistologyImage, UserProfile } from '../../types';
import { antidoteStore } from '../../lib/store';
import { 
  FlaskConical, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Eye, 
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';

interface LabDashboardProps {
  currentUser: UserProfile | null;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ currentUser }) => {
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [specimenId, setSpecimenId] = useState('');
  const [tissueType, setTissueType] = useState('Prostate Core Biopsy (Peripheral Zone)');
  const [stainType, setStainType] = useState('H&E (Hematoxylin & Eosin)');
  const [magnification, setMagnification] = useState('40x Optical');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [inspectImage, setInspectImage] = useState<HistologyImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshImages = () => {
    setImages(antidoteStore.getImagesForCurrentRole());
  };

  useEffect(() => {
    refreshImages();
    const unsubscribe = antidoteStore.subscribe(refreshImages);
    return unsubscribe;
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!specimenId) {
        setSpecimenId(`BX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!specimenId) {
        setSpecimenId(`BX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSpecimenId = specimenId.trim() || `BX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = antidoteStore.labUploadImage({
      specimenId: finalSpecimenId,
      tissueType,
      stainType,
      magnification,
      notes,
      imageFile: selectedFile,
    });

    if (res.success) {
      setUploadSuccess(true);
      setSpecimenId('');
      setNotes('');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadSuccess(false), 4000);
    }
  };

  // Generate quick demo slide
  const handleQuickDemoSlide = () => {
    const demoId = `BX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setSpecimenId(demoId);
    setNotes('High cellular density in peripheral core. Marked hyperchromatic nuclei.');
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
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
            <FlaskConical size={26} color="var(--color-secondary)" />
            <h1 style={{ fontSize: '1.75rem' }}>Histopathology Lab Acquisition Portal</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Authenticated Lab Node: <strong>{currentUser?.fullName}</strong> ({currentUser?.organization || 'Histopathology Operations'})
          </p>
        </div>

        {/* Security badge */}
        <div style={{
          background: 'var(--color-secondary-light)',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.5rem 0.85rem',
          fontSize: '0.75rem',
          color: 'var(--color-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Layers size={16} />
          <span><strong>RLS Enforced:</strong> Private Storage Bucket (plate-images)</span>
        </div>
      </div>

      {/* Main Grid: Upload Form + History Table */}
      <div className="bento-grid">
        {/* Left 5 cols: Upload Panel */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Deposit Histopathology Plate</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Upload high-resolution microscope slide or biopsy core for pathologist annotation.
          </p>

          {uploadSuccess && (
            <div style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '6px',
              padding: '0.75rem',
              color: 'var(--color-success)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <CheckCircle2 size={18} />
              <span>Plate uploaded to private storage and queued for annotation!</span>
            </div>
          )}

          <form onSubmit={handleUpload}>
            {/* File Drop Area */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#fafafa',
                marginBottom: '1.25rem',
                transition: 'var(--transition)',
              }}
            >
              <input
                ref={fileInputRef}
                id="plate-file-input"
                type="file"
                accept="image/*,.svs,.tif,.tiff"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '6px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.5rem', fontWeight: 500 }}>
                    {selectedFile?.name || 'Slide image loaded'}
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={36} color="var(--color-secondary)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    Drop slide plate image here
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Supports SVS, TIF, PNG, JPG (up to 50MB)
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickDemoSlide}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                <Sparkles size={13} color="var(--color-primary)" /> Auto-fill Specimen ID
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Specimen Accession ID</label>
              <input
                id="input-specimen-id"
                type="text"
                className="form-input"
                placeholder="e.g. BX-2026-9281"
                value={specimenId}
                onChange={e => setSpecimenId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anatomical Biopsy Zone</label>
              <select
                id="select-tissue-type"
                className="form-select"
                value={tissueType}
                onChange={e => setTissueType(e.target.value)}
              >
                <option value="Prostate Core Biopsy (Peripheral Zone)">Peripheral Zone (PZ Core)</option>
                <option value="Prostate Core Biopsy (Transition Zone)">Transition Zone (TZ Core)</option>
                <option value="Prostate Core Biopsy (Apex Left)">Prostate Apex (Left)</option>
                <option value="Prostate Core Biopsy (Apex Right)">Prostate Apex (Right)</option>
                <option value="Transurethral Resection of the Prostate (TURP)">TURP Tissue Chips</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Histochemical Stain</label>
                <select
                  id="select-stain-type"
                  className="form-select"
                  value={stainType}
                  onChange={e => setStainType(e.target.value)}
                >
                  <option value="H&E (Hematoxylin & Eosin)">H&amp;E Standard</option>
                  <option value="IHC PIN-4 Cocktail">IHC PIN-4</option>
                  <option value="Masson's Trichrome">Trichrome</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Magnification</label>
                <select
                  id="select-magnification"
                  className="form-select"
                  value={magnification}
                  onChange={e => setMagnification(e.target.value)}
                >
                  <option value="40x Optical">40x High-Power</option>
                  <option value="20x Optical">20x Medium-Power</option>
                  <option value="100x Oil Immersion">100x Oil Immersion</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Technician Observations / Notes</label>
              <textarea
                id="input-lab-notes"
                className="form-textarea"
                rows={2}
                placeholder="Slide preparation quality, staining depth, or slide artifacts..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              id="btn-submit-plate-upload"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <UploadCloud size={16} /> Deposit Slide to Annotation Pipeline
            </button>
          </form>
        </div>

        {/* Right 7 cols: My Uploaded Plates History (RLS Protected) */}
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem' }}>My Facility Uploads &amp; Status</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Viewing only slides uploaded by your lab account (Row-Level Security enforced)
              </p>
            </div>
            <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
              {images.length} Specimens Deposited
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slide</th>
                  <th>Specimen ID</th>
                  <th>Zone / Optical</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {images.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No plates uploaded by this lab node yet. Use the upload panel on the left to deposit your first biopsy slide.
                    </td>
                  </tr>
                ) : (
                  images.map(img => (
                    <tr key={img.id}>
                      <td style={{ width: '60px' }}>
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
                        <strong className="mono" style={{ color: 'var(--color-secondary)' }}>{img.specimenId}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{img.stainType}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>{img.tissueType}</div>
                        <span className="badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#f8fafc', color: '#64748b' }}>
                          {img.magnification}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${img.status}`}>
                          {img.status === 'annotated' ? 'Annotated' : 'Pending Queue'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(img.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          id={`btn-inspect-slide-${img.specimenId}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setInspectImage(img)}
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Eye size={14} /> View
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

      {/* Slide Inspection Modal */}
      {inspectImage && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
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
            maxWidth: '680px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-bg)',
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Specimen Slide: {inspectImage.specimenId}</h3>
                <span className={`badge badge-${inspectImage.status}`} style={{ marginTop: '0.25rem' }}>
                  {inspectImage.status.toUpperCase()}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setInspectImage(null)}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{
                background: '#0f172a',
                borderRadius: '8px',
                padding: '0.5rem',
                textAlign: 'center',
                marginBottom: '1rem',
              }}>
                <img
                  src={inspectImage.fileUrl}
                  alt={inspectImage.specimenId}
                  style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><strong>Tissue Zone:</strong> {inspectImage.tissueType}</div>
                <div><strong>Stain Protocol:</strong> {inspectImage.stainType}</div>
                <div><strong>Magnification:</strong> {inspectImage.magnification}</div>
                <div><strong>Uploaded At:</strong> {new Date(inspectImage.createdAt).toLocaleString()}</div>
              </div>

              {inspectImage.notes && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <strong>Lab Notes:</strong> {inspectImage.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
