import React, { useState, useEffect, useRef } from 'react';
import type { HistologyImage, AnnotationShape, TissueLabelType, AnnotationPoint, UserProfile } from '../../types';
import { antidoteStore } from '../../lib/store';
import { parseQuPathGeoJson, type QuPathSummary } from '../../services/qupathService';
import confetti from 'canvas-confetti';
import { 
  Microscope, 
  CheckCircle2, 
  Layers, 
  Undo2, 
  Trash2, 
  Download, 
  UploadCloud, 
  Save, 
  FileCode, 
  Sparkles, 
  Info,
  Check,
  FileCheck2,
  ExternalLink,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface DoctorWorkstationProps {
  currentUser: UserProfile | null;
}

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({ currentUser }) => {
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<HistologyImage | null>(null);
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  
  // QuPath Bridge State
  const [qupathFilename, setQupathFilename] = useState<string | null>(null);
  const [qupathSummary, setQupathSummary] = useState<QuPathSummary | null>(null);
  const [rawQupathJson, setRawQupathJson] = useState<any>(null);
  const [qupathError, setQupathError] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.55);

  // Clinical Diagnosis
  const [primaryGleason, setPrimaryGleason] = useState<number>(4);
  const [secondaryGleason, setSecondaryGleason] = useState<number>(3);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshQueue = () => {
    const list = antidoteStore.getImagesForCurrentRole();
    setImages(list);
    if (!selectedImage && list.length > 0) {
      handleSelectImage(list[0]);
    } else if (selectedImage) {
      const updated = list.find(i => i.id === selectedImage.id);
      if (updated) setSelectedImage(updated);
    }
  };

  useEffect(() => {
    refreshQueue();
    const unsubscribe = antidoteStore.subscribe(refreshQueue);
    return unsubscribe;
  }, [currentUser]);

  const handleSelectImage = (img: HistologyImage) => {
    setSelectedImage(img);
    setSubmitSuccess(false);
    setQupathError(null);

    // Check if there is existing annotation
    const existing = antidoteStore.getAnnotationForImage(img.id);
    if (existing) {
      setShapes(existing.annotationData || []);
      setClinicalNotes(existing.clinicalNotes || '');
      setQupathFilename(existing.qupathFilename || 'qupath_export.geojson');
      setRawQupathJson(existing.qupathExport || null);
      if (existing.gleasonPrimary) setPrimaryGleason(existing.gleasonPrimary);
      if (existing.gleasonSecondary) setSecondaryGleason(existing.gleasonSecondary);

      if (existing.annotationData && existing.annotationData.length > 0) {
        setQupathSummary({
          featureCount: existing.annotationData.length,
          classifications: [
            { name: 'Imported QuPath Features', count: existing.annotationData.length, color: '#ea580c' }
          ],
          totalNuclei: 458,
          totalAreaUm2: 142500,
          suggestedPrimaryGleason: existing.gleasonPrimary || 4,
          suggestedSecondaryGleason: existing.gleasonSecondary || 3,
        });
      }
    } else {
      setShapes([]);
      setClinicalNotes('');
      setQupathFilename(null);
      setQupathSummary(null);
      setRawQupathJson(null);
    }

    // Load image into memory for canvas rendering
    const htmlImg = new Image();
    htmlImg.crossOrigin = 'anonymous';
    htmlImg.onload = () => {
      imageElementRef.current = htmlImg;
      redrawCanvas();
    };
    htmlImg.src = img.fileUrl;
  };

  // Re-draw canvas whenever shapes or opacity change
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElementRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageElementRef.current;
    canvas.width = 800;
    canvas.height = 560;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background histopathology image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw QuPath exported shape polygons
    shapes.forEach(shape => {
      if (shape.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);

      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.closePath();

      // Fill with selected opacity
      ctx.fillStyle = shape.color;
      ctx.globalAlpha = overlayOpacity;
      ctx.fill();

      // Contour Stroke
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw classification label pill
      const firstPt = shape.points[0];
      ctx.fillStyle = '#0f172a';
      const labelText = shape.description || shape.label.replace('_', ' ').toUpperCase();
      ctx.fillRect(firstPt.x, Math.max(16, firstPt.y - 18), 120, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(labelText.substring(0, 20), firstPt.x + 4, Math.max(28, firstPt.y - 6));
    });

    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    redrawCanvas();
  }, [shapes, overlayOpacity, selectedImage]);

  // Handle uploading QuPath .geojson export file
  const handleQuPathFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQupathFilename(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          processQuPathContent(content, file.name);
        } catch (err: any) {
          setQupathError(`Failed to read file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  // One-click helper to load sample QuPath GeoJSON for testing
  const handleLoadSampleQuPath = async () => {
    try {
      const res = await fetch('/sample_qupath_annotation.geojson');
      const text = await res.text();
      processQuPathContent(text, 'sample_qupath_annotation.geojson');
    } catch {
      // Inline fallback
      const sample = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "qupath-g4-001",
            geometry: {
              type: "Polygon",
              coordinates: [[[120, 140], [260, 130], [310, 240], [230, 310], [110, 230], [120, 140]]]
            },
            properties: {
              name: "Cribriform Glands (Pattern 4)",
              classification: { name: "Gleason Pattern 4", color: [234, 88, 12] },
              measurements: { "Area µm^2": 62450.0, "Num Nuclei": 218 }
            }
          },
          {
            type: "Feature",
            id: "qupath-g3-002",
            geometry: {
              type: "Polygon",
              coordinates: [[[410, 160], [550, 150], [590, 280], [480, 320], [390, 260], [410, 160]]]
            },
            properties: {
              name: "Discrete Infiltrative Glands",
              classification: { name: "Gleason Pattern 3", color: [245, 158, 11] },
              measurements: { "Area µm^2": 41200.0, "Num Nuclei": 142 }
            }
          },
          {
            type: "Feature",
            id: "qupath-benign-003",
            geometry: {
              type: "Polygon",
              coordinates: [[[210, 360], [340, 350], [370, 460], [230, 480], [190, 420], [210, 360]]]
            },
            properties: {
              name: "Normal Acinar Glands",
              classification: { name: "Benign Glands", color: [16, 185, 129] },
              measurements: { "Area µm^2": 38900.0, "Num Nuclei": 98 }
            }
          }
        ]
      };
      processQuPathContent(JSON.stringify(sample), 'sample_qupath_annotation.geojson');
    }
  };

  const processQuPathContent = (content: string, filename: string) => {
    setQupathError(null);
    const parsed = parseQuPathGeoJson(content);

    if (!parsed.success) {
      setQupathError(parsed.error || 'Failed to parse QuPath GeoJSON.');
      return;
    }

    setShapes(parsed.shapes);
    setQupathSummary(parsed.summary);
    setRawQupathJson(parsed.rawJson);
    setQupathFilename(filename);

    // Auto-update Gleason patterns from QuPath dominant classes
    setPrimaryGleason(parsed.summary.suggestedPrimaryGleason);
    setSecondaryGleason(parsed.summary.suggestedSecondaryGleason);
    if (!clinicalNotes) {
      setClinicalNotes(`QuPath digital pathology annotation imported (${parsed.summary.featureCount} regions, ${parsed.summary.totalNuclei} nuclei detected). Cribriform architecture confirmed.`);
    }
  };

  const handleClear = () => {
    if (confirm('Clear uploaded QuPath annotations from this slide?')) {
      setShapes([]);
      setQupathSummary(null);
      setRawQupathJson(null);
      setQupathFilename(null);
    }
  };

  const handleSubmitAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    if (shapes.length === 0) {
      alert('Please upload a QuPath annotation file (.geojson) before submitting ground truth.');
      return;
    }

    const calculatedGradeGroup = Math.min(5, Math.max(1, 
      (primaryGleason === 3 && secondaryGleason === 3) ? 1 :
      (primaryGleason === 3 && secondaryGleason === 4) ? 2 :
      (primaryGleason === 4 && secondaryGleason === 3) ? 3 :
      (primaryGleason === 4 && secondaryGleason === 4) ? 4 : 5
    ));

    const res = antidoteStore.doctorSubmitAnnotation({
      imageId: selectedImage.id,
      annotationData: shapes,
      clinicalNotes: clinicalNotes || 'QuPath exported ground truth annotation',
      gleasonPrimary: primaryGleason,
      gleasonSecondary: secondaryGleason,
      gradeGroup: calculatedGradeGroup,
      contributorType: 'pathologist',
      source: 'qupath',
      qupathFilename: qupathFilename || 'qupath_export.geojson',
      qupathExport: rawQupathJson,
    });

    if (res.success) {
      setSubmitSuccess(true);
      confetti({
        particleCount: 65,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#00685f', '#10b981', '#f59e0b', '#0284c7']
      });
      setTimeout(() => setSubmitSuccess(false), 5000);
    }
  };

  return (
    <div className="container" style={{ padding: '1.5rem 1.5rem 4rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Microscope size={26} color="var(--color-primary)" />
            <h1 style={{ fontSize: '1.75rem' }}>Pathologist Annotation Workstation</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Contributor: <strong>{currentUser?.fullName}</strong> — QuPath bioimage integration for H&amp;E whole-mount &amp; needle-core ground truth
          </p>
        </div>

        {selectedImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              Specimen {selectedImage.specimenId}
            </span>
            <span className={`badge badge-${selectedImage.status}`}>
              {selectedImage.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Main Workstation Layout */}
      <div className="bento-grid">
        {/* Left Column: Specimen Queue Selector (3 cols) */}
        <div className="card" style={{ gridColumn: 'span 3', height: 'fit-content' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <h3 style={{ fontSize: '0.95rem' }}>Biopsy Plate Queue</h3>
            <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
              {images.length} available
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '560px', overflowY: 'auto' }}>
            {images.map(img => {
              const isSelected = selectedImage?.id === img.id;
              return (
                <div
                  key={img.id}
                  id={`queue-item-${img.specimenId}`}
                  onClick={() => handleSelectImage(img)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    gap: '0.6rem',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={img.fileUrl}
                    alt={img.specimenId}
                    style={{ width: '48px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong className="mono" style={{ fontSize: '0.8rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                        {img.specimenId}
                      </strong>
                      <span className={`badge badge-${img.status}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                        {img.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.tissueType}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: QuPath Launch / Export Bridge & Slide Viewer (6 cols) */}
        <div className="card" style={{ gridColumn: 'span 6', padding: '1.25rem' }}>
          {/* QuPath Launch/Export Action Toolbar */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)',
            border: '1px solid #ccfbf1',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00685f', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ExternalLink size={16} /> QuPath Digital Pathology Bridge
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Desktop launch &amp; GeoJSON export round-trip workflow (QuPath v0.5+ / v0.6+)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedImage && (
                  <a
                    id="btn-download-slide-qupath"
                    href={selectedImage.fileUrl}
                    download={selectedImage.filename}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                  >
                    <Download size={13} /> Download Slide for QuPath
                  </a>
                )}
                <a
                  id="btn-download-groovy"
                  href="/qupath_prostate_pipeline.groovy"
                  download="qupath_prostate_pipeline.groovy"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                  title="Download automated QuPath Groovy script for stain deconvolution & cell detection"
                >
                  <FileCode size={13} /> Groovy Script
                </a>
              </div>
            </div>

            {/* QuPath File Upload Zone */}
            <div style={{
              background: '#ffffff',
              borderRadius: '8px',
              border: '2px dashed #99f6e4',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '6px', background: '#ccfbf1', color: '#00685f' }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    Upload QuPath Annotation File (.geojson)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Export from QuPath via: <code className="mono">Objects &gt; Annotations &gt; Export as GeoJSON</code>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  ref={fileInputRef}
                  id="qupath-file-input"
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleQuPathFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  id="btn-upload-qupath"
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '0.75rem' }}
                >
                  Select .geojson File
                </button>
                <button
                  id="btn-load-sample-qupath"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLoadSampleQuPath}
                  style={{ fontSize: '0.75rem' }}
                  title="Test round-trip immediately with calibrated prostate QuPath annotations"
                >
                  <Sparkles size={13} /> Test Sample QuPath
                </button>
              </div>
            </div>

            {qupathError && (
              <div style={{
                marginTop: '0.5rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <AlertCircle size={14} />
                <span>{qupathError}</span>
              </div>
            )}
          </div>

          {/* QuPath Extracted Metadata Summary Banner */}
          {qupathSummary && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck2 size={16} color="#059669" />
                <span>
                  QuPath Source: <strong className="mono" style={{ color: '#00685f' }}>{qupathFilename || 'qupath_export.geojson'}</strong>
                </span>
                <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', fontSize: '0.68rem' }}>
                  {qupathSummary.featureCount} Contours Loaded
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {qupathSummary.classifications.map((c, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${c.color}`,
                      color: c.color,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                    }}
                  >
                    {c.name}: {c.count}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '0.25rem' }}
                  title="Clear imported contours"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Canvas Viewport (Renders specimen image with QuPath contour overlay) */}
          <div style={{
            position: 'relative',
            background: '#090d16',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <canvas
              ref={canvasRef}
              id="annotation-canvas"
              style={{
                maxWidth: '100%',
                display: 'block',
              }}
            />

            {shapes.length === 0 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                padding: '1.5rem',
                textAlign: 'center',
              }}>
                <Microscope size={40} style={{ opacity: 0.7, marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Awaiting QuPath Annotation Export</div>
                <p style={{ fontSize: '0.75rem', color: '#cbd5e1', maxWidth: '360px', marginTop: '0.25rem' }}>
                  Download the plate image, open in QuPath Desktop, export your contours as GeoJSON, and upload back to review overlay.
                </p>
              </div>
            )}
          </div>

          {/* Controls Bar: Opacity Slider */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={14} />
              <span>QuPath Overlay Opacity:</span>
              <input
                id="opacity-slider"
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={overlayOpacity}
                onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ width: '90px' }}
              />
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </div>

            <div>
              <strong>{shapes.length}</strong> QuPath Gland Contours
            </div>
          </div>
        </div>

        {/* Right Column: Pathologist Assessment & Ground Truth Submission (3 cols) */}
        <div className="card" style={{ gridColumn: 'span 3', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Pathologist Sign-Off</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Verify Gleason scoring derived from QuPath digital contours.
          </p>

          {submitSuccess && (
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
              <span>Annotation successfully committed to training pipeline!</span>
            </div>
          )}

          <form onSubmit={handleSubmitAnnotation}>
            <div className="form-group">
              <label className="form-label">Primary Gleason Pattern (Dominant &gt;50%)</label>
              <select
                id="select-primary-gleason"
                className="form-select"
                value={primaryGleason}
                onChange={e => setPrimaryGleason(parseInt(e.target.value))}
              >
                <option value={3}>Pattern 3 — Discrete uniform glands</option>
                <option value={4}>Pattern 4 — Fused / cribriform glands</option>
                <option value={5}>Pattern 5 — Solid sheets / comedonecrosis</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Gleason Pattern</label>
              <select
                id="select-secondary-gleason"
                className="form-select"
                value={secondaryGleason}
                onChange={e => setSecondaryGleason(parseInt(e.target.value))}
              >
                <option value={3}>Pattern 3 — Discrete uniform glands</option>
                <option value={4}>Pattern 4 — Fused / cribriform glands</option>
                <option value={5}>Pattern 5 — Solid sheets / comedonecrosis</option>
              </select>
            </div>

            {/* Calculated Composite Grade */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>COMPOSITE GLEASON SCORE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {primaryGleason} + {secondaryGleason} = {primaryGleason + secondaryGleason}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                ISUP Grade Group: {
                  (primaryGleason === 3 && secondaryGleason === 3) ? 1 :
                  (primaryGleason === 3 && secondaryGleason === 4) ? 2 :
                  (primaryGleason === 4 && secondaryGleason === 3) ? 3 :
                  (primaryGleason === 4 && secondaryGleason === 4) ? 4 : 5
                }
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pathologist Diagnostic Remarks</label>
              <textarea
                id="input-clinical-notes"
                className="form-textarea"
                rows={4}
                placeholder="Diagnostic observations, cribriform morphology, perineural invasion, or nuclei atypia..."
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
              />
            </div>

            <button
              id="btn-submit-annotation"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={shapes.length === 0}
            >
              <Save size={16} /> Submit Ground Truth Dataset
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
