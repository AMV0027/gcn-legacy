# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including PostgreSQL client and canvas dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    postgresql-client \
    build-base \
    nss \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    pkgconfig \
    libpng-dev \
    libjpeg-turbo-dev \
    musl-dev \
    zlib-dev \
    glib-dev \
    freetype-dev \
    expat-dev

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY backend/ .

# Create a startup script
RUN echo '#!/bin/sh\n\
until pg_isready -h postgres -p 5432 -U postgres; do\n\
  echo "Waiting for PostgreSQL..."\n\
  sleep 2\n\
done\n\
echo "PostgreSQL is ready!"\n\
node server.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["/app/start.sh"] 