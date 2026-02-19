# Port 5180 Configuration Summary

## Status: ✅ CONFIGURED

The application is now fully configured to run on **port 5180**.

## Configuration Details

### Frontend (Vite)
- **File**: `web/vite.config.ts`
- **Port**: 5180
- **Host**: 0.0.0.0 (accessible from network)
- **Proxy**: API requests to `http://localhost:8000`

```typescript
server: {
  port: 5180,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

### Backend (FastAPI)
- **File**: `api/run.py`
- **Port**: 8000
- **Host**: 0.0.0.0
- **CORS**: Configured to allow requests from port 5180

### CORS Configuration
The backend (`api/main.py`) includes port 5180 in allowed origins:
```python
allow_origins=[
  "http://localhost:5173",  # Legacy support
  "http://localhost:3000",  # Legacy support
  "http://localhost:5180",  # Current port ✅
  "http://0.0.0.0:5180"     # Network access ✅
]
```

## How to Start the Application

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start-app.ps1
```

### Option 2: Manual Start
**Terminal 1 - Backend:**
```powershell
cd api
.\venv\Scripts\activate
python run.py
```

**Terminal 2 - Frontend:**
```powershell
cd web
npm run dev
```

## Access URLs

- **Frontend**: http://localhost:5180
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Documentation Updated

The following documentation files have been updated to reference port 5180:
- ✅ `README.md`
- ✅ `QUICKSTART.md`
- ✅ `START_HERE.md` (already mentioned port 5180)
- ✅ `start-app.ps1` (already configured)

## Notes

- The old port 5173 references in CORS are kept for backward compatibility
- Port 5180 is the default and configured port
- No additional changes are needed - the app is ready to run on port 5180


