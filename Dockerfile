# Use official Python image (Debian-based, better library support)
FROM python:3.11-slim

# Install system dependencies for ifcopenshell
RUN apt-get update && apt-get install -y \
    build-essential \
    libstdc++6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r api/requirements.txt

# Install Node dependencies and build frontend
RUN cd web && npm install && npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Start command
CMD cd api && python run.py

