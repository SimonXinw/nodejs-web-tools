# 🏆 Node.js 金价爬虫工具

基于 Node.js + Playwright + Supabase 的金价数据爬取和展示系统。

## 📋 项目简介

这是一个专业的金价数据爬虫工具，能够自动从 eastmoney.com 爬取黄金期货价格数据，存储到 Supabase 数据库，并提供美观的前端图表展示。

### ✨ 主要特性

- 🚀 **高性能爬虫** - 基于 Playwright，支持反反爬虫检测
- 📊 **实时数据** - 定时自动爬取，支持手动执行  
- 🎨 **美观界面** - 响应式图表展示，支持多时间段查看
- 🛡️ **稳定可靠** - 完善的错误处理和重试机制
- 🐳 **容器化部署** - 支持 Docker 一键部署

### 🎯 技术栈

| 技术       | 版本  | 用途     |
| ---------- | ----- | -------- |
| Node.js    | 18+   | 运行环境 |
| TypeScript | 5.2+  | 开发语言 |
| Playwright | 1.40+ | 爬虫引擎 |
| Supabase   | 2.38+ | 数据库   |
| Chart.js   | 4.4+  | 图表展示 |
| node-cron  | 3.0+  | 定时任务 |
| Winston    | 3.11+ | 日志管理 |

## 🚀 快速开始

### 方法一：自动化安装（推荐新手）

```bash
# Windows 用户
start.bat

# Linux/macOS 用户
chmod +x start.sh
./start.sh
```

自动化脚本会引导你完成：
- 依赖安装
- 环境配置
- 数据库初始化
- 功能测试

### 方法二：手动安装

#### 1. 环境准备

```bash
# 确保安装了 Node.js 18+
node --version

# 克隆项目
git clone <your-repo-url>
cd nodejs-web-tools

# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium
```

#### 2. 配置 Supabase

##### 2.1 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并创建账号
2. 创建新项目，记录项目 URL 和 API Key
3. 在项目设置中找到 API 配置信息

##### 2.2 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件，填入你的 Supabase 配置
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# 可选配置
ENABLE_API=true          # 启用 API 服务器
API_PORT=3000           # API 端口
SCRAPER_HEADLESS=true   # 无头模式
GOLD_PRICE_SCHEDULE=0 * * * *  # 每小时执行
```

#### 3. 初始化数据库

在 Supabase 项目的 SQL 编辑器中执行 `scripts/init-database.sql` 脚本：

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 "SQL Editor"
4. 复制 `scripts/init-database.sql` 的内容
5. 粘贴并执行脚本

#### 4. 运行项目

```bash
# 初始化向导
npm run setup

# 开发模式
npm run dev

# 开发模式（带 API 服务器）
npm run dev:api

# 手动执行一次爬取
npm run dev -- --manual

# 测试爬虫功能
npm run test:scraper

# 生产模式
npm run build
npm start

# 生产模式（带 API 服务器）
npm run start:api
```

## 📁 项目结构

```
nodejs-web-tools/
├── src/                    # 源代码目录
│   ├── api/               # API 服务器
│   │   └── server.ts          # Express API 服务
│   ├── core/              # 核心模块
│   │   └── base-scraper.ts    # 爬虫基类
│   ├── scrapers/          # 爬虫实现
│   │   └── gold-price-scraper.ts  # 金价爬虫
│   ├── database/          # 数据库操作
│   │   └── supabase-client.ts     # Supabase 客户端
│   ├── scheduler/         # 任务调度
│   │   └── task-scheduler.ts      # 定时任务管理
│   ├── utils/             # 工具函数
│   │   ├── logger.ts          # 日志工具
│   │   └── helpers.ts         # 通用工具
│   ├── types/             # 类型定义
│   │   └── index.ts           # 接口定义
│   └── index.ts           # 程序入口
├── scripts/               # 工具脚本
│   ├── setup.js               # 项目初始化
│   ├── test-scraper.ts        # 功能测试
│   └── init-database.sql      # 数据库初始化
├── public/                # 前端文件
│   └── index.html         # 数据展示页面
├── logs/                  # 日志目录
├── dist/                  # 编译输出
├── main.js                # 主入口文件
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── Dockerfile             # Docker 镜像
├── start.bat              # Windows 启动脚本
├── start.sh               # Linux 启动脚本
└── README.md              # 项目文档
```

## 🔧 核心功能

### 1. 爬虫基类 (BaseScraper)

提供通用的爬虫功能，包括：
- 浏览器管理和反检测
- 错误处理和重试机制
- 页面导航和元素提取
- 资源清理

### 2. 金价爬虫 (GoldPriceScraper)

专门用于爬取 eastmoney.com 的金价数据：
- 多选择器支持，提高成功率
- 市场信息提取（涨跌幅、更新时间等）
- 数据验证和格式化

### 3. 数据库操作 (SupabaseDatabase)

封装 Supabase 操作：
- 数据插入和批量插入
- 历史数据查询
- 数据统计和分析
- 连接测试和错误处理

### 4. 任务调度 (TaskScheduler)

管理定时任务：
- Cron 表达式支持
- 任务生命周期管理
- 错误监控和日志记录
- 手动执行支持

## 💡 使用示例

### 基础使用

```typescript
import { GoldPriceScraper } from "./scrapers/gold-price-scraper";

// 创建爬虫实例
const scraper = new GoldPriceScraper({
  headless: true,
  timeout: 30000,
  retryCount: 3,
});

