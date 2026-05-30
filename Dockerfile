# === Tahap 1: Build Aplikasi (Node.js) ===
FROM node:18-alpine AS builder
WORKDIR /app

# Menyalin berkas dependency projek
COPY package*.json ./
RUN npm install

# Menyalin seluruh source code ke dalam container
COPY . .

# Menangkap Substitution Variables (berawalan _) dari Google Cloud Build UI
ARG _REACT_APP_FIREBASE_API_KEY
ARG _REACT_APP_FIREBASE_AUTH_DOMAIN
ARG _REACT_APP_FIREBASE_PROJECT_ID
ARG _REACT_APP_FIREBASE_STORAGE_BUCKET
ARG _REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ARG _REACT_APP_FIREBASE_APP_ID
ARG _REACT_APP_FIREBASE_MEASUREMENT_ID

# Menyuntikkan nilai tersebut ke environment webpack/React saat proses build berlangsung
ENV REACT_APP_FIREBASE_API_KEY=$_REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$_REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_PROJECT_ID=$_REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_FIREBASE_STORAGE_BUCKET=$_REACT_APP_FIREBASE_STORAGE_BUCKET
ENV REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$_REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ENV REACT_APP_FIREBASE_APP_ID=$_REACT_APP_FIREBASE_APP_ID
ENV REACT_APP_FIREBASE_MEASUREMENT_ID=$_REACT_APP_FIREBASE_MEASUREMENT_ID

# Google Cloud Build menjalankan compile di sini, menghasilkan folder /build otomatis di cloud
RUN npm run build

# === Tahap 2: Menyajikan Aplikasi dengan Nginx ===
FROM nginx:alpine

# Menyalin folder hasil build otomatis di atas ke direktori HTML Nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Membuka port default web
EXPOSE 8080

# Menjalankan web server Nginx
CMD ["nginx", "-g", "daemon off;"]