# Server-Side PDF Generation Implementation

## Overview

The PDF generation for Cutting Plans has been migrated from client-side (using html2canvas + @react-pdf/renderer) to server-side rendering using Playwright. This solves the memory crash issues experienced with large projects (500+ cuts) while maintaining the exact same PDF design.

## What Changed

### Backend Changes

1. **New Dependency**: Added `playwright` and `jinja2` to `api/requirements.txt`

2. **New Module**: Created `api/pdf_generator.py` with `CuttingPlanPDFGenerator` class
   - Generates HTML that matches your current PDF design exactly
   - Uses Playwright to render HTML to PDF server-side
   - Supports cover page with project info and settings
   - Supports cutting plan pages with stockbars, SVGs, and cutting tables

3. **New API Endpoint**: `/api/generate-cutting-plan-pdf` (POST)
   - Accepts: nesting report data, project name, settings, selected profiles, icons (base64)
   - Returns: PDF file ready for download

### Frontend Changes

1. **Updated `NestingReport.tsx`**:
   - Replaced `handleExportCuttingPlanToPDF` function
   - Now loads icons as base64 and sends them to backend
   - Calls new API endpoint instead of using html2canvas
   - Removed client-side DOM manipulation and screenshot capture
   - Progress modal simplified (no longer tracks individual stockbars)

2. **Removed Dependencies**:
   - Client-side html2canvas capture is no longer used
   - No more memory issues from storing hundreds of base64 images in browser

## Benefits

### Performance
- **Memory Efficient**: Browser no longer holds hundreds of base64-encoded images
- **No Crashes**: Large projects (500+ cuts) can be exported without browser crashes
- **Faster**: Server-side rendering is generally faster than client-side for large documents
- **Scalable**: Can handle even larger projects without issues

### Design Consistency
- **Exact Match**: HTML/CSS replicates your current PDF design pixel-perfect
- **Same Layout**: Cover page, cutting plan pages, footers all match current design
- **Same Icons**: Uses the same SVG icons from your project

### Maintainability
- **Single Source**: HTML template in Python is easier to maintain than React PDF components
- **Debugging**: Easier to debug HTML/CSS issues server-side
- **Flexibility**: Can add more features (charts, graphs, etc.) more easily

## How to Test

### 1. Start the Backend Server

```powershell
# From project root
cd api
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend should start on `http://localhost:8000`

### 2. Start the Frontend Development Server

```powershell
# From project root
cd web
npm run dev
```

The frontend should start on `http://localhost:5173` (or similar)

### 3. Test PDF Export

1. Upload an IFC file
2. Generate nesting report
3. Navigate to "Cutting Plan" tab
4. Click "Export Cutting Plan"
5. Select profiles to export
6. Click "Generate PDF"

The PDF should download with:
- Cover page with project info, date, weight, profile types, cuts, and settings
- One page per profile with all stockbars
- Stockbar visualizations (SVG bars with parts)
- Cutting list tables
- Footers with logo, date, project name, and page numbers

### 4. Test with Large Projects

Try exporting projects with 500+ cuts. The browser should no longer crash or slow down significantly.

## API Endpoint Details

### POST `/api/generate-cutting-plan-pdf`

**Request Body:**
```json
{
  "nestingReport": { /* nesting report data */ },
  "projectName": "My Project",
  "tolerance": 100,
  "toleranceEnabled": true,
  "trim": 3,
  "kerf": 3,
  "selectedProfiles": ["HEA300", "IPE200"],
  "icons": {
    "logo_main": "base64...",
    "logo_small": "base64...",
    "project": "base64...",
    "date": "base64...",
    "weight": "base64...",
    "profile_types": "base64...",
    "cuts": "base64...",
    "tolerance": "base64...",
    "trim": "base64...",
    "kerf": "base64...",
    "length": "base64...",
    "tolerance_section": "base64...",
    "waste": "base64..."
  }
}
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="ProjectName_cutting_plan.pdf"`

## Deployment Notes

### Local Development
- Playwright browsers are installed in `C:\Users\maora\AppData\Local\ms-playwright\`
- Frontend connects to `http://localhost:8000` for API calls

### Production Deployment (Docker)

When deploying to production, you'll need to:

1. **Install Playwright in Docker**:
```dockerfile
RUN pip install playwright && playwright install chromium --with-deps
```

2. **Update API URL**: Change frontend API URL from `http://localhost:8000` to your production backend URL

3. **Environment Variable**: Consider using an environment variable for the API URL:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

## Troubleshooting

### Issue: "playwright not found"
**Solution**: Run `playwright install chromium` to download browser binaries

### Issue: PDF generation fails
**Solution**: Check backend logs for Python errors. Common causes:
- Missing icon files
- Invalid nesting report data
- Playwright browser not installed

### Issue: Frontend can't connect to backend
**Solution**: 
- Ensure backend is running on port 8000
- Check CORS settings in `main.py`
- Update API URL in frontend if needed

### Issue: PDF design doesn't match
**Solution**: 
- Check HTML/CSS in `pdf_generator.py`
- Compare generated HTML with current React components
- Adjust styles as needed

## Future Improvements

### Possible Enhancements
1. **Caching**: Cache generated PDFs for repeat exports
2. **Background Jobs**: Queue large PDF generation jobs
3. **Preview**: Generate preview image before full PDF
4. **Customization**: Allow users to customize PDF layout/colors
5. **Batch Export**: Export multiple projects at once

### Scaling
For very high volumes, consider:
- Multiple worker processes
- Distributed task queue (Celery/RabbitMQ)
- PDF generation service in separate containers

## Files Modified

### Backend
- `api/requirements.txt` - Added playwright and jinja2
- `api/main.py` - Added PDF generation endpoint
- `api/pdf_generator.py` - New file with PDF generation logic

### Frontend
- `web/src/components/NestingReport.tsx` - Updated PDF export function

## Rollback Plan

If you need to rollback to the old client-side generation:

1. Uncomment the old `captureStockbarImage` function in `NestingReport.tsx`
2. Replace the new `handleExportCuttingPlanToPDF` with the old version (see git history)
3. Remove the API call to backend
4. Keep using `@react-pdf/renderer` with `html2canvas`

The old code is still in git history and can be restored if needed.

## Summary

Server-side PDF generation with Playwright provides a robust, scalable solution for exporting large cutting plans without browser crashes. The implementation maintains your exact PDF design while significantly improving performance and reliability.
