-- Migration: Add IFC Storage Key Columns to Projects Table
-- Purpose: Enable unique IFC file storage in Supabase Storage to prevent filename collisions
-- Run this in Supabase SQL Editor

-- 1. Add ifc_storage_key column (unique path in Supabase Storage)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS ifc_storage_key TEXT;

-- 2. Add original_filename column (preserve user's original filename for display)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- 3. Add index on ifc_storage_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_ifc_storage_key 
ON public.projects(ifc_storage_key);

-- 4. Add comment to document the columns
COMMENT ON COLUMN public.projects.ifc_storage_key IS 'Unique storage key in Supabase Storage bucket (format: user_id/project_id/timestamp_uuid_filename.ifc)';
COMMENT ON COLUMN public.projects.original_filename IS 'Original filename uploaded by user (before sanitization)';

-- Migration notes:
-- - Existing projects will have NULL values for these columns (backward compatible)
-- - New uploads will populate these fields automatically
-- - The backend will fall back to filename-based lookup if storage_key is NULL
-- - No data migration needed for existing projects (they continue to work with filename-based lookup)
