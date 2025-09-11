# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY src/ ./src/

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装系统依赖和Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 设置Playwright环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    NPM_CONFIG_CACHE=/tmp/.npm

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# 设置工作目录
WORKDIR /app

# 复制package文件并安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制其他必要文件
COPY scripts/ ./scripts/
COPY ecosystem.config.js ./

# 创建必要目录并设置权限
RUN mkdir -p logs data && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用dumb-init作为PID 1进程
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["npm", "start"]
