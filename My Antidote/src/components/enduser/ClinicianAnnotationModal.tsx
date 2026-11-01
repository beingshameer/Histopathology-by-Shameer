import React, { useState, useEffect, useRef } from 'react';
import type { HistologyImage, AnnotationShape, TissueLabelType, AnnotationPoint, UserProfile } from '../../types';
import { antidoteStore } from '../../lib/store';
import confetti from 'canvas-confetti';
import { 
  X, 
  CheckCircle2, 
  HeartHandshake, 
  Sparkles, 
  Undo2, 
  Trash2, 
  PenTool, 
  Square, 
  Save, 
  Info,
  Check
} from 'lucide-react';

interface ClinicianAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

const CLINICIAN_LABELS: { type: TissueLabelType; label: string; color: string; desc: string }[] = [
  { type: 'gleason_4', label: 'Gleason 4 (Fused / Cribriform)', color: '#ea580c', desc: 'Atypical cribriform acini' },
  { type: 'gleason_3', label: 'Gleason 3 (Discrete Glands)', color: '#f59e0b', desc: 'Well-formed infiltrative glands' },
  { type: 'gleason_5', label: 'Gleason 5 (Solid Sheets)', color: '#ef4444', desc: 'Solid cords or comedonecrosis' },
  { type: 'benign_gland', label: 'Benign Prostatic Gland', color: '#10b981', desc: 'Normal bilayered acinar architecture' },
];

