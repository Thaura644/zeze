# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies needed for audio processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    ffmpeg \
    imagemagick \
    curl \
    && rm -rf /var/cache/apk/*

# Install Python packages for audio processing
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

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/logs /app/temp && \
    chown -R nodejs:nodejs /app

# Copy application code
COPY --chown=nodejs:nodejs . .

# Set permissions
RUN chmod +x scripts/migrate.js

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]