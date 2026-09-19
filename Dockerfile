# Usamos la versión Slim (basada en Debian) en lugar de Alpine
FROM node:22-slim

# Instalamos OpenSSL y MongoDB Database Tools (mongodump, mongorestore)
# y limpiamos la caché de apt para mantener la imagen pequeña.
RUN apt-get update && \
    apt-get install -y openssl wget gnupg python3 python3-pip python3-venv && \
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add - && \
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && \
    apt-get install -y mongodb-database-tools && \
    rm -rf /var/lib/apt/lists/*


# Instalamos las librerías de Python requeridas
RUN pip3 install --no-cache-dir --break-system-packages pdfplumber requests


# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de paquetes
COPY package*.json ./

# Instalamos las dependencias de Node y el navegador Chromium para Playwright.
# Se instala explícitamente aquí para ser robusto ante timeouts de descarga o fallos
# de permisos del hook postinstall durante el build.
RUN npm install --omit=dev && npx playwright install --with-deps chromium

# Copiamos el resto de la aplicación
COPY . .

# --- LÍNEA DE DEPURACIÓN (LUEGO BÓRRALA) ---
RUN echo "Listando contenido de la carpeta actual:" && ls -la && echo "Listando contenido de clients:" && ls -la clients
# -------------------------------------------


# Creamos los directorios necesarios
RUN mkdir -p public downloads tmp clients /var/www/repfora/uploads

# Exponemos el puerto
EXPOSE 3000

# Iniciamos la aplicación
CMD ["npm", "start"]