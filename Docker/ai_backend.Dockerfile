# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    curl \
    wget \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libxss1 \
    libxtst6 \
    libxinerama1 \
    libglu1-mesa \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set pip timeout
ENV PIP_DEFAULT_TIMEOUT=300

# Copy requirements file
COPY new_ai_backend/requirements.txt .

# Upgrade pip first
RUN pip install --upgrade pip

# Install Python dependencies with longer timeout, retries, and resume
RUN pip install -r requirements.txt

# Install Playwright browsers
RUN playwright install

# Copy the rest of the AI backend code
COPY new_ai_backend/ .

# Create a startup script
RUN echo '#!/bin/sh\n\
until pg_isready -h postgres -p 5432 -U postgres; do\n\
  echo "Waiting for PostgreSQL..."\n\
  sleep 2\n\
done\n\
echo "PostgreSQL is ready!"\n\
until curl -s http://ollama:11434/api/tags > /dev/null; do\n\
  echo "Waiting for Ollama..."\n\
  sleep 2\n\
done\n\
echo "Ollama is ready!"\n\
python main.py\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port 5001
EXPOSE 5001

# Start the application
CMD ["/app/start.sh"] 