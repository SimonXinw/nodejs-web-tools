import * as dotenv from "dotenv";

import { GoldPriceScraper } from "./scrapers/gold-price-scraper";

import { taskScheduler } from "./scheduler/task-scheduler";

import { logger } from "./utils/logger";

import { startApiServer } from "./api/server";

import fs from "fs";

// 加载环境变量
dotenv.config();

/**
 * 主程序类
 */
class Application {
  private goldScraper: GoldPriceScraper;

  constructor() {
    const headless = process.env.SCRAPER_HEADLESS === "true";

    const timeout = parseInt(process.env.SCRAPER_TIMEOUT || "30000");
    
    const retryCount = parseInt(process.env.SCRAPER_RETRY_COUNT || "3");
    
    const executablePath = process.env.CHROME_EXECUTABLE_PATH;
    
    const useSystemBrowser = process.env.SCRAPER_USE_SYSTEM_BROWSER === "true";

    this.goldScraper = new GoldPriceScraper({
      headless,
      timeout,
      retryCount,
      executablePath,
      useSystemBrowser,
    });
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    try {
      logger.info("正在初始化金价爬虫应用程序...");

      // 显示运行模式
      const useMultiSource = process.env.SCRAPER_MODE !== "single";
      logger.info(`🔧 运行模式: ${useMultiSource ? "多数据源模式" : "单数据源模式"}`);
      
      if (useMultiSource) {
        logger.info("📊 将爬取: 纽约黄金(ny_price)、XAU现货黄金(xau_price)、沪金价格(sh_price)");
      } else {
        logger.info("📊 将爬取: 东方财富纽约黄金价格");
      }

      // 测试数据库连接
      const dbConnected = await this.goldScraper.testDatabaseConnection();

      if (!dbConnected) {
        throw new Error("数据库连接失败，请检查 Supabase 配置");
      }

      // 设置定时任务
      this.setupScheduledTasks();

      // 设置优雅关闭
      this.setupGracefulShutdown();

      logger.info("应用程序初始化完成");
    } catch (error) {
      logger.error("应用程序初始化失败", error);

      process.exit(1);
    }
  }

  /**
   * 设置定时任务
   */
  private setupScheduledTasks(): void {
    const cronExpression = process.env.GOLD_PRICE_SCHEDULE || "0 * * * *"; // 默认每小时执行一次
    
    // 根据环境变量决定使用单数据源还是多数据源模式
    const useMultiSource = process.env.SCRAPER_MODE !== "single"; // 默认使用多数据源模式

    // 添加金价爬取任务
    taskScheduler.addTask(
      "gold-price-scraper",

      {
        cronExpression,

        timezone: "Asia/Shanghai",

        immediate: true, // 启动时立即执行一次
      },

      async () => {
        if (useMultiSource) {
          // 确保配置了多数据源
          this.goldScraper.setupMultiSourceMode();
          await this.goldScraper.scrapeMultiSourceAndSave();
        } else {
          await this.goldScraper.scrapeAndSave();
        }
      }
    );

    // 启动所有任务
    taskScheduler.startAllTasks();

    logger.info("定时任务设置完成");
  }

  /**
   * 设置优雅关闭
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`收到 ${signal} 信号，正在优雅关闭应用程序...`);

      // 停止所有定时任务
      taskScheduler.cleanup();

      logger.info("应用程序已关闭");

      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  /**
   * 启动应用程序
   */
  async start(): Promise<void> {
    await this.initialize();

    // 检查是否启动 API 服务器
    const enableApi =
      process.env.ENABLE_API === "true" || process.argv.includes("--api");

    if (enableApi) {
      try {
        await startApiServer();

        logger.info("API 服务器已启动");
      } catch (error) {
        logger.error("API 服务器启动失败", error);
      }
    }

    logger.info("金价爬虫应用程序已启动");

    logger.info("定时任务状态:", taskScheduler.getAllTasksInfo());

    // 保持程序运行
    setInterval(() => {
      // 定期输出状态信息
      const tasksInfo = taskScheduler.getAllTasksInfo();

      logger.debug("当前任务状态:", tasksInfo);
    }, 60000); // 每分钟输出一次状态
  }

  /**
   * 手动执行金价爬取
   */
  async manualScrape(): Promise<void> {
    logger.info("手动执行金价爬取...");

    // 根据环境变量决定使用单数据源还是多数据源模式
    const useMultiSource = process.env.SCRAPER_MODE !== "single"; // 默认使用多数据源模式
    
    let success: boolean;
    
    if (useMultiSource) {
      // 确保配置了多数据源
      this.goldScraper.setupMultiSourceMode();
      success = await this.goldScraper.scrapeMultiSourceAndSave();
    } else {
      success = await this.goldScraper.scrapeAndSave();
    }

    if (success) {
      logger.info("手动执行脚本执行完毕！");
    } else {
      logger.error("手动爬取失败");
    }
  }

  /**
   * 获取历史数据
   */
  async getHistoricalData(limit: number = 100) {
    return await this.goldScraper.getHistoricalData(limit);
  }
}

// 更加规范的做法是将主流程包裹在一个 async 函数中，然后立即执行（IIFE），这样可以更好地处理异步流程和异常，避免多次 process.exit(0) 导致的潜在问题。
(async () => {
  // 创建应用实例
  const app = new Application();

  // 处理命令行参数
  const args = process.argv.slice(2);

  // 手动执行模式
  if (args.includes("--manual") || args.includes("-m")) {
    console.log("手动执行模式 >>>>>>>>", process.env);
    try {
      await app.manualScrape();
      process.exit(0);
    } catch (error) {
      logger.error("手动执行失败", error);
      process.exit(1);
    }
    return; // 理论上不会执行到这里
  }

  // 查看历史数据
  if (args.includes("--history") || args.includes("-h")) {
    const limit = parseInt(
      args[args.indexOf("--history") + 1] ||
        args[args.indexOf("-h") + 1] ||
        "10"
    );
    try {
      const data = await app.getHistoricalData(limit);
      console.log("历史数据:", JSON.stringify(data, null, 2));
      process.exit(0);
    } catch (error) {
      logger.error("获取历史数据失败", error);
      process.exit(1);
    }
    return;
  }

  // 正常启动模式
  try {
    await app.start();
  } catch (error) {
    logger.error("应用程序启动失败", error);
    process.exit(1);
  }
})();

export default Application;
