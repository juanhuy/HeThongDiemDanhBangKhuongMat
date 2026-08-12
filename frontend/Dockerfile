# ============================================================
# Frontend — build React (Vite) → serve bằng Nginx
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./

# VITE_API_BASE mặc định RỖNG -> app dùng đường dẫn tương đối (/api/...)
# để Nginx proxy sang backend. Muốn trỏ IP khác: --build-arg VITE_API_BASE=http://ip:port
ARG VITE_API_BASE=
ENV VITE_API_BASE=$VITE_API_BASE
# Bỏ .env local để không ghi đè IP đã hardcode
RUN rm -f .env.local .env
RUN npm run build

# ---- Stage 2: Nginx ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Chuyển tiếp API requests tới backend container (không cần CORS phía client)
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
