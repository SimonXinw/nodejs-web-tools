# 📖 使用指南

## 🚀 快速开始

### 1. 自动化安装（推荐）

```bash
# Windows 用户
start.bat

# Linux/macOS 用户
./start.sh
```

### 2. 手动安装

```bash
# 1. 安装依赖
npm install

# 2. 安装 Playwright 浏览器
npx playwright install chromium

# 3. 配置环境变量
cp env.example .env
# 编辑 .env 文件，填入你的 Supabase 配置

# 4. 初始化数据库
# 在 Supabase SQL 编辑器中执行 scripts/init-database.sql

# 5. 编译项目
npm run build
```

## 🔧 配置说明

### 环境变量配置

编辑 `.env` 文件：

```bash
# 必需配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 可选配置
SCRAPER_HEADLESS=true          # 是否无头模式
SCRAPER_TIMEOUT=30000          # 超时时间(毫秒)
SCRAPER_RETRY_COUNT=3          # 重试次数
GOLD_PRICE_SCHEDULE=0 * * * *  # 定时任务(每小时)
LOG_LEVEL=info                 # 日志级别
ENABLE_API=false               # 是否启用API服务器
API_PORT=3000                  # API端口
```

### Supabase 设置

1. 创建 Supabase 项目
2. 在 SQL 编辑器中执行 `scripts/init-database.sql`
3. 获取项目 URL 和 anon key
4. 配置到 `.env` 文件

## 📋 命令使用

### 基础命令

```bash
# 开发模式运行
npm run dev

# 生产模式运行
npm start

# 带 API 服务器运行
npm run dev:api
npm run start:api

# 手动执行一次爬取
npm run dev -- --manual

# 查看历史数据
npm run dev -- --history 10
```

### 工具命令

```bash
# 项目初始化
npm run setup

# 测试爬虫功能
npm run test:scraper

# 系统监控
npm run monitor
npm run monitor -- --watch    # 持续监控

# 数据备份
npm run backup
npm run backup -- --csv       # CSV格式
npm run backup -- --days 7    # 备份7天数据

# 数据恢复
npm run backup -- --restore backup.json

# 清理项目
npm run clean
```

## 🕷️ 爬虫使用

### 基础爬取

```typescript
import { GoldPriceScraper } from './src/scrapers/gold-price-scraper';

const scraper = new GoldPriceScraper();

// 执行爬取并保存
await scraper.scrapeAndSave();

// 仅爬取数据
const data = await scraper.scrape();

// 获取历史数据
const history = await scraper.getHistoricalData(100);
```

### 定时任务

```typescript
import { taskScheduler } from './src/scheduler/task-scheduler';

// 添加每小时执行的任务
taskScheduler.addTask(
  'gold-scraper',
  {
    cronExpression: '0 * * * *',
    timezone: 'Asia/Shanghai',
    immediate: true
  },
  async () => {
    await scraper.scrapeAndSave();
  }
);

// 启动所有任务
taskScheduler.startAllTasks();
```

### Cron 表达式参考

```bash
# 格式: 分 时 日 月 周
* * * * *     # 每分钟
0 * * * *     # 每小时
0 9 * * *     # 每天9点
0 9 * * 1     # 每周一9点
0 9 1 * *     # 每月1号9点
0 */2 * * *   # 每2小时
0 9-17 * * 1-5  # 工作日9-17点
```

## 🌐 API 使用

启动 API 服务器：

```bash
npm run dev:api
# 或
npm run start:api
```

### API 接口

```bash
# 健康检查
GET /health

# 获取最新金价
GET /api/gold/latest

# 获取历史数据
GET /api/gold/history?limit=100

# 手动触发爬取
POST /api/gold/scrape

# 系统状态
GET /api/status
```

### 使用示例

```javascript
// 获取最新金价
fetch('/api/gold/latest')
  .then(res => res.json())
  .then(data => console.log(data));

// 手动触发爬取
fetch('/api/gold/scrape', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

## 📊 前端界面

访问 `http://localhost:3000/index.html` 查看金价图表界面。

### 功能特性

- 📈 实时金价图表
- 🕐 多时间段查看（24小时/7天/30天/全部）
- 📊 价格统计信息
- 🔄 自动刷新
- 📱 响应式设计

## 🔍 监控和维护

### 系统监控

```bash
# 生成监控报告
npm run monitor

# 持续监控模式
npm run monitor -- --watch

# 保存报告到文件
npm run monitor -- --save
```

### 日志管理

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# Windows 用户可以直接打开日志文件
```

### 数据备份

```bash
# 备份最近30天数据
npm run backup

# 备份指定天数
npm run backup -- --days 7

# 备份为CSV格式
npm run backup -- --csv

# 从备份恢复
npm run backup -- --restore backup-file.json

# 清理旧备份
npm run backup -- --clean
```

## 🐳 部署方案

### Docker 部署

```bash
# 构建镜像
docker build -t gold-scraper .

# 运行容器
docker run -d --name gold-scraper --env-file .env gold-scraper

# 使用 docker-compose
docker-compose up -d
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs gold-scraper

# 重启应用
pm2 restart gold-scraper
```

### Linux 服务器部署

```bash
# 1. 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 克隆项目
git clone <your-repo-url>
cd nodejs-web-tools

# 3. 安装依赖
npm install --production
npx playwright install-deps chromium

# 4. 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 5. 编译项目
npm run build

# 6. 使用 PM2 启动
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 🛠️ 扩展开发

### 添加新的爬虫

1. 创建新的爬虫类：

```typescript
import { BaseScraper } from '../core/base-scraper';

class CustomScraper extends BaseScraper<CustomData> {
  protected async performScrape(): Promise<CustomData> {
    const page = await this.createPage();
    
    await this.navigateToPage(page, 'https://example.com');
    const data = await this.getElementText(page, '.price');
    
    return {
      price: parseFloat(data),
      timestamp: new Date().toISOString(),
      source: this.getSourceName()
    };
  }

  public getSourceName(): string {
    return 'example.com';
  }
}
```

2. 添加到定时任务：

```typescript
taskScheduler.addTask(
  'custom-scraper',
  { cronExpression: '0 */2 * * *' },
  async () => {
    const scraper = new CustomScraper();
    await scraper.scrapeAndSave();
  }
);
```

### 添加新的数据源

1. 扩展数据库表结构
2. 创建对应的爬虫类
3. 更新前端展示逻辑

## ❓ 常见问题

### Q: 爬虫无法获取数据？
A: 检查网络连接，确认目标网站可访问，查看日志文件排查具体错误。

### Q: 数据库连接失败？
A: 检查 Supabase 配置，确认 URL 和 Key 正确，网络连接正常。

### Q: 定时任务不执行？
A: 检查 Cron 表达式格式，确认程序正常运行，查看日志文件。

### Q: 前端界面显示异常？
A: 检查 API 服务器是否启动，Supabase 配置是否正确。

### Q: 如何修改爬取频率？
A: 修改 `.env` 文件中的 `GOLD_PRICE_SCHEDULE` 变量。

## 📞 技术支持

- 查看日志文件：`logs/` 目录
- 运行测试：`npm run test:scraper`
- 系统监控：`npm run monitor`
- 提交 Issue：项目 GitHub 页面

## 📝 更新日志

### v1.0.0
- ✅ 基础爬虫功能
- ✅ 定时任务调度
- ✅ 数据库存储
- ✅ 前端图表展示
- ✅ API 接口
- ✅ 监控和备份
- ✅ Docker 部署支持
