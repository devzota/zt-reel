FROM node:20-bullseye-slim

# Cài đặt các thư viện hệ thống cần thiết cho FFmpeg và Chromium (Puppeteer)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    fonts-liberation \
    wget \
    locales \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer executable path to the installed chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set UTF-8 locale for Vietnamese character support
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Tạo thư mục app
WORKDIR /usr/src/app

# Sao chép file gốc
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Cài đặt dependencies
RUN npm install --legacy-peer-deps

# Copy toàn bộ mã nguồn
COPY . .

# Generate Prisma Client
WORKDIR /usr/src/app/apps/api
RUN npx prisma generate

# Build ứng dụng NestJS
RUN npm run build

# Port ứng dụng chạy
EXPOSE 3000

# Khởi chạy API
CMD ["npm", "run", "start:prod"]
