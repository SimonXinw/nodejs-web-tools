#!/bin/bash

# =============================================================================
# CentOS Google Chrome 安装脚本
# 版本: 2.0
# 更新日期: 2025年9月
# 支持: CentOS 7/8/9/Stream, AlmaLinux, Rocky Linux
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到以root用户运行，建议使用普通用户+sudo"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统架构
check_architecture() {
    log_info "检查系统架构..."
    ARCH=$(uname -m)
    log_info "系统架构: $ARCH"
    
    if [[ "$ARCH" != "x86_64" ]]; then
        log_error "Google Chrome 仅支持64位系统(x86_64)，当前系统为: $ARCH"
        log_error "请升级到64位系统后重试"
        exit 1
    fi
    
    log_success "架构检查通过 (64位)"
}

# 检测操作系统版本
detect_os() {
    log_info "检测操作系统版本..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION_ID"
        log_info "操作系统: $OS_NAME $OS_VERSION"
        
        # 检查CentOS 7 EOL警告
        if [[ "$ID" == "centos" && "$VERSION_ID" == "7" ]]; then
            log_warning "CentOS 7 已于2024年6月30日停止支持(EOL)"
            log_warning "Google Chrome可能无法获取最新更新"
            log_warning "建议升级到CentOS Stream 9、AlmaLinux 9或Rocky Linux 9"
            read -p "是否继续安装？(y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        log_error "无法检测操作系统版本"
        exit 1
    fi
}

# 检测包管理器 (优先使用 CentOS 7 的 yum)
detect_package_manager() {
    log_info "检测包管理器..."
    
    # 优先使用 yum (CentOS 7)
    if command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_MANAGER_ALT="dnf"
        log_info "使用 yum 包管理器 (CentOS 7 兼容)"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_MANAGER_ALT="yum"
        log_info "使用 dnf 包管理器 (CentOS 8+)"
    else
        log_error "未找到支持的包管理器 (yum/dnf)"
        exit 1
    fi
    
    # 检查备用包管理器
    if command -v $PKG_MANAGER_ALT &> /dev/null; then
        log_info "检测到备用包管理器: $PKG_MANAGER_ALT"
    fi
}

# 更新系统 (优先使用 CentOS 7 命令)
update_system() {
    log_info "更新系统包..."
    
    read -p "是否更新系统包？(推荐) (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "跳过系统更新"
        return
    fi
    
    log_info "正在更新系统，请稍候..."
    
    # 优先使用当前包管理器
    if sudo $PKG_MANAGER update -y; then
        log_success "系统更新完成"
        return
    fi
    
    # 如果失败且有备用包管理器，尝试备用方案
    if [[ -n "$PKG_MANAGER_ALT" ]] && command -v $PKG_MANAGER_ALT &> /dev/null; then
        log_warning "$PKG_MANAGER 更新失败，尝试使用 $PKG_MANAGER_ALT"
        if sudo $PKG_MANAGER_ALT update -y; then
            log_success "使用 $PKG_MANAGER_ALT 更新完成"
            PKG_MANAGER="$PKG_MANAGER_ALT"  # 切换到成功的包管理器
            return
        fi
    fi
    
    log_warning "系统更新失败，但继续安装Chrome"
}

# 安装必要依赖 (优先使用 CentOS 7 命令)
install_dependencies() {
    log_info "检查并安装必要依赖..."
    
    # 常见依赖包
    DEPS="wget nss libXScrnSaver"
    
    for dep in $DEPS; do
        if ! rpm -q $dep &>/dev/null; then
            log_info "安装依赖: $dep"
            
            # 优先使用当前包管理器
            if sudo $PKG_MANAGER install -y $dep; then
                log_success "依赖 $dep 安装成功"
                continue
            fi
            
            # 如果失败且有备用包管理器，尝试备用方案
            if [[ -n "$PKG_MANAGER_ALT" ]] && command -v $PKG_MANAGER_ALT &> /dev/null; then
                log_warning "$PKG_MANAGER 安装 $dep 失败，尝试使用 $PKG_MANAGER_ALT"
                if sudo $PKG_MANAGER_ALT install -y $dep; then
                    log_success "使用 $PKG_MANAGER_ALT 安装 $dep 成功"
                    continue
                fi
            fi
            
            log_warning "依赖 $dep 安装失败，可能影响Chrome运行"
        else
            log_info "依赖 $dep 已安装"
        fi
    done
}

# 下载Chrome RPM包
# wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm -O /tmp/chrome.rpm
download_chrome() {
    log_info "下载 Google Chrome RPM 包..."
    
    CHROME_URL="https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm"
    CHROME_RPM="/tmp/google-chrome-stable_current_x86_64.rpm"
    
    # 清理旧文件
    if [[ -f "$CHROME_RPM" ]]; then
        log_info "删除旧的RPM文件"
        rm -f "$CHROME_RPM"
    fi
    
    log_info "从官方源下载Chrome..."
    log_info "下载地址: $CHROME_URL"
    
    if wget --timeout=30 --tries=3 -O "$CHROME_RPM" "$CHROME_URL"; then
        log_success "Chrome RPM包下载完成"
        log_info "文件大小: $(du -h $CHROME_RPM | cut -f1)"
    else
        log_error "Chrome下载失败"
        log_error "请检查网络连接或手动下载："
        log_error "  1. 访问 https://www.google.com/chrome/"
        log_error "  2. 选择 'Linux 64-bit RPM'"
        log_error "  3. 保存到 $CHROME_RPM"
        exit 1
    fi
}

