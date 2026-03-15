-- ============================================================================
-- SUPABASE DATABASE MIGRATION
-- Add IFC Storage Key Support to Projects Table
-- ============================================================================
-- 
-- PURPOSE:
-- Enable unique IFC file storage in Supabase Storage to prevent filename 
-- collisions between users and across multiple uploads of files with the 
-- same name.
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Navigate to your project
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute
--
-- SAFETY:
-- - Uses IF NOT EXISTS to prevent errors if columns already exist
-- - Non-destructive: existing data is preserved
-- - Backward compatible: existing projects continue to work
--
-- ============================================================================

-- Step 1: Add ifc_storage_key column
-- This stores the unique path in Supabase Storage (e.g., user_id/project_id/timestamp_uuid_filename.ifc)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS ifc_storage_key TEXT;

-- Step 2: Add original_filename column
-- This preserves the user's original filename for display purposes
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Step 3: Create index for faster lookups
-- Improves query performance when searching by storage key
CREATE INDEX IF NOT EXISTS idx_projects_ifc_storage_key 
ON public.projects(ifc_storage_key);

-- Step 4: Add documentation comments
COMMENT ON COLUMN public.projects.ifc_storage_key IS 
  'Unique storage key in Supabase Storage bucket (format: user_id/project_id/timestamp_uuid_filename.ifc). Prevents filename collisions.';

COMMENT ON COLUMN public.projects.original_filename IS 
  'Original filename uploaded by user before sanitization. Used for display purposes.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name IN ('ifc_storage_key', 'original_filename');

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'projects' 
  AND indexname = 'idx_projects_ifc_storage_key';

-- Check existing projects (should show NULL for new columns)
SELECT id, name, filename, ifc_storage_key, original_filename
FROM public.projects
ORDER BY date_created DESC
LIMIT 5;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Uncomment and run these commands if you need to undo the migration:

-- DROP INDEX IF EXISTS idx_projects_ifc_storage_key;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS original_filename;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS ifc_storage_key;

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================
-- 
-- 1. Ensure Supabase Storage bucket 'ifc-files' exists:
--    - Go to Storage in Supabase Dashboard
--    - Create bucket named 'ifc-files' if it doesn't exist
--    - Set to PRIVATE (auth required)
--
-- 2. Verify Railway environment variables:
--    SUPABASE_URL=https://your-project.supabase.co
--    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
--    IFC_STORAGE_BUCKET=ifc-files
--
-- 3. Deploy updated backend code to Railway
--
-- 4. Test by uploading a new IFC file and verifying:
--    - File appears in Supabase Storage with unique key
--    - Project record has ifc_storage_key populated
--    - 3D model loads correctly after logout/login
--
-- ============================================================================
