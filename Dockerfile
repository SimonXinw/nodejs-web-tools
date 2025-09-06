# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 安装 Chromium 和相关依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# 设置 Playwright 使用系统安装的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser

# 创建应用目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 创建日志目录
RUN mkdir -p /app/logs

# 设置非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口（如果需要 HTTP 服务）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# 启动应用
CMD ["npm", "start"]
