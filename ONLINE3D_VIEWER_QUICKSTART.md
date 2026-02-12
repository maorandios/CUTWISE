# Online3DViewer - Quick Start Guide

## What's New?

A new **"3D Viewer"** tab has been added to your application! This tab uses the same powerful Online3DViewer technology that powers the popular 3dviewer.net website.

## Features

✨ **Fast Loading** - No GLTF conversion needed, loads IFC files directly  
🎯 **Accurate Geometry** - Displays your IFC models with proper shapes and details  
🖱️ **Interactive Controls** - Orbit, pan, and zoom with smooth navigation  
🎨 **Clean Display** - Professional rendering with proper materials and colors  
📦 **No Setup Required** - Works out of the box, no additional configuration  

## How to Use

### 1. Upload Your IFC File
- Click the file upload area
- Select your IFC file
- Wait for the analysis to complete

### 2. Automatic View
- The app will automatically switch to the **"3D Viewer"** tab
- Your model will start loading immediately
- Within seconds, you'll see your complete 3D model

### 3. Navigate the Model
- **Left Mouse**: Orbit (rotate) the model
- **Right Mouse**: Pan (move) the model
- **Mouse Wheel**: Zoom in/out
- **Double-Click**: Focus on a specific area

### 4. Switch Between Viewers
You now have 3 viewing options:

| Tab | Best For | Speed | Features |
|-----|----------|-------|----------|
| **3D Viewer** | Quick viewing, fast navigation | ⚡⚡⚡ | Standard 3D controls |
| **Model** (GLTF) | Detailed analysis, measurements | ⚡ | Measurement tools, clipping planes |
| **Model** (web-ifc) | Experimental fast loading | ⚡⚡ | Experimental features |

## Technical Notes

### What Happens Behind the Scenes?
1. Your IFC file is uploaded to the server
2. The analysis runs to extract BIM data (profiles, plates, etc.)
3. The 3D Viewer tab loads the IFC file directly in your browser
4. Web-IFC (WebAssembly) parses the geometry client-side
5. The viewer displays everything in interactive 3D

### External Dependencies
The viewer automatically loads:
- **web-ifc** library (from CDN) for IFC parsing
- No server-side conversion needed
- Everything runs in your browser

### Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Any modern browser with WebGL support

## Comparison with Other Viewers

### 3D Viewer Tab (NEW) 🆕
**Pros:**
- Extremely fast loading (2-5 seconds)
- No server processing required
- Battle-tested technology (used by thousands)
- Smooth navigation and controls
- Works with large models

**Cons:**
- No measurement tools (yet)
- No element selection (yet)
- Basic feature set

### Model Tab (GLTF) 📊
**Pros:**
- Full feature set (measurement, clipping, selection)
- Highly customizable
- Integrated with analysis data
- Assembly grouping support

**Cons:**
- Slow loading (30-60+ seconds for large files)
- Requires server-side GLTF conversion
- Resource intensive

### Model Tab (web-ifc toggle) 🔬
**Pros:**
- Fast loading like 3D Viewer
- Integrated with analysis panel
- Includes measurement tools

**Cons:**
- Experimental/unstable
- Simplified geometry (no holes in plates)
- Still in development

## Best Practices

### When to Use 3D Viewer:
- ✅ First time viewing a model
- ✅ Quick verification of geometry
- ✅ Presenting to clients/stakeholders
- ✅ Working with large files
- ✅ Need fast, responsive navigation

### When to Use Model (GLTF):
- ✅ Detailed measurements needed
- ✅ Element selection and filtering
- ✅ Section views with clipping planes
- ✅ Integration with analysis reports
- ✅ Time is not critical

## Troubleshooting

### Model Doesn't Load
1. Check browser console for errors
2. Verify the IFC file uploaded successfully
3. Try refreshing the page
4. Check network connection (for CDN libraries)

### Slow Performance
1. Try closing other tabs/applications
2. Check if your GPU is being used (enable hardware acceleration)
3. For very large models, try the GLTF viewer instead

### Controls Not Working
1. Make sure you're clicking inside the viewer area
2. Check if another overlay is blocking interactions
3. Try refreshing the page to reset viewer state

## Future Updates

Planned enhancements for the 3D Viewer tab:
- 🔧 Measurement tools
- 🎯 Element selection and highlighting
- 📸 Screenshot/export functionality
- 🎨 Material customization
- ✂️ Clipping planes
- 📋 Properties panel
- 🔍 Search and filter

## Questions?

The 3D Viewer tab uses the open-source Online3DViewer library:
- GitHub: https://github.com/kovacsv/Online3DViewer
- Demo: https://3dviewer.net
- Documentation: See `ONLINE3D_VIEWER_INTEGRATION.md`

---

## Summary

The new 3D Viewer tab provides a **fast, reliable, and professional** way to view your IFC models. It's perfect for quick viewing and navigation, while the existing Model tab remains available for detailed analysis and measurement work.

Upload a file and try it now! 🚀

