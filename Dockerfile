# ─── TAHAP 1: BUILD ──────────────────────────────────────────
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies terlebih dahulu (untuk caching yang efisien)
COPY package*.json ./
RUN npm install

# Copy seluruh source code kamu
COPY . .

# Tangkap semua variabel rahasia dari Google Cloud Build Substitution Variables
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_FIREBASE_STORAGE_BUCKET
ARG REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ARG REACT_APP_FIREBASE_APP_ID
ARG REACT_APP_FIREBASE_MEASUREMENT_ID

# Jadikan Environment Variable agar bisa dibaca oleh React saat proses build
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_FIREBASE_STORAGE_BUCKET=$REACT_APP_FIREBASE_STORAGE_BUCKET
ENV REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ENV REACT_APP_FIREBASE_APP_ID=$REACT_APP_FIREBASE_APP_ID
ENV REACT_APP_FIREBASE_MEASUREMENT_ID=$REACT_APP_FIREBASE_MEASUREMENT_ID

# Eksekusi build React menjadi file statis (HTML/CSS/JS)
RUN npm run build

# ─── TAHAP 2: SERVE DENGAN NGINX (PRODUCTION) ────────────────
FROM nginx:alpine

# Pindahkan hasil folder /build dari tahap 1 ke folder server Nginx
COPY --from=build /app/build /usr/share/nginx/html

# 💡 KUNCI JAWABAN ERROR: Paksa Nginx untuk menggunakan Port 8080
EXPOSE 8080
CMD sed -i -e 's/80/8080/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'