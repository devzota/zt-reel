FROM node:18-bullseye-slim

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
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer executable path to the installed chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Tạo thư mục app
WORKDIR /usr/src/app

# Sao chép file gốc
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Cài đặt dependencies (sử dụng npm install tại root để setup workspace)
RUN npm install

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
