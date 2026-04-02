FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Tornar scripts de start executáveis
RUN chmod +x start.sh start-celery-worker.sh start-celery-beat.sh

EXPOSE 8000

CMD ["./start.sh"]
