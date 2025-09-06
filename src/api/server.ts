/**
 * 可选的 API 服务器
 * 提供 RESTful API 接口访问金价数据
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoldPriceScraper } from '../scrapers/gold-price-scraper';
import { logger } from '../utils/logger';

const app = express();
const PORT = process.env.API_PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// 创建爬虫实例
const goldScraper = new GoldPriceScraper();

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 获取最新金价
app.get('/api/gold/latest', async (req, res) => {
  try {
    const data = await goldScraper.getHistoricalData(1);
    
    if (data.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: '暂无金价数据'
      });
    }
    
    res.json({
      success: true,
      data: data[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取最新金价失败', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '获取数据失败'
    });
  }
});

// 获取历史金价数据
app.get('/api/gold/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const data = await goldScraper.getHistoricalData(limit);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取历史金价失败', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '获取历史数据失败'
    });
  }
});

// 按日期范围获取数据
app.get('/api/gold/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        error: 'Bad request',
        message: '请提供 start 和 end 参数'
      });
    }
    
    // 这里需要扩展 SupabaseDatabase 类来支持日期范围查询
    // 暂时返回错误信息
    res.status(501).json({
      error: 'Not implemented',
      message: '日期范围查询功能待实现'
    });
    
  } catch (error) {
    logger.error('按日期范围获取数据失败', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '获取数据失败'
    });
  }
});

// 手动触发爬取
app.post('/api/gold/scrape', async (req, res) => {
  try {
    const success = await goldScraper.scrapeAndSave();
    
    if (success) {
      res.json({
        success: true,
        message: '爬取任务执行成功',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '爬取任务执行失败'
      });
    }
    
  } catch (error) {
    logger.error('手动爬取失败', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '爬取任务异常'
    });
  }
});

// 获取系统状态
app.get('/api/status', async (req, res) => {
  try {
    const dbConnected = await goldScraper.testDatabaseConnection();
    const latestData = await goldScraper.getHistoricalData(1);
    
    res.json({
      success: true,
      status: {
        database: dbConnected ? 'connected' : 'disconnected',
        lastUpdate: latestData.length > 0 ? latestData[0].timestamp : null,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取系统状态失败', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '获取系统状态失败'
    });
  }
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API 错误', err);
  res.status(500).json({
    error: 'Internal server error',
    message: '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: '接口不存在'
  });
});

// 启动服务器
export function startApiServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info(`API 服务器启动成功，端口: ${PORT}`);
      console.log(`🌐 API 服务器运行在: http://localhost:${PORT}`);
      console.log(`📊 前端界面: http://localhost:${PORT}/index.html`);
      console.log(`🔍 API 文档:`);
      console.log(`   GET  /api/gold/latest    - 获取最新金价`);
      console.log(`   GET  /api/gold/history   - 获取历史数据`);
      console.log(`   POST /api/gold/scrape    - 手动触发爬取`);
      console.log(`   GET  /api/status         - 系统状态`);
      console.log(`   GET  /health             - 健康检查`);
      resolve();
    });
  });
}

export default app;
