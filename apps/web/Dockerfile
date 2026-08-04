# BƯỚC 1: Build React App
FROM node:20-bullseye-slim as build

WORKDIR /app

# Copy root package.json (hỗ trợ npm workspaces)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build Vite / React
WORKDIR /app/apps/web
ARG VITE_FB_APP_ID
ENV VITE_FB_APP_ID=$VITE_FB_APP_ID
RUN npm run build

# BƯỚC 2: Serve bằng Nginx
FROM nginx:alpine

# Xóa cấu hình nginx mặc định
RUN rm -rf /usr/share/nginx/html/*

# Copy kết quả build từ Bước 1
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Copy file cấu hình Nginx tùy chỉnh (nếu có, để hỗ trợ React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
