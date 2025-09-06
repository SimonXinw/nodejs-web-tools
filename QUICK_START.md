# 🚀 快速启动参考

## 📋 必需环境

- **Node.js**: 18+ 版本
- **Supabase**: 云数据库账号
- **网络**: 能访问 investing.com

## ⚡ 一键启动

### 方式一：自动化脚本
```bash
# Windows
start.bat

# Linux/macOS
./start.sh
```

### 方式二：主入口文件
```bash
# 显示所有选项
node main.js

# 快速开始
node main.js --setup    # 初始化向导
node main.js --dev      # 开发模式
node main.js --api      # 带 API 服务器
node main.js --manual   # 手动爬取一次
```

## 🔧 手动配置

### 1. 安装依赖
```bash
npm install
npx playwright install chromium
```

### 2. 配置环境变量
```bash
cp env.example .env
# 编辑 .env 文件，填入 Supabase 配置
```

### 3. 初始化数据库
在 Supabase SQL 编辑器中执行 `scripts/init-database.sql`

### 4. 启动项目
```bash
npm run dev        # 仅爬虫
npm run dev:api    # 爬虫 + API + 前端
```

## 📊 访问界面

- **前端图表**: http://localhost:3000/index.html
- **API 接口**: http://localhost:3000/api/gold/latest

## 🛠️ 常用命令

```bash
npm run setup         # 初始化向导
npm run test:scraper  # 测试功能
npm run monitor       # 系统监控
npm run backup        # 数据备份
npm run dev -- --manual  # 手动爬取一次
```

## 📝 必需环境变量

```bash
# .env 文件
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
ENABLE_API=true
```

## ❓ 快速故障排除

| 问题 | 解决方案 |
|------|----------|
| 依赖安装失败 | `rm -rf node_modules && npm install` |
| 爬虫无数据 | `npm run test:scraper` 检查 |
| 数据库连接失败 | 检查 Supabase 配置和网络 |
| 前端无法显示 | 确保使用 `npm run dev:api` |
| 定时任务不执行 | 检查 Cron 表达式格式 |

## 📞 获取帮助

1. 查看完整文档: `README.md`
2. 运行系统诊断: `npm run test:scraper`
3. 查看日志文件: `logs/combined.log`
4. 系统监控: `npm run monitor`