export const ClinicianAnnotationModal: React.FC<ClinicianAnnotationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [candidateImage, setCandidateImage] = useState<HistologyImage | null>(null);
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  const [activeLabel, setActiveLabel] = useState<TissueLabelType>('gleason_4');
  const [activeTool, setActiveTool] = useState<'polygon' | 'rect'>('polygon');
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [primaryGleason, setPrimaryGleason] = useState<number>(4);
  const [secondaryGleason, setSecondaryGleason] = useState<number>(3);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Load a candidate image from store
  useEffect(() => {
    if (!isOpen) return;
    setSubmitted(false);
    setShapes([]);
    setCurrentPoints([]);
    setClinicalNotes('');

    const candidate = antidoteStore.getCandidateImageForClinicianContribution();
    if (candidate) {
      setCandidateImage(candidate);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageElementRef.current = img;
        redrawCanvas();
      };
      img.src = candidate.fileUrl;
    }
  }, [isOpen]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElementRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 680;
    canvas.height = 420;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageElementRef.current, 0, 0, canvas.width, canvas.height);

    // Completed shapes
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

      ctx.fillStyle = shape.color;
      ctx.globalAlpha = 0.45;
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label badge
      const first = shape.points[0];
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(first.x, first.y - 18, 80, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(shape.label.replace('_', ' ').toUpperCase(), first.x + 4, first.y - 6);
    });

    // In-progress points
    if (currentPoints.length > 0) {
      const activeColor = CLINICIAN_LABELS.find(l => l.type === activeLabel)?.color || '#ea580c';
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
  }, [shapes, currentPoints, candidateImage]);

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

    if (currentPoints.length >= 3) {
      const first = currentPoints[0];
      const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
      if (dist < 35) {
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
    if (!isDrawing || activeTool !== 'rect') return;
    const pt = getCanvasCoords(e);
    setCurrentPoints([currentPoints[0], pt]);
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
    const activeColor = CLINICIAN_LABELS.find(l => l.type === activeLabel)?.color || '#ea580c';
    const newShape: AnnotationShape = {
      id: `shp-cln-${Date.now().toString(36)}`,
      type: activeTool,
      points: [...currentPoints],
      label: activeLabel,
      color: activeColor,
      description: CLINICIAN_LABELS.find(l => l.type === activeLabel)?.desc,
    };

    setShapes(prev => [...prev, newShape]);
    setCurrentPoints([]);
  };

  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateImage) return;

    let finalShapes = [...shapes];
    if (finalShapes.length === 0) {
      const activeColor = CLINICIAN_LABELS.find(l => l.type === activeLabel)?.color || '#ea580c';
      finalShapes = [{
        id: `shp-cln-default-${Date.now().toString(36)}`,
        type: 'polygon',
        points: [
          { x: 120, y: 140 },
          { x: 260, y: 130 },
          { x: 310, y: 240 },
          { x: 230, y: 310 },
          { x: 110, y: 230 },
          { x: 120, y: 140 },
        ],
        label: activeLabel,
        color: activeColor,
        description: 'Clinician Contoured Gland Region',
      }];
      setShapes(finalShapes);
    }

    const calculatedGradeGroup = Math.min(5, Math.max(1, 
      (primaryGleason === 3 && secondaryGleason === 3) ? 1 :
      (primaryGleason === 3 && secondaryGleason === 4) ? 2 :
      (primaryGleason === 4 && secondaryGleason === 3) ? 3 :
      (primaryGleason === 4 && secondaryGleason === 4) ? 4 : 5
    ));

    const res = antidoteStore.clinicianSubmitAnnotation({
      imageId: candidateImage.id,
      annotationData: finalShapes,
      clinicalNotes: clinicalNotes || 'Clinician crowd-sourced second opinion contribution',
      gleasonPrimary: primaryGleason,
      gleasonSecondary: secondaryGleason,
      gradeGroup: calculatedGradeGroup,
    });

    if (res.success) {
      setSubmitted(true);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#7c3aed', '#00685f', '#10b981', '#f59e0b']
      });
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '960px',
        width: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #faf5ff 0%, #f0fdfa 100%)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <HeartHandshake size={22} color="#7c3aed" />
              <h2 style={{ fontSize: '1.25rem', color: '#1e1b4b' }}>
                Clinician Research Contribution
              </h2>
              <span className="badge badge-contributor-clinician" style={{ fontSize: '0.7rem' }}>
                contributor_type: clinician
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Annotate one candidate slide to contribute crowd-sourced clinical ground truth to our training dataset.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {submitted ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 2rem',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                Contribution Committed to Dataset!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                Thank you, <strong>{currentUser?.fullName}</strong>. Your annotation has been successfully archived in the research ground truth dataset tagged with <code className="mono">contributor_type = &quot;clinician&quot;</code>.
              </p>
              <button
                className="btn btn-primary"
                onClick={onClose}
              >
                Return to AI Prediction Portal
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.25rem' }}>
              {/* Left Column: Canvas & Annotation tools */}
              <div>
                {/* Tools bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeTool === 'polygon' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => { setActiveTool('polygon'); setCurrentPoints([]); }}
                    >
                      <PenTool size={13} /> Polygon
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeTool === 'rect' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => { setActiveTool('rect'); setCurrentPoints([]); }}
                    >
                      <Square size={13} /> Bounding Box
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (currentPoints.length > 0) setCurrentPoints(prev => prev.slice(0, -1));
                        else setShapes(prev => prev.slice(0, -1));
                      }}
                    >
                      <Undo2 size={13} /> Undo
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setShapes([]); setCurrentPoints([]); }}
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>
                </div>

                {/* Labels */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {CLINICIAN_LABELS.map(lbl => (
                    <button
                      key={lbl.type}
                      type="button"
                      onClick={() => setActiveLabel(lbl.type)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        border: `1.5px solid ${lbl.color}`,
                        background: activeLabel === lbl.type ? lbl.color : '#ffffff',
                        color: activeLabel === lbl.type ? '#ffffff' : lbl.color,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: activeLabel === lbl.type ? '#ffffff' : lbl.color }} />
                      {lbl.label}
                    </button>
                  ))}
                </div>

                {/* Canvas Container */}
                <div style={{
                  position: 'relative',
                  background: '#090d16',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                }}>
                  <canvas
                    ref={canvasRef}
                    id="clinician-annotation-canvas"
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
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    {activeTool === 'polygon' ? 'Click points to form boundary, click first vertex to close.' : 'Drag to outline gland box.'}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Specimen: <strong className="mono">{candidateImage?.specimenId || 'Candidate Slide'}</strong></span>
                  <span><strong>{shapes.length}</strong> Contoured Regions</span>
                </div>
              </div>

              {/* Right Column: Diagnosis & Submission */}
              <form onSubmit={handleSubmitContribution} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#0f172a' }}>
                  Clinician Assessment
                </h4>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Dominant Pattern (Primary)</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                    value={primaryGleason}
                    onChange={e => setPrimaryGleason(parseInt(e.target.value))}
                  >
                    <option value={3}>Gleason 3 (Discrete uniform acini)</option>
                    <option value={4}>Gleason 4 (Fused / cribriform glands)</option>
                    <option value={5}>Gleason 5 (Solid sheets / necrosis)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Secondary Pattern</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                    value={secondaryGleason}
                    onChange={e => setSecondaryGleason(parseInt(e.target.value))}
                  >
                    <option value={3}>Gleason 3 (Discrete uniform acini)</option>
                    <option value={4}>Gleason 4 (Fused / cribriform glands)</option>
                    <option value={5}>Gleason 5 (Solid sheets / necrosis)</option>
                  </select>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>COMPOSITE GLEASON</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#7c3aed' }}>
                    {primaryGleason} + {secondaryGleason} = {primaryGleason + secondaryGleason}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Clinical Observations</label>
                  <textarea
                    id="clinician-notes-input"
                    className="form-textarea"
                    rows={3}
                    style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                    placeholder="Suspected gland infiltration, cribriform acini..."
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                  />
                </div>

                <div style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '6px',
                  padding: '0.6rem',
                  fontSize: '0.7rem',
                  color: '#6b21a8',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.4rem',
                }}>
                  <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    Saved as crowd-sourced clinician data (<span className="mono">contributor_type=&quot;clinician&quot;</span>) to benchmark against verified pathologist ground truth.
                  </div>
                </div>

                <button
                  id="btn-submit-clinician-annotation"
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem', background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  <Save size={15} /> Submit Research Contribution
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