# 安装Chrome (优先使用 CentOS 7 命令)
# sudo yum localinstall /tmp/chrome.rpm -y
# yum --showduplicates list google-chrome-stable
install_chrome() {
    log_info "安装 Google Chrome..."
    
    CHROME_RPM="/tmp/google-chrome-stable_current_x86_64.rpm"
    
    if [[ ! -f "$CHROME_RPM" ]]; then
        log_error "Chrome RPM文件不存在: $CHROME_RPM"
        exit 1
    fi
    
    log_info "正在安装Chrome，自动解析依赖..."
    
    # 优先使用当前包管理器的 localinstall
    if sudo $PKG_MANAGER localinstall "$CHROME_RPM" -y; then
        log_success "Google Chrome 安装成功"
        rm -f "$CHROME_RPM"
        log_info "清理临时文件完成"
        return
    fi
    
    log_warning "$PKG_MANAGER localinstall 失败"
    
    # 如果有备用包管理器，尝试备用方案
    if [[ -n "$PKG_MANAGER_ALT" ]] && command -v $PKG_MANAGER_ALT &> /dev/null; then
        log_info "尝试使用 $PKG_MANAGER_ALT localinstall..."
        if sudo $PKG_MANAGER_ALT localinstall "$CHROME_RPM" -y; then
            log_success "使用 $PKG_MANAGER_ALT 安装Chrome成功"
            rm -f "$CHROME_RPM"
            log_info "清理临时文件完成"
            return
        fi
    fi
    
    # 尝试直接使用 rpm 命令
    log_info "尝试直接使用 rpm 安装..."
    if sudo rpm -ivh "$CHROME_RPM"; then
        log_success "使用 rpm 安装Chrome成功"
        rm -f "$CHROME_RPM"
        log_info "清理临时文件完成"
        return
    fi
    
    # 最后尝试强制安装
    log_warning "常规安装失败，尝试强制安装（跳过依赖检查）..."
    if sudo rpm -ivh --force --nodeps "$CHROME_RPM"; then
        log_warning "Chrome强制安装完成，但可能存在依赖问题"
        rm -f "$CHROME_RPM"
        log_info "清理临时文件完成"
        return
    fi
    
    log_error "Chrome安装完全失败"
    rm -f "$CHROME_RPM"
    exit 1
}

# 验证安装
# /srv/software/chromedriver-linux64/chromedriver
verify_installation() {
    log_info "验证 Chrome 安装..."
    
    if command -v google-chrome &> /dev/null; then
        #google-chrome --version
        CHROME_VERSION=$(google-chrome --version 2>/dev/null || echo "版本获取失败")
        log_success "Chrome安装验证成功"
        log_success "版本信息: $CHROME_VERSION"
        
        # 检查Chrome仓库配置
        if [[ -f "/etc/yum.repos.d/google-chrome.repo" ]]; then
            log_success "Chrome更新仓库已配置"
            log_info "未来可通过以下命令更新Chrome："
            log_info "  sudo $PKG_MANAGER update google-chrome-stable"
        fi
        
    else
        log_error "Chrome验证失败，命令 'google-chrome' 不存在"
        return 1
    fi
}

# 提供使用说明
show_usage() {
    log_info "Chrome 使用说明："
    echo
    echo "1. GUI启动:"
    echo "   - 在桌面环境中，打开'应用程序'菜单，找到'Google Chrome'"
    echo
    echo "2. 终端启动:"
    echo "   google-chrome &"
    echo
    echo "3. 更新Chrome:"
    echo "   sudo $PKG_MANAGER update google-chrome-stable"
    echo
    echo "4. 卸载Chrome:"
    echo "   sudo $PKG_MANAGER remove google-chrome-stable"
    echo "   sudo rm /etc/yum.repos.d/google-chrome.repo"
    echo
    
    if [[ -z "$DISPLAY" ]]; then
        log_warning "未检测到图形界面环境 (DISPLAY变量未设置)"
        log_warning "如需在GUI中使用Chrome，请确保："
        log_warning "  1. 安装桌面环境 (如: sudo $PKG_MANAGER groupinstall 'Server with GUI')"
        log_warning "  2. 启动图形界面 (如: sudo systemctl set-default graphical.target && reboot)"
    fi
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "     CentOS Google Chrome 安装脚本 v2.0"
    echo "=============================================="
    echo -e "${NC}"
    
    check_root
    check_architecture
    detect_os
    detect_package_manager
    update_system
    install_dependencies
    download_chrome
    install_chrome
    
    if verify_installation; then
        echo
        log_success "🎉 Google Chrome 安装完成！"
        show_usage
    else
        log_error "Chrome安装完成但验证失败，请手动检查"
        exit 1
    fi
}

# 错误处理
trap 'log_error "脚本执行被中断"; exit 1' INT TERM

# 执行主函数
main "$@"

