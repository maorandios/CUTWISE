-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This migration adds support for unique IFC file storage keys
-- to prevent filename collisions and ensure reliable file access.
-- ============================================================================

-- Add ifc_storage_key column (unique path in Supabase Storage)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS ifc_storage_key TEXT;

-- Add original_filename column (preserve user's original filename)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_ifc_storage_key 
ON public.projects(ifc_storage_key);

-- Add documentation
COMMENT ON COLUMN public.projects.ifc_storage_key IS 
  'Unique storage key in Supabase Storage (format: user_id/project_id/timestamp_uuid_filename.ifc)';

COMMENT ON COLUMN public.projects.original_filename IS 
  'Original filename uploaded by user (before sanitization)';

-- ============================================================================
-- VERIFICATION: Run this to confirm the migration worked
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name IN ('ifc_storage_key', 'original_filename');

-- Expected output:
-- column_name        | data_type | is_nullable
-- -------------------+-----------+-------------
-- ifc_storage_key    | text      | YES
-- original_filename  | text      | YES
