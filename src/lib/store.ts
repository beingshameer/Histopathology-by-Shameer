import type { UserProfile, HistologyImage, ImageAnnotation, UserRole, ContributorType } from '../types';
import { INITIAL_PROFILES, INITIAL_IMAGES, INITIAL_ANNOTATIONS, createHistologySlideSvg } from './sampleData';

const STORAGE_KEYS = {
  CURRENT_USER: 'myantidote_user_clean_v2',
  PROFILES: 'myantidote_profiles_clean_v2',
  IMAGES: 'myantidote_images_clean_v2',
  ANNOTATIONS: 'myantidote_annotations_clean_v2',
  USAGE_STATS: 'myantidote_usage_stats_v2',
};

class AntidoteStore {
  private profiles: UserProfile[];
  private images: HistologyImage[];
  private annotations: ImageAnnotation[];
  private usageStats: Record<string, number>;
  private currentUser: UserProfile | null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Purge old demo storage if present
    ['myantidote_current_user', 'myantidote_profiles', 'myantidote_images', 'myantidote_annotations'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    this.profiles = this.load(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    this.images = this.load(STORAGE_KEYS.IMAGES, INITIAL_IMAGES);
    this.annotations = this.load(STORAGE_KEYS.ANNOTATIONS, INITIAL_ANNOTATIONS);
    this.usageStats = this.load(STORAGE_KEYS.USAGE_STATS, {});
    
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = this.profiles[0];
      }
    } else {
      this.currentUser = this.profiles[0];
      this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Auth & User Operations ---
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile | null): void {
    this.currentUser = user;
    this.save(STORAGE_KEYS.CURRENT_USER, user);
    this.notify();
  }

  public switchRole(role: UserRole): UserProfile {
    const matched = this.profiles.find(p => p.role === role);
    if (matched) {
      this.setCurrentUser(matched);
      return matched;
    }
    // Fallback: create a temporary profile with professional credentials
    const roleMeta: Record<UserRole, { name: string; email: string; org: string }> = {
      admin: { name: 'System Administrator (You)', email: 'admin@myantidote.local', org: 'My Antidote Platform' },
      lab: { name: 'North Histology Lab Operations', email: 'lab.north@myantidote.health', org: 'North Regional Pathology Core' },
      doctor: { name: 'Dr. Marcus Vance, MD (Pathologist)', email: 'dr.marcus@myantidote.health', org: 'University Hospital Pathology Dept' },
      end_user: { name: 'Dr. Johnathan Miller, MD (Clinician)', email: 'clinician.john@myantidote.health', org: 'Urology Clinical Practice' },
    };
    const meta = roleMeta[role];
    const fallbackUser: UserProfile = {
      id: `usr-${role}-${Date.now().toString(36)}`,
      email: meta.email,
      role,
      fullName: meta.name,
      organization: meta.org,
      predictionsRun: 0,
      createdAt: new Date().toISOString(),
    };
    this.profiles.push(fallbackUser);
    this.save(STORAGE_KEYS.PROFILES, this.profiles);
    this.setCurrentUser(fallbackUser);
    return fallbackUser;
  }

  // --- Clinician Usage Stats & Prediction Counter ---
  public getPredictionCount(userId?: string): number {
    const id = userId || this.currentUser?.id;
    if (!id) return 0;
    return this.usageStats[id] || 0;
  }

  public incrementPredictionCount(userId?: string): number {
    const id = userId || this.currentUser?.id;
    if (!id) return 1;
    const current = this.usageStats[id] || 0;
    const newCount = current + 1;
    this.usageStats[id] = newCount;
    this.save(STORAGE_KEYS.USAGE_STATS, this.usageStats);

    // Sync to user profile object
    const profile = this.profiles.find(p => p.id === id);
    if (profile) {
      profile.predictionsRun = newCount;
      this.save(STORAGE_KEYS.PROFILES, this.profiles);
    }
    if (this.currentUser?.id === id) {
      this.currentUser.predictionsRun = newCount;
      this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    }

    this.notify();
    return newCount;
  }

