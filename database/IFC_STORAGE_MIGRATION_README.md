# IFC Storage Migration - Unique Storage Keys

## Overview

This migration implements unique storage keys for IFC files in Supabase Storage to prevent filename collisions and ensure reliable file access across server restarts.

## Problem Solved

**Before**: IFC files were stored using their sanitized filename as the storage key. This caused:
- Filename collisions when different users uploaded files with the same name
- Overwrites when the same user uploaded a file with the same name
- Potential data loss and confusion

**After**: Each IFC file gets a unique storage key that includes user ID, project ID, timestamp, and UUID:
```
Format: {user_id}/{project_id}/{timestamp}_{uuid}_{sanitized_filename}
Example: 550e8400-e29b-41d4-a716-446655440000/abc123-def456/20260315_143022_a1b2c3d4_Building_Model.ifc
```

## Database Changes

Run the SQL migration in Supabase SQL Editor:

```sql
-- File: database/add_ifc_storage_columns.sql

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
```

## Backend Changes (api/main.py)

### 1. New Helper Function
```python
def generate_unique_storage_key(original_filename: str, user_id: Optional[str] = None, project_id: Optional[str] = None) -> str:
    """Generate a unique storage key for IFC files to prevent collisions."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    sanitized = sanitize_filename(original_filename)
    
    user_part = user_id if user_id else "anonymous"
    project_part = project_id if project_id else f"temp_{unique_id}"
    
    storage_key = f"{user_part}/{project_part}/{timestamp}_{unique_id}_{sanitized}"
    return storage_key
```

### 2. Updated Upload Endpoint
- Now accepts `user_id` and `project_id` as form fields
- Generates unique storage key using these IDs
- Returns `ifc_storage_key` and `original_filename` in response
- Uploads to Supabase using the unique key

### 3. Updated Download Endpoint
- Now accepts optional `storage_key` query parameter
- Prioritizes `storage_key` over `filename` for Supabase lookup
- Maintains backward compatibility with old filename-based lookups

## Frontend Changes

### 1. TypeScript Interfaces Updated
- `ProjectData` interface now includes `ifcStorageKey` and `originalFilename`
- `SupabaseProject` interface updated to match database schema
- `IFCViewerWebIFCProps` now accepts `ifcStorageKey` prop
- `NestingReportProps` now accepts `ifcStorageKey` prop

### 2. Upload Flow
1. Pre-generate project UUID on frontend
2. Send `user_id` and `project_id` with file upload
3. Backend generates unique storage key
4. Backend returns storage key in response
5. Frontend creates project with pre-generated ID and storage key
6. Storage key is saved in database

### 3. Project Loading Flow
1. Load project from Supabase (includes `ifc_storage_key`)
2. Pass storage key to IFC viewer components
3. Viewer fetches IFC file with storage key query parameter
4. Backend uses storage key to fetch from Supabase if local cache missing

## Backward Compatibility

- Existing projects without `ifc_storage_key` will continue to work
- Backend falls back to filename-based lookup if storage_key is NULL
- No data migration needed for existing projects
- New uploads automatically use the new unique key system

## Environment Variables Required

Ensure these are set in Railway for the API service:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IFC_STORAGE_BUCKET=ifc-files
```

## Supabase Storage Setup

1. Create bucket named `ifc-files` in Supabase Storage
2. Set bucket to **private** (files should only be accessible with auth)
3. Ensure service role key has access to the bucket

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Verify environment variables in Railway
- [ ] Upload a new IFC file
- [ ] Verify file appears in Supabase Storage with unique key format
- [ ] Verify project record has `ifc_storage_key` and `original_filename` populated
- [ ] Log out and log back in
- [ ] Open the project and verify 3D model loads correctly
- [ ] Upload another file with the same name
- [ ] Verify both files exist in storage with different keys
- [ ] Test with existing old projects (should still work with filename fallback)

## Benefits

1. **No Filename Collisions**: Each file gets a globally unique storage key
2. **Multi-tenant Safe**: User IDs in path prevent cross-user conflicts
3. **Audit Trail**: Timestamp in key provides upload time information
4. **Original Filename Preserved**: Display name separate from storage key
5. **Backward Compatible**: Old projects continue to work
6. **Reliable**: Files persist across server restarts/redeployments
