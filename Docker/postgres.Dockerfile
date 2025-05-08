FROM postgres:15

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-15 \
    && rm -rf /var/lib/apt/lists/*

# Clone and install pgvector
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install

# Create initialization script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL\n\
    CREATE EXTENSION IF NOT EXISTS vector;\n\
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\
\n\
    -- Create tables for GCN Legacy\n\
    CREATE TABLE IF NOT EXISTS pdfdata (\n\
        id SERIAL PRIMARY KEY,\n\
        pdf_name TEXT NOT NULL,\n\
        pdf_content BYTEA,\n\
        text_vectors JSONB,\n\
        pdf_info JSONB,\n\
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS chat_memory (\n\
        id SERIAL PRIMARY KEY,\n\
        chat_id TEXT NOT NULL,\n\
        summary TEXT,\n\
        key_points TEXT[],\n\
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS product_related_queries (\n\
        id SERIAL PRIMARY KEY,\n\
        product_title TEXT NOT NULL,\n\
        query TEXT NOT NULL,\n\
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n\
    );\n\
\n\
    -- Create indexes\n\
    CREATE INDEX IF NOT EXISTS idx_pdfdata_name ON pdfdata(pdf_name);\n\
    CREATE INDEX IF NOT EXISTS idx_chat_memory_chat_id ON chat_memory(chat_id);\n\
    CREATE INDEX IF NOT EXISTS idx_product_queries_title ON product_related_queries(product_title);\n\
EOSQL\n\
' > /docker-entrypoint-initdb.d/init-extensions.sh

# Make the script executable
RUN chmod +x /docker-entrypoint-initdb.d/init-extensions.sh 