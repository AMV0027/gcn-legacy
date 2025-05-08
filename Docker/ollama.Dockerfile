# Use a specific version tag for stability
FROM ollama/ollama:0.1.27

# Create a directory for Ollama data
RUN mkdir -p /root/.ollama

# Expose the Ollama API port
EXPOSE 11434

# Create a startup script
RUN echo '#!/bin/sh\n\
ollama serve &\n\
sleep 10\n\
ollama pull gemma:3b\n\
wait\n\
' > /start.sh && chmod +x /start.sh

# Use the startup script as the entrypoint
CMD ["/start.sh"] 