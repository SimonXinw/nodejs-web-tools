# 🐳 Docker 环境部署指南 (Ubuntu 专版)

## 📋 项目简介

这是一个基于 Node.js 和 Playwright 的金价爬虫工具，支持定时抓取金价数据并存储到 Supabase 数据库。本指南专门针对 Ubuntu 系统进行了优化，提供完整的 Docker 容器化部署方案。

## 🎯 系统要求

- **操作系统**: Ubuntu 18.04 LTS 及以上版本（推荐 Ubuntu 22.04 LTS）
- **架构**: x86_64 (amd64) 或 ARM64
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **内存**: 最少 2GB RAM（推荐 4GB）
- **磁盘空间**: 最少 10GB 可用空间
- **网络**: 稳定的互联网连接

---

## 📦 1. Ubuntu 系统 Docker 安装

### 🐧 **Ubuntu/Debian 系统（推荐方式）**

```bash
# 1. 更新系统包
sudo apt update && sudo apt upgrade -y

# 2. 卸载旧版本Docker（如果存在）
sudo apt remove -y docker docker-engine docker.io containerd runc

# 3. 安装必要的依赖包
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

# 4. 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 5. 添加Docker APT仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 6. 更新包索引
sudo apt update

# 7. 安装Docker CE和相关组件
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 8. 启动并设置Docker服务开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 9. 将当前用户添加到docker组（避免每次使用sudo）
sudo usermod -aG docker $USER

# 10. 验证安装
sudo docker --version
sudo docker compose version

# 11. 测试Docker是否正常工作
sudo docker run hello-world
```

**重要提示：** 执行第9步后，需要重新登录或运行以下命令使组权限生效：
```bash
newgrp docker
```

### 🚀 **Ubuntu 快速安装脚本**

为了简化安装过程，您也可以使用官方的便捷脚本：

```bash
# 下载并执行Docker官方安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 将用户添加到docker组
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt install -y docker-compose-plugin

# 重新登录使权限生效
newgrp docker
```

### 🔧 **Ubuntu 系统优化配置**

安装完成后，建议进行以下优化配置：

```bash
# 1. 配置Docker镜像加速器（中国大陆用户推荐）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# 2. 重启Docker服务使配置生效
sudo systemctl daemon-reload
sudo systemctl restart docker

# 3. 验证配置
docker info | grep -A 10 "Registry Mirrors"
```

---

## ⚙️ 2. 项目环境配置

### 📁 **克隆项目**

```bash
# 确保已安装git
sudo apt install -y git

# 克隆代码仓库
git clone <your-repository-url>
cd nodejs-web-tools

# 或者下载项目压缩包并解压
wget <project-archive-url>
unzip <project-archive.zip>
cd nodejs-web-tools
```

### 🔐 **配置环境变量**

```bash
# 复制环境变量模板
cp .env.example .env

# 使用nano编辑器编辑环境变量文件（Ubuntu默认）
nano .env

# 或使用vim编辑器
sudo apt install -y vim
vim .env

# 或使用VS Code编辑器
code .env
```

**必需的环境变量配置：**

```env
# Supabase 数据库配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 应用配置
NODE_ENV=production
PORT=3000
ENABLE_API=true
API_PORT=3000

# 爬虫配置
SCRAPER_SCHEDULE="0 */6 * * *"  # 每6小时运行一次
HEADLESS=true
TIMEOUT=30000

# 日志配置
LOG_LEVEL=info
```

### 📂 **创建必要目录**

```bash
# 创建日志和数据目录
mkdir -p logs data

# 设置适当的权限
chmod 755 logs data

# 确保Docker可以访问这些目录
sudo chown -R $USER:docker logs data

# 验证目录创建
ls -la logs/ data/
```

### 🔧 **Ubuntu 系统特定配置**

```bash
# 1. 安装必要的系统工具
sudo apt install -y curl wget unzip tree htop

# 2. 配置防火墙（如果启用了ufw）
sudo ufw allow 3000/tcp
sudo ufw reload

# 3. 检查系统资源
free -h
df -h

# 4. 设置时区（重要：确保定时任务正确执行）
sudo timedatectl set-timezone Asia/Shanghai
timedatectl status

# 5. 确保系统时间同步
sudo apt install -y ntp
sudo systemctl enable ntp
sudo systemctl start ntp
```

---

## 🚀 3. Docker 部署方式

### 🎈 **方式一：Docker Compose（推荐）**

这是最简单的部署方式，适合生产环境：

```bash
# 1. 构建并启动服务
docker compose up -d

# 2. 查看服务状态
docker compose ps

# 3. 查看日志
docker compose logs -f

# 4. 查看特定服务日志
docker compose logs -f gold-scraper
```

**Docker Compose 命令大全：**