// 执行爬取并保存
await scraper.scrapeAndSave();

// 获取历史数据
const history = await scraper.getHistoricalData(100);
```

### 定时任务

```typescript
import { taskScheduler } from "./scheduler/task-scheduler";

// 添加每小时执行的任务
taskScheduler.addTask(
  "gold-scraper",
  {
    cronExpression: "0 * * * *",
    timezone: "Asia/Shanghai",
    immediate: true,
  },
  async () => {
    await scraper.scrapeAndSave();
  }
);

// 启动任务
taskScheduler.startAllTasks();
```

## 🐳 部署方案

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -t gold-scraper .

# 运行容器
docker run -d \
  --name gold-scraper \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  gold-scraper
```

### Linux 服务器部署

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装项目依赖
npm install --production
npx playwright install-deps chromium

# 编译和启动
npm run build
npm start
```

## 🔧 配置说明

### 环境变量

| 变量名                | 必需 | 默认值        | 说明                 |
| --------------------- | ---- | ------------- | -------------------- |
| `SUPABASE_URL`        | ✅   | -             | Supabase 项目 URL    |
| `SUPABASE_ANON_KEY`   | ✅   | -             | Supabase 匿名密钥    |
| `SCRAPER_HEADLESS`    | ❌   | `true`        | 是否无头模式运行     |
| `SCRAPER_TIMEOUT`     | ❌   | `30000`       | 爬虫超时时间(毫秒)   |
| `SCRAPER_RETRY_COUNT` | ❌   | `3`           | 重试次数             |
| `GOLD_PRICE_SCHEDULE` | ❌   | `0 * * * *`   | 定时任务 Cron 表达式 |
| `ENABLE_API`          | ❌   | `false`       | 是否启用 API 服务器  |
| `API_PORT`            | ❌   | `3000`        | API 服务器端口       |
| `LOG_LEVEL`           | ❌   | `info`        | 日志级别             |

### Cron 表达式示例

```bash
# 每分钟执行
* * * * *

# 每小时执行
0 * * * *

# 每天上午9点执行
0 9 * * *

# 每周一上午9点执行
0 9 * * 1

# 工作日每小时执行
0 * * * 1-5
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

### 前端界面

访问 `http://localhost:3000/index.html` 查看金价图表界面。

功能特性：
- 📈 实时金价图表
- 🕐 多时间段查看（24小时/7天/30天/全部）
- 📊 价格统计信息
- 🔄 自动刷新
- 📱 响应式设计

## 🛠️ 扩展开发

### 添加新的爬虫

```typescript
import { BaseScraper } from './core/base-scraper';

class CustomScraper extends BaseScraper<CustomData> {
  protected async performScrape(): Promise<CustomData> {
    const page = await this.createPage();

    // 实现你的爬取逻辑
    await this.navigateToPage(page, "https://example.com");
    const data = await this.getElementText(page, ".price");

    return {
      price: parseFloat(data),
      created_at: new Date().toISOString(),
      source: this.getSourceName(),
    };
  }

  public getSourceName(): string {
    return "example.com";
  }
}
```

## ❓ 常见问题

### Q1: 如何获取 Supabase 配置？

**A:**
1. 访问 [supabase.com](https://supabase.com) 创建项目
2. 在项目设置 → API 中找到：
   - Project URL (SUPABASE_URL)
   - anon public key (SUPABASE_ANON_KEY)

### Q2: 爬虫无法获取数据怎么办？

**A:**
```bash
# 1. 测试网络连接
curl https://quote.eastmoney.com/globalfuture/GC00Y.html

# 2. 运行诊断测试
npm run test:scraper

# 3. 查看详细日志
tail -f logs/error.log
```

### Q3: 数据库连接失败？

**A:**
1. 检查 `.env` 文件中的 Supabase 配置
2. 确认网络可以访问 Supabase
3. 验证 API Key 权限

### Q4: 定时任务不执行？

**A:**
1. 检查 Cron 表达式格式：`0 * * * *` (每小时)
2. 确认程序正常运行
3. 查看任务状态日志

### Q5: 前端页面无法显示数据？

**A:**
1. 确保启用了 API 服务器：`npm run dev:api`
2. 检查浏览器控制台错误
3. 验证 Supabase 数据表是否有数据

## 🔧 故障排除

### 启动失败

```bash
# 检查 Node.js 版本
node --version  # 需要 18+

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新安装 Playwright
npx playwright install chromium
```

### 权限问题 (Linux/macOS)

```bash
# 给脚本执行权限
chmod +x start.sh

# 创建日志目录
mkdir -p logs data
```

## 🎯 总结

### 项目优势

- ✅ **开发效率高** - 前端工程师零学习成本
- ✅ **维护成本低** - 统一技术栈，易于维护
- ✅ **扩展性强** - 模块化设计，易于扩展
- ✅ **稳定可靠** - 完善的错误处理和监控
- ✅ **部署灵活** - 支持多种部署方式
- ✅ **文档完善** - 详细的使用说明和示例

### 适用场景

- 🎯 金融数据监控
- 📊 价格趋势分析
- 🔄 定时数据采集
- 📈 数据可视化展示
- 🚀 快速原型开发

这个方案让你能够快速构建稳定的爬虫系统，专注于业务逻辑而不是技术细节。代码结构清晰，易于理解和维护，完全满足个人开发者的需求！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请提交 Issue 或联系开发者。
