# BƯỚC 1: Build React App
FROM node:22-bullseye-slim AS build

WORKDIR /app

# Copy package files của web
COPY apps/web/package*.json ./

# Cài đặt dependencies sạch
RUN npm install --legacy-peer-deps

# Copy toàn bộ mã nguồn web
COPY apps/web ./

# Build Vite React app
ARG VITE_FB_APP_ID
ENV VITE_FB_APP_ID=$VITE_FB_APP_ID
RUN npx vite build

# BƯỚC 2: Serve bằng Nginx
FROM nginx:alpine

# Xóa cấu hình nginx mặc định
RUN rm -rf /usr/share/nginx/html/*

# Copy kết quả build từ Bước 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy file cấu hình Nginx tùy chỉnh (hỗ trợ React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

