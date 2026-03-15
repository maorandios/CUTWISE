# IFC Unique Storage Key Implementation Summary

## What Was Implemented

A complete end-to-end solution for storing IFC files in Supabase Storage with unique keys to prevent filename collisions.

## Files Modified

### Backend (api/main.py)
1. **Added imports**: `uuid`, `datetime`
2. **New function**: `generate_unique_storage_key()` - generates unique storage paths
3. **Updated**: `upload_ifc_to_supabase()` - now accepts `storage_key` instead of `filename`
4. **Updated**: `download_ifc_from_supabase()` - now accepts `storage_key` instead of `filename`
5. **Updated**: `/api/upload` endpoint:
   - Accepts `user_id` and `project_id` as form fields
   - Generates unique storage key
   - Returns `ifc_storage_key` and `original_filename` in response
6. **Updated**: `/api/ifc/{filename}` endpoint:
   - Accepts optional `storage_key` query parameter
   - Uses storage key for Supabase lookup if provided
   - Falls back to filename for backward compatibility

### Frontend

#### web/src/utils/projectStorage.ts
- Added `ifcStorageKey?: string` to `ProjectData` interface
- Added `originalFilename?: string` to `ProjectData` interface

#### web/src/hooks/useProjects.ts
- Added `ifc_storage_key` and `original_filename` to `SupabaseProject` interface
- Updated `createProject()` to accept and store `ifcStorageKey`, `originalFilename`, and `projectId`
- Updated all data transformations to include new fields

#### web/src/App.tsx
- Added `currentIfcStorageKey` state variable
- Updated `proceedWithUpload()` to:
  - Pre-generate project UUID
  - Send `user_id` and `project_id` with upload
  - Store storage key from response
- Updated `handleSelectProject()` to load and set storage key
- Updated `handleBackToDashboard()` to clear storage key
- Pass storage key to `NestingReport` components

#### web/src/components/IFCViewerWebIFC.tsx
- Added `ifcStorageKey` prop to interface
- Updated fetch URL to include storage key as query parameter when available

#### web/src/components/NestingReport.tsx
- Added `ifcStorageKey` prop to interface
- Pass storage key to `IFCViewerWebIFC` components

### Database

#### database/add_ifc_storage_columns.sql
- Adds `ifc_storage_key` column to `projects` table
- Adds `original_filename` column to `projects` table
- Creates index on `ifc_storage_key`
- Adds documentation comments

#### database/SUPABASE_MIGRATION_COMMANDS.sql
- Complete migration script with instructions
- Verification queries
- Rollback commands
- Post-migration checklist

## How It Works

### Upload Flow
```
1. User uploads IFC file in frontend
2. Frontend pre-generates project UUID
3. Frontend sends: file + user_id + project_id to /api/upload
4. Backend generates unique storage key: user_id/project_id/timestamp_uuid_filename.ifc
5. Backend saves file locally AND uploads to Supabase with unique key
6. Backend returns: filename, ifc_storage_key, original_filename, report
7. Frontend creates project in database with all fields including storage key
```

### Project Reopen Flow
```
1. User clicks on project in dashboard
2. Frontend loads project from Supabase (includes ifc_storage_key)
3. Frontend passes storage key to IFCViewerWebIFC component
4. Viewer fetches: /api/ifc/{filename}?storage_key={unique_key}
5. Backend checks local cache first
6. If missing, backend downloads from Supabase using storage key
7. Backend restores local cache and serves file
```

## Storage Key Format

```
{user_id}/{project_id}/{timestamp}_{uuid}_{sanitized_filename}

Example:
550e8400-e29b-41d4-a716-446655440000/abc123-def456/20260315_143022_a1b2c3d4_Building_Model.ifc

Components:
- user_id: UUID of the user who uploaded the file
- project_id: UUID of the project
- timestamp: Upload time in YYYYMMDD_HHMMSS format
- uuid: 8-character unique identifier
- sanitized_filename: Original filename with invalid characters removed
```

## Backward Compatibility

- **Old projects**: Continue to work with filename-based lookup
- **New projects**: Use unique storage key
- **No breaking changes**: All existing functionality preserved
- **Gradual migration**: Old projects can be migrated on-demand or left as-is

## Benefits

1. **No Collisions**: Each file gets a globally unique key
2. **Multi-tenant Safe**: User IDs prevent cross-user conflicts
3. **Reliable**: Files persist across server restarts
4. **Auditable**: Timestamp in key shows when file was uploaded
5. **Organized**: Files grouped by user and project in storage
6. **Display-friendly**: Original filename preserved for UI

## Next Steps

1. Run the SQL migration in Supabase
2. Verify environment variables in Railway
3. Deploy updated code to Railway
4. Test the upload flow with a new project
5. Verify files appear in Supabase Storage with correct structure
