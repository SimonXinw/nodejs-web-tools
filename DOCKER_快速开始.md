# 🚀 Docker 快速开始指南

## 📋 文件说明

本项目提供了完整的Docker容器化解决方案，包含以下配置文件：

### 🐳 **Docker配置文件**
- `Dockerfile` - 优化的多阶段构建Docker镜像
- `docker-compose.yml` - 完整版配置（包含Redis缓存）
- `docker-compose.simple.yml` - 简化版配置（仅主应用）
- `redis.conf` - Redis缓存服务配置

### 🔧 **启动脚本**
- `start-docker.sh` - Linux/Ubuntu启动脚本
- `start-docker.bat` - Windows启动脚本
- `docker-manage.bat` - Windows管理脚本

### ⚙️ **配置文件**
- `env.example` - 环境变量模板文件

---

## 🚀 快速启动

### **Windows用户**

1. **一键启动**（推荐）
   ```cmd
   start-docker.bat
   ```

2. **使用管理脚本**
   ```cmd
   # 启动服务
   docker-manage.bat start
   
   # 查看状态
   docker-manage.bat status
   
   # 查看日志
   docker-manage.bat logs
   ```

### **Linux/Ubuntu用户**

1. **一键启动**
   ```bash
   chmod +x start-docker.sh
   ./start-docker.sh
   ```

2. **手动启动**
   ```bash
   # 复制环境变量文件
   cp env.example .env
   
   # 编辑配置（必须）
   nano .env
   
   # 启动服务
   docker compose up -d
   ```

---

## ⚙️ 配置说明

### **1. 环境变量配置**

首次运行前，请配置环境变量：

```bash
# 复制模板文件
cp env.example .env

# 编辑配置文件
nano .env  # Linux
notepad .env  # Windows
```

**必需配置项：**
- `SUPABASE_URL` - Supabase项目URL
- `SUPABASE_ANON_KEY` - Supabase匿名密钥

### **2. Docker Compose版本选择**

**完整版（推荐生产环境）：**
```bash
docker compose -f docker-compose.yml up -d
```
- 包含Redis缓存服务
- 完整的监控和日志配置
- 资源限制和安全配置

**简化版（适合开发测试）：**
```bash
docker compose -f docker-compose.simple.yml up -d
```
- 仅包含主应用
- 配置简单，资源占用少

---

## 🔍 服务管理

### **查看服务状态**
```bash
# 查看容器状态
docker compose ps

# 查看资源使用
docker stats

# 健康检查
curl http://localhost:3000/health
```

### **日志管理**
```bash
# 查看实时日志
docker compose logs -f

# 查看最近100行日志
docker compose logs --tail=100

# 查看特定服务日志
docker compose logs -f gold-scraper
```

### **服务控制**
```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重新构建并启动
docker compose up -d --build
```

---

## 🌐 访问地址

服务启动后，可通过以下地址访问：

- **健康检查**: http://localhost:3000/health
- **API文档**: http://localhost:3000/api-docs
- **金价数据**: http://localhost:3000/api/gold-price/latest
- **历史数据**: http://localhost:3000/api/gold-price/history

---

## 🛠️ 故障排查

### **常见问题**

1. **端口被占用**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux
   netstat -tulpn | grep :3000
   ```

2. **容器启动失败**
   ```bash
   # 查看详细日志
   docker compose logs gold-scraper
   
   # 检查镜像是否构建成功
   docker images | grep gold-scraper
   ```

3. **环境变量未配置**
   ```bash
   # 检查环境变量
   docker compose exec gold-scraper env | grep SUPABASE
   ```

### **重置环境**
```bash
# 停止并删除所有容器
docker compose down -v

# 清理镜像和缓存
docker system prune -a -f

# 重新构建
docker compose build --no-cache
docker compose up -d
```

---

## 📊 监控和维护

### **性能监控**
```bash
# 查看容器资源使用
docker stats gold-scraper

# 查看系统资源
htop  # Linux
taskmgr  # Windows
```

### **数据备份**
```bash
# Windows
docker-manage.bat backup

# Linux
tar -czf backup-$(date +%Y%m%d).tar.gz logs/ data/ .env
```

### **日志清理**
```bash
# 清理Docker日志
docker system prune -f

# 清理应用日志
rm -rf logs/*.log  # Linux
del logs\*.log  # Windows
```

---

## 🔧 高级配置

### **自定义端口**
编辑 `docker-compose.yml`：
```yaml
ports:
  - "8080:3000"  # 将3000端口映射到8080
```

### **内存限制**
```yaml
deploy:
  resources:
    limits:
      memory: 2G      # 增加内存限制
      cpus: '1.0'     # 增加CPU限制
```

### **添加环境变量**
编辑 `.env` 文件：
```env
# 自定义配置
CUSTOM_SETTING=value
DEBUG=true
```

---

## 📞 技术支持

如遇问题，请：

1. 查看日志：`docker compose logs -f`
2. 检查配置：确认 `.env` 文件配置正确
3. 重启服务：`docker compose restart`
4. 查看文档：参考 `DOCKER_使用指南.md`

---

**🎉 现在您可以开始使用Gold Scraper了！** 