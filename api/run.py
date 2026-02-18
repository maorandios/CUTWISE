#!/usr/bin/env python3
"""
Simple script to run the FastAPI server
"""
import uvicorn
import sys
import os

if __name__ == "__main__":
    # Get port from environment variable (Railway provides PORT)
    # Default to 8000 for local development
    port = int(os.environ.get("PORT", 8000))
    
    # Configure uvicorn to show all logs and not use subprocess for reload
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=False,  # Disable reload to see console output
        log_level="info",  # Use info level for production
        access_log=True
    )










