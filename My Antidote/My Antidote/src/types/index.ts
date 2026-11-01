export type UserRole = 'admin' | 'lab' | 'doctor' | 'end_user';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  organization?: string;
  badgeNumber?: string;
  createdAt: string;
  temporaryPassword?: string;
  predictionsRun?: number;
}

export type ImageStatus = 'pending' | 'annotated' | 'archived';

export interface HistologyImage {
  id: string;
  uploaderId: string;
  uploaderName?: string;
  fileUrl: string;
  filename: string;
  specimenId: string;
  tissueType: string;
  stainType: string;
  magnification: string;
  status: ImageStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TissueLabelType = 
  | 'gleason_5' 
  | 'gleason_4' 
  | 'gleason_3' 
  | 'benign_gland' 
  | 'stroma' 
  | 'inflammation' 
  | 'nuclei_cluster';

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationShape {
  id: string;
  type: 'polygon' | 'rect' | 'freehand';
  points: AnnotationPoint[];
  label: TissueLabelType;
  color: string;
  description?: string;
}

export type ContributorType = 'pathologist' | 'clinician';

export interface QuPathFeature {
  type: 'Feature';
  id?: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString';
    coordinates: any;
  };
  properties?: {
    objectType?: string;
    classification?: {
      name: string;
      color?: number[] | string;
    };
    measurements?: Record<string, number>;
    isLocked?: boolean;
    [key: string]: any;
  };
}

export interface QuPathGeoJSON {
  type: 'FeatureCollection' | 'Feature';
  features?: QuPathFeature[];
  geometry?: any;
  properties?: any;
}

export interface ImageAnnotation {
  id: string;
  imageId: string;
  doctorId: string;
  doctorName?: string;
  contributorType?: ContributorType;
  source?: 'qupath' | 'in_app';
  qupathFilename?: string;
  qupathExport?: QuPathGeoJSON;
  annotationData: AnnotationShape[];
  overlayUrl?: string;
  clinicalNotes: string;
  gleasonPrimary?: number;
  gleasonSecondary?: number;
  gradeGroup?: number;
  createdAt: string;
}

export interface PredictionResult {
  id: string;
  filename: string;
  fileUrl: string;
  malignancyRisk: number; // 0 to 100%
  gleasonScore: string; // e.g. "3 + 4 = 7"
  gradeGroup: number; // 1 to 5
  riskTier: 'Benign / Low Risk' | 'Intermediate Risk' | 'High Risk / Malignant';
  detectedNucleiCount: number;
  segmentedRegions: {
    label: string;
    percentage: number;
    color: string;
  }[];
  confidence: number;
  timestamp: string;
  heatmapOverlayUrl?: string;
}
