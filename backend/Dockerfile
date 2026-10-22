# ---------- Giai đoạn 1: build (có TypeScript) ----------
FROM node:24-alpine AS build
WORKDIR /app

# Copy file khai báo thư viện trước để Docker cache bước cài đặt
COPY package.json package-lock.json ./
RUN npm ci

# Copy mã nguồn rồi biên dịch TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Giai đoạn 2: chạy (chỉ thư viện production + dist) ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Thư mục lưu ảnh upload, cho user "node" (không phải root) được ghi
RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage
USER node

ENV PORT=3000
ENV UPLOAD_DIR=/app/storage/uploads
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

CMD ["node", "dist/server.js"]
