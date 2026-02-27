import * as dotenv from "dotenv";

import readline from "readline";

import { taskScheduler } from "./scheduler/task-scheduler";

import { logger } from "./utils/logger";

import { startApiServer } from "./api/server";

import {
  scraperRegistry,
  findScraper,
  ScraperAdapter,
} from "./scrapers/registry";

import { ScraperConfig } from "./types";

dotenv.config();

/**
 * 主程序类 - 通用爬虫应用框架，不与任何具体爬虫耦合
 */
class Application {
  private scraperAdapter: ScraperAdapter;

  private scraperKey: string;

  constructor(scraperKey: string) {
    this.scraperKey = scraperKey;

    const entry = findScraper(scraperKey);

    if (!entry) {
      const available = scraperRegistry.map((e) => e.key).join(", ");

      throw new Error(`未找到爬虫 "${scraperKey}"，可用爬虫: ${available}`);
    }

    const config: Partial<ScraperConfig> = {
      headless: process.env.SCRAPER_HEADLESS === "true",

      timeout: parseInt(process.env.SCRAPER_TIMEOUT || "30000"),

      retryCount: parseInt(process.env.SCRAPER_RETRY_COUNT || "3"),

      executablePath: process.env.CHROME_EXECUTABLE_PATH,

      useSystemBrowser: process.env.SCRAPER_USE_SYSTEM_BROWSER === "true",
    };

    this.scraperAdapter = entry.create(config);
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`正在初始化爬虫: ${this.scraperKey}...`);

      const dbConnected = await this.scraperAdapter.testDatabaseConnection();

      if (!dbConnected) {
        throw new Error("数据库连接失败，请检查 Supabase 配置");
      }

      this.setupScheduledTasks();

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
    const entry = findScraper(this.scraperKey)!;

    const cronExpression = entry.defaultSchedule;

    taskScheduler.addTask(
      this.scraperKey,

      {
        cronExpression,

        timezone: "Asia/Shanghai",

        immediate: true,
      },

      async () => {
        await this.scraperAdapter.runTask();
      }
    );

    taskScheduler.startAllTasks();

    logger.info("定时任务设置完成");
  }

  /**
   * 设置优雅关闭
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`收到 ${signal} 信号，正在优雅关闭应用程序...`);

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

    logger.info(`爬虫应用程序已启动: ${this.scraperKey}`);

    logger.info("定时任务状态:", taskScheduler.getAllTasksInfo());

    setInterval(() => {
      const tasksInfo = taskScheduler.getAllTasksInfo();

      logger.debug("当前任务状态:", tasksInfo);
    }, 60000);
  }

  /**
   * 手动执行爬取
   */
  async manualScrape(): Promise<void> {
    logger.info(`手动执行爬取: ${this.scraperKey}...`);

    const success = await this.scraperAdapter.runTask();

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
    return await this.scraperAdapter.getHistoricalData(limit);
  }
}

/**
 * 展示爬虫选择菜单，返回用户选择的爬虫 key
 */
const promptScraperSelection = (): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n========== 请选择要启动的爬虫 ==========");

    scraperRegistry.forEach((entry, index) => {
      console.log(
        `  ${index + 1}. [${entry.key}]  ${entry.name}`
      );
      console.log(`     ${entry.description}`);
    });

    console.log("==========================================\n");

    rl.question("请输入序号 (默认 1，直接回车): ", (answer) => {
      rl.close();

      const trimmed = answer.trim();

      if (!trimmed) {
        resolve(scraperRegistry[0].key);

        return;
      }

      const index = parseInt(trimmed) - 1;

      if (index >= 0 && index < scraperRegistry.length) {
        resolve(scraperRegistry[index].key);
      } else {
        console.log(`无效输入，使用默认爬虫: ${scraperRegistry[0].key}`);

        resolve(scraperRegistry[0].key);
      }
    });
  });
};

/**
 * 从命令行参数中解析爬虫 key
 * 支持: --scraper <key> 或 -s <key>
 */
const parseScraperKey = (args: string[]): string | null => {
  const longIndex = args.indexOf("--scraper");

  const shortIndex = args.indexOf("-s");

  if (longIndex !== -1 && args[longIndex + 1]) {
    return args[longIndex + 1];
  }

  if (shortIndex !== -1 && args[shortIndex + 1]) {
    return args[shortIndex + 1];
  }

  return null;
};

/**
 * 解析历史数据条数参数
 */
const parseHistoryLimit = (args: string[]): number => {
  const longIndex = args.indexOf("--history");

  const shortIndex = args.indexOf("-h");

  return parseInt(
    args[longIndex + 1] || args[shortIndex + 1] || "10"
  );
};

/**
 * 确保已知爬虫 key，若未指定则在注册表只有一个时自动选择，否则弹出交互菜单
 */
const resolveScraperKey = async (args: string[]): Promise<string> => {
  const key = parseScraperKey(args);

  if (key) return key;

  if (scraperRegistry.length === 1) return scraperRegistry[0].key;

  return await promptScraperSelection();
};

(async () => {
  const args = process.argv.slice(2);

  // 手动执行模式
  if (args.includes("--manual") || args.includes("-m")) {
    const scraperKey = await resolveScraperKey(args);

    const app = new Application(scraperKey);

    console.log("手动执行模式 >>>>>>>>", process.env);

    try {
      await app.manualScrape();

      process.exit(0);
    } catch (error) {
      logger.error("手动执行失败", error);

      process.exit(1);
    }

    return;
  }

  // 查看历史数据模式
  if (args.includes("--history") || args.includes("-h")) {
    const scraperKey = await resolveScraperKey(args);

    const limit = parseHistoryLimit(args);

    const app = new Application(scraperKey);

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
  const scraperKey = await resolveScraperKey(args);

  const app = new Application(scraperKey);

  try {
    await app.start();
  } catch (error) {
    logger.error("应用程序启动失败", error);

    process.exit(1);
  }
})();

export default Application;