```bash
# 后台启动服务
docker compose up -d

# 前台启动服务（查看实时日志）
docker compose up

# 停止服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 重启服务
docker compose restart

# 重新构建镜像
docker compose build

# 重新构建并启动
docker compose up -d --build

# 查看服务状态
docker compose ps

# 进入容器命令行
docker compose exec gold-scraper sh

# 查看容器资源使用情况
docker compose top
```

### 🔧 **方式二：单独 Docker 命令**

如果您喜欢更精细的控制：

```bash
# 1. 构建镜像
npm run docker:build
# 或者手动构建
docker build -t gold-scraper .

# 2. 运行容器
npm run docker:run
# 或者手动运行
docker run -d \
  --name gold-scraper \
  --env-file .env \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  gold-scraper

# 3. 查看容器状态
docker ps

# 4. 查看日志
npm run docker:logs
# 或者
docker logs -f gold-scraper

# 5. 停止容器
npm run docker:stop

# 6. 删除容器
npm run docker:remove
```

---

## 🔍 4. 服务验证和监控

### ✅ **健康检查**

```bash
# 检查容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 检查应用API是否正常
curl http://localhost:3000/health

# 或在浏览器中访问
open http://localhost:3000/health
```

### 📊 **监控和日志**

```bash
# 实时查看应用日志
docker compose logs -f gold-scraper

# 查看最近100行日志
docker compose logs --tail=100 gold-scraper

# 查看容器资源使用情况
docker stats gold-scraper

# 进入容器内部调试
docker compose exec gold-scraper sh

# 查看容器内部文件
docker compose exec gold-scraper ls -la /app

# 查看环境变量
docker compose exec gold-scraper env
```

### 🔄 **服务管理**

```bash
# 重启服务
docker compose restart gold-scraper

# 更新应用（重新构建镜像）
docker compose down
docker compose build --no-cache
docker compose up -d

# 扩展服务（运行多个实例）
docker compose up -d --scale gold-scraper=3

# 查看服务资源占用
docker compose top gold-scraper
```

---

## 🌐 5. 访问应用

应用启动后，您可以通过以下方式访问：

- **健康检查**: http://localhost:3000/health
- **API文档**: http://localhost:3000/api-docs（如果启用）
- **金价数据**: http://localhost:3000/api/gold-price

### 📱 **API 接口示例**

```bash
# 获取最新金价
curl http://localhost:3000/api/gold-price/latest

# 获取历史金价
curl http://localhost:3000/api/gold-price/history?limit=10

# 触发手动爬取
curl -X POST http://localhost:3000/api/scrape/trigger
```

---

## 🛠️ 6. 常见问题排查

### ❌ **问题1: 容器启动失败**

```bash
# 查看详细错误信息
docker compose logs gold-scraper

# 检查镜像是否构建成功
docker images | grep gold-scraper

# 检查端口是否被占用
netstat -tulpn | grep :3000

# 解决方案：
# 1. 修改端口映射
# 2. 检查环境变量配置
# 3. 重新构建镜像
```

### ❌ **问题2: 数据库连接失败**

```bash
# 检查环境变量
docker compose exec gold-scraper env | grep SUPABASE

# 测试网络连接
docker compose exec gold-scraper ping supabase.co

# 解决方案：
# 1. 确认SUPABASE_URL和SUPABASE_ANON_KEY正确
# 2. 检查网络防火墙设置
# 3. 验证Supabase项目状态
```

### ❌ **问题3: Chromium启动失败**

```bash
# 查看浏览器相关错误
docker compose logs gold-scraper | grep -i chrome

# 进入容器检查
docker compose exec gold-scraper chromium-browser --version

# 解决方案：
# 1. 增加容器内存限制
# 2. 添加额外的Docker运行参数
docker run --shm-size=1gb ...
```

### ❌ **问题4: 权限问题（Ubuntu常见）**

```bash
# 检查文件权限
ls -la logs/ data/

# 修复权限问题
sudo chown -R $USER:docker logs data
chmod -R 755 logs data

# 确保用户在docker组中
groups $USER | grep docker

# 如果用户不在docker组中，添加并重新登录
sudo usermod -aG docker $USER
newgrp docker

# 检查Docker socket权限
ls -la /var/run/docker.sock

# 在Docker Compose中添加用户映射
# docker-compose.yml:
# user: "${UID}:${GID}"

# 获取当前用户的UID和GID
echo "UID=$(id -u) GID=$(id -g)"
```

### ❌ **问题5: 内存不足**

```bash
# 查看系统资源
free -h
df -h

# 查看Docker资源使用
docker system df
docker stats

# 清理无用镜像和容器
docker system prune -f
docker image prune -f
```

---

## 🔄 7. 更新和维护

### 🆕 **更新应用版本**

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 停止当前服务
docker compose down

# 3. 重新构建镜像
docker compose build --no-cache

