-- ==============================================================================
-- MY ANTIDOTE - Histopathology Data Collection & Prostate Cancer AI Pipeline
-- Supabase Schema, RLS Policies, and Storage Bucket Configuration
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'lab', 'doctor', 'end_user');
CREATE TYPE image_status AS ENUM ('pending', 'annotated', 'archived');

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'end_user',
    full_name TEXT,
    organization_code TEXT,
    badge_number TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index on role for fast access checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function to check role in RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Histopathology Images Table
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    specimen_id TEXT NOT NULL,
    tissue_type TEXT DEFAULT 'Prostate Core Biopsy',
    stain_type TEXT DEFAULT 'H&E (Hematoxylin & Eosin)',
    magnification TEXT DEFAULT '40x',
    status image_status NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_uploader ON public.images(uploader_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON public.images(status);

-- 4. Annotations Table (Completed by Pathologists via QuPath or Clinicians via Contribution Loop)
CREATE TABLE IF NOT EXISTS public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    contributor_type TEXT NOT NULL DEFAULT 'pathologist' CHECK (contributor_type IN ('pathologist', 'clinician')),
    source TEXT NOT NULL DEFAULT 'qupath' CHECK (source IN ('qupath', 'in_app')),
    qupath_filename TEXT,
    qupath_export JSONB, -- Raw QuPath exported GeoJSON FeatureCollection
    annotation_data JSONB NOT NULL, -- Array of shapes, coordinates, classifications (Gleason 3/4/5, Benign, Stroma)
    overlay_file_url TEXT,
    clinical_notes TEXT,
    gleason_primary INTEGER CHECK (gleason_primary BETWEEN 1 AND 5),
    gleason_secondary INTEGER CHECK (gleason_secondary BETWEEN 1 AND 5),
    grade_group INTEGER CHECK (grade_group BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_annotations_image ON public.annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_doctor ON public.annotations(doctor_id);

-- Trigger to automatically update image status to 'annotated' upon insertion
CREATE OR REPLACE FUNCTION public.handle_new_annotation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.images
    SET status = 'annotated', updated_at = NOW()
    WHERE id = NEW.image_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_annotation_created
    AFTER INSERT ON public.annotations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_annotation();

-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Admin has full access to all profiles
CREATE POLICY "Admins can view and manage all profiles"
    ON public.profiles FOR ALL
    USING (public.get_current_user_role() = 'admin');

-- Users can view and update their own profile
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Images Policies
-- Admin: Full access
CREATE POLICY "Admins have full access to images"
    ON public.images FOR ALL
    USING (public.get_current_user_role() = 'admin');

-- Lab: Can only view and insert their own uploaded images
CREATE POLICY "Labs can view their own images"
    ON public.images FOR SELECT
    USING (
        public.get_current_user_role() = 'lab' AND uploader_id = auth.uid()
    );

CREATE POLICY "Labs can insert their own images"
    ON public.images FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'lab' AND uploader_id = auth.uid()
    );

-- Doctor: Can view pending queue and annotated images
CREATE POLICY "Doctors can view images for annotation"
    ON public.images FOR SELECT
    USING (
        public.get_current_user_role() = 'doctor' AND status IN ('pending', 'annotated')
    );

-- End Users: Have ZERO access to collection images (No policy grants access)

-- Annotations Policies
-- Admin: Full access
CREATE POLICY "Admins have full access to annotations"
    ON public.annotations FOR ALL
    USING (public.get_current_user_role() = 'admin');

-- Doctor: Can insert annotations and view annotations
CREATE POLICY "Doctors can create annotations"
    ON public.annotations FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'doctor' AND doctor_id = auth.uid()
    );

CREATE POLICY "Doctors can view annotations"
    ON public.annotations FOR SELECT
    USING (
        public.get_current_user_role() = 'doctor'
    );

-- Clinicians: Can insert research contribution annotations tagged as clinician
CREATE POLICY "Clinicians can submit research contributions"
    ON public.annotations FOR INSERT
    WITH CHECK (
        public.get_current_user_role() = 'end_user' AND doctor_id = auth.uid() AND contributor_type = 'clinician'
    );

-- ==============================================================================
-- 6. Storage Bucket Configuration & Policies
-- ==============================================================================

-- Create private bucket 'plate-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('plate-images', 'plate-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'plate-images'
CREATE POLICY "Admin full storage access"
    ON storage.objects FOR ALL
    USING (bucket_id = 'plate-images' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Lab can upload plate images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'plate-images' AND public.get_current_user_role() = 'lab');

CREATE POLICY "Lab can view their uploaded files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'plate-images' AND public.get_current_user_role() = 'lab');

CREATE POLICY "Doctors can read plate images for annotation"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'plate-images' AND public.get_current_user_role() = 'doctor');

-- End Users have NO access to plate-images bucket
