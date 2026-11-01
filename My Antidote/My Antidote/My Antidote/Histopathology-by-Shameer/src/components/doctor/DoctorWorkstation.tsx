import React, { useState, useEffect, useRef } from 'react';
import type { HistologyImage, AnnotationShape, TissueLabelType, AnnotationPoint, UserProfile } from '../../types';
import { antidoteStore } from '../../lib/store';
import confetti from 'canvas-confetti';
import { 
  Microscope, 
  CheckCircle2, 
  Layers, 
  Undo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Save, 
  PenTool, 
  Square, 
  Sliders,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface DoctorWorkstationProps {
  currentUser: UserProfile | null;
}

const TISSUE_LABELS: { type: TissueLabelType; label: string; color: string; desc: string }[] = [
  { type: 'gleason_5', label: 'Gleason Pattern 5', color: '#ef4444', desc: 'Sheets of atypical cells / comedo-necrosis' },
  { type: 'gleason_4', label: 'Gleason Pattern 4', color: '#ea580c', desc: 'Fused micro-acini / cribriform architecture' },
  { type: 'gleason_3', label: 'Gleason Pattern 3', color: '#f59e0b', desc: 'Discrete variable glands, infiltrative' },
  { type: 'benign_gland', label: 'Benign Glands', color: '#10b981', desc: 'Normal acinar morphology with basal layer' },
  { type: 'stroma', label: 'Stroma & Infiltrate', color: '#64748b', desc: 'Fibromuscular stroma or lymphocytic cluster' },
];

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({ currentUser }) => {
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<HistologyImage | null>(null);
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  
  // Active Tool & Label
  const [activeTool, setActiveTool] = useState<'polygon' | 'rect' | 'freehand'>('polygon');
  const [activeLabel, setActiveLabel] = useState<TissueLabelType>('gleason_4');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.4);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Clinical Diagnosis
  const [primaryGleason, setPrimaryGleason] = useState<number>(4);
  const [secondaryGleason, setSecondaryGleason] = useState<number>(3);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // In-progress drawing state
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  const refreshQueue = () => {
    const list = antidoteStore.getImagesForCurrentRole();
    setImages(list);
    if (!selectedImage && list.length > 0) {
      handleSelectImage(list[0]);
    } else if (selectedImage) {
      // Refresh current image object
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

    // Check if there is existing annotation
    const existing = antidoteStore.getAnnotationForImage(img.id);
    if (existing) {
      setShapes(existing.annotationData || []);
      setClinicalNotes(existing.clinicalNotes || '');
      if (existing.gleasonPrimary) setPrimaryGleason(existing.gleasonPrimary);
      if (existing.gleasonSecondary) setSecondaryGleason(existing.gleasonSecondary);
    } else {
      setShapes([]);
      setClinicalNotes('');
      setCurrentPoints([]);
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

  // Re-draw canvas whenever shapes, points, zoom, opacity change
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

    // Draw existing completed shapes
    shapes.forEach(shape => {
      if (shape.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);

      if (shape.type === 'rect' && shape.points.length === 2) {
        const p1 = shape.points[0];
        const p2 = shape.points[1];
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else {
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.closePath();
      }

      // Fill with selected opacity
      ctx.fillStyle = shape.color;
      ctx.globalAlpha = overlayOpacity;
      ctx.fill();

      // Stroke
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw label pill near first vertex
      const firstPt = shape.points[0];
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(firstPt.x, firstPt.y - 18, 90, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(shape.label.replace('_', ' ').toUpperCase(), firstPt.x + 4, firstPt.y - 6);
    });

    // Draw in-progress points
    if (currentPoints.length > 0) {
      const activeColor = TISSUE_LABELS.find(l => l.type === activeLabel)?.color || '#ea580c';
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vertex handles
      currentPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    redrawCanvas();
  }, [shapes, currentPoints, overlayOpacity, zoomLevel, selectedImage]);

  // Canvas Mouse Interactions
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): AnnotationPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'polygon') return;
    const pt = getCanvasCoords(e);

    // If close to first point and we have >= 3 points, close polygon!
    if (currentPoints.length >= 3) {
      const first = currentPoints[0];
      const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
      if (dist < 15) {
        completeCurrentShape();
        return;
      }
    }

    setCurrentPoints(prev => [...prev, pt]);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'polygon') return;
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setCurrentPoints([pt]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    if (activeTool === 'rect') {
      setCurrentPoints([currentPoints[0], pt]);
    } else if (activeTool === 'freehand') {
      setCurrentPoints(prev => [...prev, pt]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length >= 2) {
      completeCurrentShape();
    } else {
      setCurrentPoints([]);
    }
  };

  const completeCurrentShape = () => {
    if (currentPoints.length < 2) return;
    const activeColor = TISSUE_LABELS.find(l => l.type === activeLabel)?.color || '#ea580c';
    const newShape: AnnotationShape = {
      id: `shp-${Date.now().toString(36)}`,
      type: activeTool,
      points: [...currentPoints],
      label: activeLabel,
      color: activeColor,
      description: TISSUE_LABELS.find(l => l.type === activeLabel)?.desc,
    };

    setShapes(prev => [...prev, newShape]);
    setCurrentPoints([]);
  };

  const handleUndo = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(prev => prev.slice(0, -1));
    } else {
      setShapes(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (confirm('Clear all segmented regions on this slide?')) {
      setShapes([]);
      setCurrentPoints([]);
    }
  };

  const handleSubmitAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    if (shapes.length === 0) {
      alert('Please segment at least one region (e.g. Gleason 3/4/5 or Benign) before submitting ground truth.');
      return;
    }

    const calculatedGradeGroup = Math.min(5, Math.max(1, (primaryGleason === 3 && secondaryGleason === 3) ? 1 :
      (primaryGleason === 3 && secondaryGleason === 4) ? 2 :
      (primaryGleason === 4 && secondaryGleason === 3) ? 3 :
      (primaryGleason === 4 && secondaryGleason === 4) ? 4 : 5
    ));

    const res = antidoteStore.doctorSubmitAnnotation({
      imageId: selectedImage.id,
      annotationData: shapes,
      clinicalNotes,
      gleasonPrimary: primaryGleason,
      gleasonSecondary: secondaryGleason,
      gradeGroup: calculatedGradeGroup,
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
            Contributor: <strong>{currentUser?.fullName}</strong> — Contouring training ground truth for nuclei &amp; glandular segmentation
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

        {/* Center Column: Interactive Canvas & Toolbar (6 cols) */}
        <div className="card" style={{ gridColumn: 'span 6', padding: '1rem' }}>
          {/* Workstation Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {/* Tool selectors */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                id="tool-polygon"
                className={`btn btn-sm ${activeTool === 'polygon' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTool('polygon'); setCurrentPoints([]); }}
                title="Click points to outline polygon; click first vertex to close"
              >
                <PenTool size={14} /> Polygon
              </button>
              <button
                id="tool-rect"
                className={`btn btn-sm ${activeTool === 'rect' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTool('rect'); setCurrentPoints([]); }}
                title="Click and drag bounding box"
              >
                <Square size={14} /> Bounding Box
              </button>
            </div>

            {/* Canvas Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                id="btn-undo-shape"
                className="btn btn-secondary btn-sm"
                onClick={handleUndo}
                title="Undo last vertex or region"
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                id="btn-clear-shapes"
                className="btn btn-secondary btn-sm"
                onClick={handleClear}
                title="Clear all contours"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          {/* Active Histology Category Palette */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}>
            {TISSUE_LABELS.map(lbl => {
              const isSelected = activeLabel === lbl.type;
              return (
                <button
                  key={lbl.type}
                  id={`label-select-${lbl.type}`}
                  onClick={() => setActiveLabel(lbl.type)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1.5px solid ${lbl.color}`,
                    background: isSelected ? lbl.color : '#ffffff',
                    color: isSelected ? '#ffffff' : lbl.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'var(--transition)',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#ffffff' : lbl.color }} />
                  {lbl.label}
                </button>
              );
            })}
          </div>

          {/* Canvas Viewport */}
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
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                cursor: activeTool === 'polygon' ? 'crosshair' : 'draw',
                maxWidth: '100%',
                display: 'block',
              }}
            />

            {/* Instruction tooltip overlay */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#94a3b8',
              fontSize: '0.7rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}>
              {activeTool === 'polygon' 
                ? 'Click points to form boundary. Click first point to seal region.' 
                : 'Drag cursor across region to draw bounding box.'}
            </div>
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
              <span>Mask Opacity:</span>
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
              <strong>{shapes.length}</strong> Contoured Regions
            </div>
          </div>
        </div>

        {/* Right Column: Gleason Diagnostic Assessment & Submit (3 cols) */}
        <div className="card" style={{ gridColumn: 'span 3', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Pathologist Assessment</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Assign WHO/ISUP grading and clinical notes for ground truth.
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
            >
              <Save size={16} /> Submit Ground Truth Dataset
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
