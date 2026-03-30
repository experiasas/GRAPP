# Imagen base: Python oficial, version slim (mas liviana)
FROM python:3.12-slim

# Evita que Python genere archivos .pyc y que el output quede en el buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg (PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python primero (maximiza cache de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del codigo fuente del proyecto
COPY . .

# Puerto en el que escucha el servidor de desarrollo Django
EXPOSE 8000

# Comando por defecto: correr el servidor de desarrollo
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
