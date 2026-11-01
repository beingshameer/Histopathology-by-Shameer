import type { HistologyImage, UserProfile, ImageAnnotation } from '../types';

export function createHistologySlideSvg(specimenId: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
    <rect width="800" height="600" fill="#f8fafc"/>
    <rect x="20" y="20" width="760" height="560" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="400" y="280" font-family="Inter, sans-serif" font-size="22" font-weight="600" fill="#00685f" text-anchor="middle">SPECIMEN SLIDE: ${specimenId}</text>
    <text x="400" y="320" font-family="Inter, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Microscope Histopathology Image Plate</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Standard demo profiles across all four roles
export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'admin-01',
    email: 'admin@myantidote.local',
    role: 'admin',
    fullName: 'System Administrator (You)',
    organization: 'My Antidote Platform',
    badgeNumber: 'ADMIN-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lab-01',
    email: 'lab.north@myantidote.health',
    role: 'lab',
    fullName: 'North Histology Lab Operations',
    organization: 'North Regional Pathology Core',
    badgeNumber: 'LAB-402',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'doc-01',
    email: 'dr.marcus@myantidote.health',
    role: 'doctor',
    fullName: 'Dr. Marcus Vance, MD (Pathologist)',
    organization: 'University Hospital Pathology Dept',
    badgeNumber: 'DOC-881',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-01',
    email: 'clinician.john@myantidote.health',
    role: 'end_user',
    fullName: 'Dr. Johnathan Miller, MD (Clinician)',
    organization: 'Urology Clinical Practice',
    createdAt: new Date().toISOString(),
    predictionsRun: 0,
  },
];

export const INITIAL_IMAGES: HistologyImage[] = [
  {
    id: 'img-bx-9042',
    uploaderId: 'lab-01',
    uploaderName: 'North Histology Lab Operations',
    fileUrl: createHistologySlideSvg('BX-2026-9042'),
    filename: 'prostate_core_bx_9042_40x.png',
    specimenId: 'BX-2026-9042',
    tissueType: 'Prostate Core Biopsy (Peripheral Zone)',
    stainType: 'H&E (Hematoxylin & Eosin)',
    magnification: '40x Optical',
    status: 'pending',
    notes: 'Atypical micro-acinar gland proliferation near peripheral capsule.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'img-bx-8117',
    uploaderId: 'lab-01',
    uploaderName: 'North Histology Lab Operations',
    fileUrl: createHistologySlideSvg('BX-2026-8117'),
    filename: 'prostate_needle_apex_8117.png',
    specimenId: 'BX-2026-8117',
    tissueType: 'Prostate Needle Biopsy (Apex Left)',
    stainType: 'H&E (Hematoxylin & Eosin)',
    magnification: '40x Optical',
    status: 'pending',
    notes: 'Suspected Gleason 3 and fused Gleason 4 glands.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const INITIAL_ANNOTATIONS: ImageAnnotation[] = [];