# 4. 启动新版本
docker compose up -d

# 5. 验证更新
docker compose logs -f gold-scraper
```

### 🧹 **清理和备份**

```bash
# 备份重要数据
tar -czf backup-$(date +%Y%m%d).tar.gz logs/ data/ .env

# 清理无用的Docker资源
docker system prune -a -f

# 清理无用的镜像
docker image prune -a -f

# 清理无用的容器
docker container prune -f

# 清理无用的网络
docker network prune -f

# 清理无用的数据卷
docker volume prune -f
```

### 📈 **性能优化**

```bash
# 查看镜像大小
docker images gold-scraper

# 优化镜像构建（在Dockerfile中）
# 1. 使用多阶段构建
# 2. 清理包管理器缓存
# 3. 删除不必要的文件

# 监控资源使用
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## 🚨 8. Ubuntu 生产环境部署建议

### 🔒 **Ubuntu 安全配置**

```bash
# 1. 更新系统到最新版本
sudo apt update && sudo apt upgrade -y

# 2. 配置UFW防火墙
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw status

# 3. 创建专用的应用用户
sudo useradd -r -s /bin/false -m -d /opt/gold-scraper goldapp
sudo usermod -aG docker goldapp

# 4. 配置fail2ban防止暴力攻击
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 示例docker-compose.yml安全配置
version: '3.8'
services:
  gold-scraper:
    build: .
    user: "1001:1001"
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped
```

### 🔧 **Ubuntu 系统优化**

```bash
# 1. 优化系统内核参数
sudo tee -a /etc/sysctl.conf <<EOF
# Docker优化
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
vm.max_map_count = 262144
EOF

# 应用内核参数
sudo sysctl -p

# 2. 配置系统限制
sudo tee -a /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# 3. 设置自动更新（可选）
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 📋 **Ubuntu 监控配置**

```bash
# 1. 安装系统监控工具
sudo apt install -y htop iotop nethogs

# 2. 创建监控脚本
cat > monitor.sh <<'EOF'
#!/bin/bash
# Ubuntu系统监控脚本
LOG_FILE="/var/log/gold-scraper-monitor.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | sudo tee -a $LOG_FILE
}

while true; do
    # 检查应用健康状态
    if ! curl -f http://localhost:3000/health &>/dev/null; then
        log_message "应用健康检查失败，正在重启..."
        docker compose restart gold-scraper
        log_message "应用已重启"
    fi
    
    # 检查系统资源
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
    DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')
    
    if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
        log_message "内存使用率过高: ${MEMORY_USAGE}%"
    fi
    
    if (( DISK_USAGE > 90 )); then
        log_message "磁盘使用率过高: ${DISK_USAGE}%"
    fi
    
    sleep 60
done
EOF

# 3. 设置脚本权限并创建systemd服务
chmod +x monitor.sh
sudo mv monitor.sh /usr/local/bin/

# 4. 创建systemd服务文件
sudo tee /etc/systemd/system/gold-scraper-monitor.service <<EOF
[Unit]
Description=Gold Scraper Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 5. 启用监控服务
sudo systemctl daemon-reload
sudo systemctl enable gold-scraper-monitor.service
sudo systemctl start gold-scraper-monitor.service

# 6. 配置日志轮转
sudo tee /etc/logrotate.d/gold-scraper-monitor <<EOF
/var/log/gold-scraper-monitor.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

---

## 📞 技术支持

如果您在使用过程中遇到问题，可以：

1. 查看项目日志: `docker compose logs -f`
2. 检查容器状态: `docker compose ps`
3. 查看系统资源: `docker stats`
4. 提交Issue到项目仓库
5. 查看官方Docker文档: https://docs.docker.com/

---

## 📄 许可证

本项目采用 MIT 许可证，详情请查看 LICENSE 文件。

---

**🎉 恭喜！您已经在Ubuntu系统上成功部署了金价爬虫工具！**

现在您可以：
- ✅ 通过浏览器访问 http://localhost:3000/health 验证部署
- ✅ 查看实时日志了解爬虫运行状态：`docker compose logs -f`
- ✅ 使用API接口获取金价数据
- ✅ 根据需要调整配置和调度策略
- ✅ 通过systemd监控服务确保应用稳定运行
- ✅ 使用Ubuntu的包管理器轻松维护系统依赖

### 🔧 **Ubuntu 特有的管理命令**

```bash
# 查看系统服务状态
sudo systemctl status docker
sudo systemctl status gold-scraper-monitor

# 查看系统资源使用
htop
iotop
nethogs

# 查看防火墙状态
sudo ufw status

# 查看系统日志
journalctl -u docker.service -f
tail -f /var/log/gold-scraper-monitor.log

# 更新系统和Docker
sudo apt update && sudo apt upgrade -y
```