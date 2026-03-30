# Imagen base: Node oficial, version LTS slim
FROM node:22-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar manifiestos de dependencias primero (maximiza cache de Docker)
COPY package.json package-lock.json ./

# Instalar dependencias de Node
RUN npm ci

# Copiar el resto del codigo fuente
COPY . .

# Puerto en el que Vite escucha
EXPOSE 5173

# Iniciar el servidor de desarrollo de Vite
# --host 0.0.0.0 es necesario para que sea accesible desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
