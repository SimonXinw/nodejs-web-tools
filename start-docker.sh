#!/bin/bash

# =============================================================================
# Gold Scraper Docker 启动脚本 (Ubuntu 专版)
# =============================================================================

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查Docker是否安装
check_docker() {
    log_info "检查Docker安装状态..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        log_info "运行以下命令安装Docker:"
        echo "curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "sudo sh get-docker.sh"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    # 检查用户是否在docker组中
    if ! groups $USER | grep -q docker; then
        log_error "当前用户不在docker组中"
        log_info "运行以下命令添加用户到docker组:"
        echo "sudo usermod -aG docker $USER"
        echo "newgrp docker"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量配置..."
    
    if [[ ! -f .env ]]; then
        log_warning ".env文件不存在，正在创建..."
        if [[ -f .env.example ]]; then
            cp .env.example .env
            log_info "已从.env.example创建.env文件"
            log_warning "请编辑.env文件配置必要的环境变量"
            return 1
        else
            create_env_template
            log_warning "已创建.env模板文件，请配置必要的环境变量"
            return 1
        fi
    fi
    
    # 检查必要的环境变量
    local required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "以下环境变量未配置:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info "请编辑.env文件配置这些变量"
        return 1
    fi
    
    log_success "环境变量配置检查通过"
    return 0
}

# 创建环境变量模板
create_env_template() {
    cat > .env << 'EOF'
# Supabase 数据库配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 应用配置
NODE_ENV=production
PORT=3000
ENABLE_API=true
API_PORT=3000

# 爬虫配置
SCRAPER_SCHEDULE="0 */6 * * *"
HEADLESS=true
TIMEOUT=30000

# 日志配置
LOG_LEVEL=info
EOF
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p logs data
    chmod 755 logs data
    
    # 如果用户在docker组中，设置适当的所有者
    if groups $USER | grep -q docker; then
        sudo chown -R $USER:docker logs data 2>/dev/null || true
    fi
    
    log_success "目录创建完成"
}

# 构建Docker镜像
build_image() {
    log_info "构建Docker镜像..."
    
    # 清理旧的构建缓存
    docker builder prune -f > /dev/null 2>&1 || true
    
    # 构建镜像
    if docker compose build --no-cache; then
        log_success "Docker镜像构建完成"
    else
        log_error "Docker镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "启动Docker服务..."
    
    # 停止现有服务
    docker compose down > /dev/null 2>&1 || true
    
    # 启动服务
    if docker compose up -d; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_service() {
    log_info "等待服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "服务已就绪"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    log_error "服务启动超时"
    log_info "查看日志: docker compose logs -f"
    return 1
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker compose ps
    
    echo ""
    log_info "服务访问地址:"
    echo "  - 健康检查: http://localhost:3000/health"
    echo "  - API文档: http://localhost:3000/api-docs"
    echo "  - 金价数据: http://localhost:3000/api/gold-price"
    
    echo ""
    log_info "常用命令:"
    echo "  - 查看日志: docker compose logs -f"
    echo "  - 停止服务: docker compose down"
    echo "  - 重启服务: docker compose restart"
    echo "  - 进入容器: docker compose exec gold-scraper sh"
}

# 主函数
main() {
    echo "=========================================="
    echo "  Gold Scraper Docker 启动脚本"
    echo "=========================================="
    echo ""
    
    # 检查环境
    check_root
    check_docker
    
    # 检查配置
    if ! check_env_file; then
        log_info "请配置.env文件后重新运行脚本"
        exit 1
    fi
    
    # 创建目录
    create_directories
    
    # 构建和启动
    build_image
    start_services
    
    # 等待服务就绪
    if wait_for_service; then
        show_status
        log_success "Gold Scraper 部署完成！"
    else
        log_error "服务启动失败，请检查日志"
        docker compose logs --tail=50
        exit 1
    fi
}

# 脚本参数处理
case "${1:-}" in
    "build")
        log_info "仅构建镜像..."
        check_docker
        build_image
        ;;
    "start")
        log_info "仅启动服务..."
        check_docker
        start_services
        wait_for_service && show_status
        ;;
    "stop")
        log_info "停止服务..."
        docker compose down
        log_success "服务已停止"
        ;;
    "restart")
        log_info "重启服务..."
        docker compose restart
        wait_for_service && show_status
        ;;
    "logs")
        docker compose logs -f
        ;;
    "status")
        show_status
        ;;
    *)
        main
        ;;
esac 