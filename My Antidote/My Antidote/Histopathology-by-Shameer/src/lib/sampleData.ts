import type { HistologyImage, UserProfile, ImageAnnotation } from '../types';

// Helper to generate a realistic H&E stained histopathology slide image SVG Data URL
export function createHistologySlideSvg(specimenId: string, primaryColor: string = '#c0392b'): string {
  const width = 800;
  const height = 600;
  
  // Create realistic cells, nuclei clusters, and gland structures
  let svgCells = '';
  // Background stroma texture
  for (let i = 0; i < 45; i++) {
    const cx = (i * 37) % 780 + 10;
    const cy = (i * 29) % 580 + 10;
    const rx = 25 + (i % 5) * 6;
    const ry = 18 + (i % 4) * 4;
    svgCells += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fce4ec" fill-opacity="0.45" stroke="#f8bbd0" stroke-width="1.5"/>`;
  }
  
  // Glandular lumens (prostate acini)
  const glands = [
    { cx: 200, cy: 180, r: 55, color: '#e8eaf6' },
    { cx: 380, cy: 150, r: 70, color: '#ede7f6' },
    { cx: 620, cy: 220, r: 60, color: '#f3e5f5' },
    { cx: 240, cy: 420, r: 65, color: '#ede7f6' },
    { cx: 480, cy: 380, r: 85, color: '#e8eaf6' },
    { cx: 660, cy: 460, r: 50, color: '#fce4ec' },
  ];
  
  glands.forEach(g => {
    svgCells += `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="${g.color}" stroke="#8e24aa" stroke-dasharray="4,2" stroke-width="1.5" fill-opacity="0.8"/>`;
    // Epithelial lining cells around gland
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * 2 * Math.PI;
      const ecx = g.cx + Math.cos(angle) * (g.r + 8);
      const ecy = g.cy + Math.sin(angle) * (g.r + 8);
      svgCells += `<circle cx="${ecx}" cy="${ecy}" r="4" fill="#4a148c" fill-opacity="0.85"/>`;
    }
  });

  // Hyperchromatic nuclei clusters (tumor microenvironment / stroma)
  for (let j = 0; j < 80; j++) {
    const x = (j * 43) % 760 + 20;
    const y = (j * 31) % 560 + 20;
    const r = 2.5 + (j % 3);
    const fill = j % 2 === 0 ? '#311b92' : '#4a148c';
    svgCells += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" fill-opacity="0.75"/>`;
  }

  // Visual label watermark
  const watermark = `
    <rect x="16" y="16" width="220" height="60" rx="6" fill="#0f172a" fill-opacity="0.8"/>
    <text x="30" y="40" font-family="Inter, sans-serif" font-size="14" font-weight="bold" fill="#ffffff">MY ANTIDOTE BIOPSY</text>
    <text x="30" y="60" font-family="Inter, sans-serif" font-size="11" fill="#38bdf8">ID: ${specimenId} | 40x H&amp;E</text>
  `;

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <rect width="${width}" height="${height}" fill="#fdf2f8"/>
    ${svgCells}
    ${watermark}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@myantidote.health',
    role: 'admin',
    fullName: 'Dr. Sarah Connor (Chief of Pathology)',
    organization: 'Apex Clinical Oncology Central',
    badgeNumber: 'ADM-8901',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'usr-lab-01',
    email: 'lab.north@myantidote.health',
    role: 'lab',
    fullName: 'North Histology Lab Operations',
    organization: 'North Regional Histopathology Lab',
    badgeNumber: 'LAB-2041',
    createdAt: '2026-08-10T10:15:00Z',
  },
  {
    id: 'usr-lab-02',
    email: 'lab.metro@myantidote.health',
    role: 'lab',
    fullName: 'Metro Pathology Center',
    organization: 'Metropolitan Biospecimen Core',
    badgeNumber: 'LAB-3099',
    createdAt: '2026-08-15T11:30:00Z',
  },
  {
    id: 'usr-doctor-01',
    email: 'dr.marcus@myantidote.health',
    role: 'doctor',
    fullName: 'Dr. Marcus Vance, MD (Urologic Pathologist)',
    organization: 'Memorial Cancer Institute',
    badgeNumber: 'DOC-5512',
    createdAt: '2026-08-12T09:45:00Z',
  },
  {
    id: 'usr-doctor-02',
    email: 'dr.elena@myantidote.health',
    role: 'doctor',
    fullName: 'Dr. Elena Rostova, PhD',
    organization: 'University Oncology Consortium',
    badgeNumber: 'DOC-7721',
    createdAt: '2026-08-14T14:20:00Z',
  },
  {
    id: 'usr-enduser-01',
    email: 'patient.john@example.com',
    role: 'end_user',
    fullName: 'Johnathan Miller',
    organization: 'Self-Registered Patient / Second Opinion',
    createdAt: '2026-09-01T16:00:00Z',
  },
];