  public registerEndUser(email: string, fullName: string): { success: boolean; user?: UserProfile; error?: string } {
    const existing = this.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newUser: UserProfile = {
      id: `usr-enduser-${Date.now().toString(36)}`,
      email,
      fullName,
      role: 'end_user', // Enforce only end_user (Clinician) role
      organization: 'Clinical Practitioner',
      predictionsRun: 0,
      createdAt: new Date().toISOString(),
    };

    this.profiles.push(newUser);
    this.save(STORAGE_KEYS.PROFILES, this.profiles);
    this.setCurrentUser(newUser);
    this.notify();
    return { success: true, user: newUser };
  }

  public adminCreateStaffUser(params: {
    email: string;
    fullName: string;
    role: 'lab' | 'doctor';
    organization: string;
    badgeNumber?: string;
  }): { success: boolean; user?: UserProfile; tempPassword?: string; error?: string } {
    // Enforce Admin only
    if (this.currentUser?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an administrator can issue staff credentials.' };
    }

    const existing = this.profiles.find(p => p.email.toLowerCase() === params.email.toLowerCase());
    if (existing) {
      return { success: false, error: 'A staff profile with this email already exists.' };
    }

    const generatedPassword = `Antidote-${Math.random().toString(36).substring(2, 7).toUpperCase()}!${Math.floor(100 + Math.random() * 900)}`;
    const prefix = params.role === 'lab' ? 'LAB' : 'DOC';
    const badge = params.badgeNumber || `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: UserProfile = {
      id: `usr-${params.role}-${Date.now().toString(36)}`,
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      organization: params.organization,
      badgeNumber: badge,
      temporaryPassword: generatedPassword,
      createdAt: new Date().toISOString(),
    };

    this.profiles.unshift(newUser);
    this.save(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();

    return {
      success: true,
      user: newUser,
      tempPassword: generatedPassword,
    };
  }

  public getAllProfiles(): UserProfile[] {
    // Admin RLS check
    if (this.currentUser?.role !== 'admin') {
      return this.currentUser ? [this.currentUser] : [];
    }
    return [...this.profiles];
  }

  // --- Histopathology Images (RLS Protected) ---
  public getImagesForCurrentRole(): HistologyImage[] {
    if (!this.currentUser) return [];

    switch (this.currentUser.role) {
      case 'admin':
        // Full access
        return [...this.images];

      case 'lab':
        // Lab sees ONLY their own uploaded images
        return this.images.filter(img => img.uploaderId === this.currentUser?.id);

      case 'doctor':
        // Doctor sees the pending queue and annotated images
        return this.images.filter(img => img.status === 'pending' || img.status === 'annotated');

      case 'end_user':
        // End User has ZERO visibility into lab/doctor data-collection pipeline
        return [];

      default:
        return [];
    }
  }

  public labUploadImage(params: {
    specimenId: string;
    tissueType: string;
    stainType: string;
    magnification: string;
    notes?: string;
    imageFile?: File | null;
  }): { success: boolean; image?: HistologyImage; error?: string } {
    // RLS check
    if (this.currentUser?.role !== 'lab' && this.currentUser?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only authorized Lab Technicians can upload plate images.' };
    }

    // Generate or process file URL
    const fileUrl = params.imageFile
      ? URL.createObjectURL(params.imageFile)
      : createHistologySlideSvg(params.specimenId);

    const newImage: HistologyImage = {
      id: `img-slide-${Date.now().toString(36)}`,
      uploaderId: this.currentUser.id,
      uploaderName: this.currentUser.fullName,
      fileUrl,
      filename: params.imageFile ? params.imageFile.name : `${params.specimenId}_core_40x.svs.png`,
      specimenId: params.specimenId,
      tissueType: params.tissueType || 'Prostate Needle Core Biopsy',
      stainType: params.stainType || 'H&E (Hematoxylin & Eosin)',
      magnification: params.magnification || '40x Optical',
      status: 'pending',
      notes: params.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.images.unshift(newImage);
    this.save(STORAGE_KEYS.IMAGES, this.images);
    this.notify();

    return { success: true, image: newImage };
  }

  // --- Pathologist Annotation Workstation (QuPath Integration) ---
  public doctorSubmitAnnotation(params: {
    imageId: string;
    annotationData: any[];
    clinicalNotes: string;
    gleasonPrimary?: number;
    gleasonSecondary?: number;
    gradeGroup?: number;
    contributorType?: ContributorType;
    source?: 'qupath' | 'in_app';
    qupathFilename?: string;
    qupathExport?: any;
  }): { success: boolean; annotation?: ImageAnnotation; error?: string } {
    // RLS check
    if (this.currentUser?.role !== 'doctor' && this.currentUser?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only consulting Pathologists can submit verified annotations.' };
    }

    const image = this.images.find(img => img.id === params.imageId);
    if (!image) {
      return { success: false, error: 'Specified histopathology image does not exist.' };
    }

    const newAnnotation: ImageAnnotation = {
      id: `anno-${Date.now().toString(36)}`,
      imageId: params.imageId,
      doctorId: this.currentUser.id,
      doctorName: this.currentUser.fullName,
      contributorType: params.contributorType || 'pathologist',
      source: params.source || 'qupath',
      qupathFilename: params.qupathFilename,
      qupathExport: params.qupathExport,
      annotationData: params.annotationData,
      clinicalNotes: params.clinicalNotes,
      gleasonPrimary: params.gleasonPrimary,
      gleasonSecondary: params.gleasonSecondary,
      gradeGroup: params.gradeGroup,
      createdAt: new Date().toISOString(),
    };

    // Remove existing annotation for this image if re-annotating
    this.annotations = this.annotations.filter(a => a.imageId !== params.imageId);
    this.annotations.unshift(newAnnotation);
    this.save(STORAGE_KEYS.ANNOTATIONS, this.annotations);

    // Update image status to 'annotated'
    image.status = 'annotated';
    image.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.IMAGES, this.images);

    this.notify();
    return { success: true, annotation: newAnnotation };
  }

  // Candidate specimen for research contribution loop
  public getCandidateImageForClinicianContribution(): HistologyImage {
    const pending = this.images.find(img => img.status === 'pending');
    if (pending) return pending;
    if (this.images.length > 0) return this.images[0];
    return {
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
      notes: 'Research candidate specimen',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // --- Clinician Contribution Loop (Lightweight Ground Truth Contribution) ---
  public clinicianSubmitAnnotation(params: {
    imageId: string;
    annotationData: any[];
    clinicalNotes: string;
    gleasonPrimary?: number;
    gleasonSecondary?: number;
    gradeGroup?: number;
  }): { success: boolean; annotation?: ImageAnnotation; error?: string } {
    if (!this.currentUser) {
      return { success: false, error: 'Unauthorized: Authentication required to submit annotations.' };
    }

    let image = this.images.find(img => img.id === params.imageId);
    if (!image) {
      image = {
        id: params.imageId,
        uploaderId: 'lab-01',
        uploaderName: 'North Histology Lab Operations',
        fileUrl: createHistologySlideSvg('BX-RESEARCH-CONTRIB'),
        filename: 'bx_research_contrib.png',
        specimenId: 'BX-RESEARCH-CONTRIB',
        tissueType: 'Prostate Core Biopsy',
        stainType: 'H&E',
        magnification: '40x',
        status: 'annotated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.images.unshift(image);
    }

    const newAnnotation: ImageAnnotation = {
      id: `anno-clinician-${Date.now().toString(36)}`,
      imageId: params.imageId,
      doctorId: this.currentUser.id,
      doctorName: this.currentUser.fullName,
      contributorType: 'clinician', // Tagged as clinician for training dataset distinction
      source: 'in_app',
      annotationData: params.annotationData,
      clinicalNotes: params.clinicalNotes,
      gleasonPrimary: params.gleasonPrimary,
      gleasonSecondary: params.gleasonSecondary,
      gradeGroup: params.gradeGroup,
      createdAt: new Date().toISOString(),
    };

    this.annotations = this.annotations.filter(a => a.imageId !== params.imageId);
    this.annotations.unshift(newAnnotation);
    this.save(STORAGE_KEYS.ANNOTATIONS, this.annotations);

    image.status = 'annotated';
    image.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.IMAGES, this.images);

    this.notify();
    return { success: true, annotation: newAnnotation };
  }

  public getAnnotationForImage(imageId: string): ImageAnnotation | null {
    // Only Doctor or Admin can view annotations
    if (this.currentUser?.role !== 'doctor' && this.currentUser?.role !== 'admin') {
      return null;
    }
    return this.annotations.find(a => a.imageId === imageId) || null;
  }

  public getAllAnnotations(): ImageAnnotation[] {
    if (this.currentUser?.role !== 'admin' && this.currentUser?.role !== 'doctor') {
      return [];
    }
    return [...this.annotations];
  }

  // --- Admin Dataset Export ---
  public exportDatasetJson(): string {
    if (this.currentUser?.role !== 'admin') {
      throw new Error('Unauthorized: Only an Administrator can export the training dataset.');
    }

    const exportPackage = {
      project: 'My Antidote - Prostate Cancer Detection FYP',
      version: '2.0-clinical-qupath',
      exportedAt: new Date().toISOString(),
      exportedBy: this.currentUser.fullName,
      totalImages: this.images.length,
      annotatedImagesCount: this.images.filter(img => img.status === 'annotated').length,
      pendingImagesCount: this.images.filter(img => img.status === 'pending').length,
      pathologistVerifiedCount: this.annotations.filter(a => a.contributorType !== 'clinician').length,
      clinicianContributedCount: this.annotations.filter(a => a.contributorType === 'clinician').length,
      dataset: this.images.map(img => {
        const annotation = this.annotations.find(a => a.imageId === img.id);
        return {
          id: img.id,
          specimenId: img.specimenId,
          tissueType: img.tissueType,
          stainType: img.stainType,
          magnification: img.magnification,
          status: img.status,
          uploadedBy: img.uploaderName,
          uploadedAt: img.createdAt,
          annotation: annotation ? {
            annotatedBy: annotation.doctorName,
            contributorType: annotation.contributorType || 'pathologist',
            source: annotation.source || 'qupath',
            qupathFilename: annotation.qupathFilename || null,
            annotatedAt: annotation.createdAt,
            clinicalNotes: annotation.clinicalNotes,
            gleasonScore: (annotation.gleasonPrimary && annotation.gleasonSecondary)
              ? `${annotation.gleasonPrimary} + ${annotation.gleasonSecondary}`
              : null,
            gradeGroup: annotation.gradeGroup,
            shapes: annotation.annotationData,
            qupathExport: annotation.qupathExport || null,
          } : null,
        };
      }),
    };

    return JSON.stringify(exportPackage, null, 2);
  }

  // Reset demo store
  public resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.IMAGES);
    localStorage.removeItem(STORAGE_KEYS.ANNOTATIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.profiles = [...INITIAL_PROFILES];
    this.images = [...INITIAL_IMAGES];
    this.annotations = [...INITIAL_ANNOTATIONS];
    this.currentUser = this.profiles[0];
    this.save(STORAGE_KEYS.PROFILES, this.profiles);
    this.save(STORAGE_KEYS.IMAGES, this.images);
    this.save(STORAGE_KEYS.ANNOTATIONS, this.annotations);
    this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.notify();
  }
}

export const antidoteStore = new AntidoteStore();
