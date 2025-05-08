# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install ngrok and Python
RUN apk add --no-cache curl unzip python3 py3-pip && \
    curl -Lo ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip && \
    unzip ngrok.zip && \
    mv ngrok /usr/local/bin && \
    rm ngrok.zip

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ .

# Build the application
RUN npm run build

# Install serve to run the built application
RUN npm install -g serve

# Copy the email script
COPY Docker/send_email.py /app/send_email.py

# Create a startup script
RUN echo '#!/bin/sh\n\
if [ -z "$NGROK_AUTHTOKEN" ]; then\n\
  echo "Error: NGROK_AUTHTOKEN is not set"\n\
  exit 1\n\
fi\n\
ngrok config add-authtoken $NGROK_AUTHTOKEN\n\
ngrok http 3000 --log=stdout > /var/log/ngrok.log &\n\
echo "Ngrok is starting..."\n\
sleep 5\n\
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o "https://[^\"]*")\n\
echo "Ngrok URL: $NGROK_URL"\n\
python3 /app/send_email.py "$NGROK_URL" &\n\
serve -s dist -l 3000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["/app/start.sh"] 