export const INITIAL_IMAGES: HistologyImage[] = [
  {
    id: 'img-slide-001',
    uploaderId: 'usr-lab-01',
    uploaderName: 'North Histology Lab Operations',
    fileUrl: createHistologySlideSvg('BX-2026-8941'),
    filename: 'BX-2026-8941_zoneP_core1.svs.png',
    specimenId: 'BX-2026-8941',
    tissueType: 'Prostate Core Biopsy (Peripheral Zone)',
    stainType: 'H&E (Hematoxylin & Eosin)',
    magnification: '40x Optical',
    status: 'pending',
    notes: 'Suspected cribriform pattern in lower left quadrant.',
    createdAt: '2026-09-06T11:20:00Z',
    updatedAt: '2026-09-06T11:20:00Z',
  },
  {
    id: 'img-slide-002',
    uploaderId: 'usr-lab-01',
    uploaderName: 'North Histology Lab Operations',
    fileUrl: createHistologySlideSvg('BX-2026-8942'),
    filename: 'BX-2026-8942_zoneT_core3.svs.png',
    specimenId: 'BX-2026-8942',
    tissueType: 'Transurethral Resection (Transition Zone)',
    stainType: 'H&E (Hematoxylin & Eosin)',
    magnification: '40x Optical',
    status: 'annotated',
    notes: 'Well-differentiated acinar structures; marked stroma.',
    createdAt: '2026-09-05T09:10:00Z',
    updatedAt: '2026-09-07T14:30:00Z',
  },
  {
    id: 'img-slide-003',
    uploaderId: 'usr-lab-02',
    uploaderName: 'Metro Pathology Center',
    fileUrl: createHistologySlideSvg('BX-2026-9014'),
    filename: 'BX-2026-9014_apex_left.png',
    specimenId: 'BX-2026-9014',
    tissueType: 'Prostate Needle Core (Apex Left)',
    stainType: 'H&E (Hematoxylin & Eosin)',
    magnification: '20x Optical',
    status: 'pending',
    notes: 'Crowded micro-acinar pattern, prominent nucleoli.',
    createdAt: '2026-09-07T16:45:00Z',
    updatedAt: '2026-09-07T16:45:00Z',
  }
];

export const INITIAL_ANNOTATIONS: ImageAnnotation[] = [
  {
    id: 'anno-001',
    imageId: 'img-slide-002',
    doctorId: 'usr-doctor-01',
    doctorName: 'Dr. Marcus Vance, MD',
    clinicalNotes: 'Primary Gleason Pattern 3 noted with small uniform glands. Focal area of benign prostatic hyperplasia (BPH) stroma in the periphery.',
    gleasonPrimary: 3,
    gleasonSecondary: 3,
    gradeGroup: 1,
    createdAt: '2026-09-07T14:30:00Z',
    annotationData: [
      {
        id: 'shp-1',
        type: 'polygon',
        points: [{ x: 180, y: 140 }, { x: 420, y: 130 }, { x: 440, y: 220 }, { x: 200, y: 240 }],
        label: 'gleason_3',
        color: '#f59e0b',
        description: 'Discrete well-formed glands (Gleason 3)'
      },
      {
        id: 'shp-2',
        type: 'polygon',
        points: [{ x: 450, y: 320 }, { x: 620, y: 330 }, { x: 640, y: 480 }, { x: 460, y: 470 }],
        label: 'benign_gland',
        color: '#10b981',
        description: 'Benign acinar architecture'
      }
    ]
  }
];
