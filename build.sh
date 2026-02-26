#!/bin/bash
# Build script for Railway deployment

echo "Building frontend..."
cd web
npm install
npm run build
cd ..

echo "Build complete!"
