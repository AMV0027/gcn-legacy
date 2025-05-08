# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY new_ai_backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

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