# Use official Node.js runtime as base image (Debian-based for glibc compatibility)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for audio processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for audio processing
# We use --break-system-packages because we are in an isolated container
RUN pip3 install --no-cache-dir --break-system-packages \
    numpy \
    scipy \
    librosa \
    tensorflow \
    torch

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories and set permissions
# The 'node' user already exists in the official node image
RUN mkdir -p /app/logs /app/temp && \
    chown -R node:node /app

# Copy application code
COPY .env.docker ./.env
COPY --chown=node:node . .

# Set permissions
RUN chmod +x scripts/migrate.js || true

# Switch to the pre-existing 'node' user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]