import { Page } from "playwright";
import { BaseScraper } from "../core/base-scraper";
import { SupabaseDatabase } from "../database/supabase-client";
import { GoldPriceData, ScraperConfig } from "../types";
import { formatTimestamp, parsePrice } from "../utils/helpers";
import { logger } from "../utils/logger";

/**
 * 金价爬虫类 - 专门爬取 investing.com 的金价数据
 */
export class GoldPriceScraper extends BaseScraper<GoldPriceData> {
  private database: SupabaseDatabase;

  private readonly targetUrl =
    "https://quote.eastmoney.com/globalfuture/GC00Y.html";

  constructor(config: Partial<ScraperConfig> = {}) {
    // 增强默认配置，提供更好的调试和反反爬能力
    const enhancedConfig = {
      headless: config.headless ?? true, // 默认启用无头浏览器模式，避免弹窗
      timeout: config.timeout ?? 30000, // 增加超时时间到60秒
      retryCount: config.retryCount ?? 2, // 减少重试次数便于调试
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      ...config, // 允许外部配置覆盖
    };

    super(enhancedConfig);
    this.database = new SupabaseDatabase("gold_price");
  }

  /**
   * 增强的页面访问方法
   */
  protected async navigateToPageEnhanced(
    page: Page,
    url: string
  ): Promise<void> {
    logger.info(`🌐 开始访问页面: ${url}`);

    try {
      // 设置额外的请求头来模拟真实浏览器
      await page.setExtraHTTPHeaders({
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      });

      // 随机延迟，模拟人类行为
      await page.waitForTimeout(Math.random() * 2000 + 1000);

      // 访问页面，使用多种等待策略
      await page.goto(url, {
        waitUntil: "domcontentloaded", // 先等DOM加载完成
        timeout: this.config.timeout,
      });

      // 额外等待，确保页面完全加载
      await page.waitForTimeout(3000);

      logger.info(`✅ 页面访问成功: ${url}`);
    } catch (error: any) {
      logger.error(`❌ 页面访问失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 更智能的元素查找策略
   */
  private async findPriceElementSmart(
    page: Page
  ): Promise<{ text: string; selector: string } | null> {
    // 多种选择器策略
    const selectorStrategies = [
      {
        name: "页面中心巨大价格选择器",
        selector:
          "#app .zsquote3l .quote3l_l .quote_quotenums .zxj > span > span",
      },
    ];

    for (const strategy of selectorStrategies) {
      try {
        logger.info(`🔍 尝试选择器: ${strategy.name}`);

        const element = await page.$(strategy.selector);

        if (!element) continue;

        const text = await element.textContent();

        if (!(text && text.trim())) continue;

        logger.info(`✅ 选择器 "${strategy.name}" 成功，找到文本: ${text}`);

        return { text: text.trim(), selector: strategy.selector };
      } catch (error: any) {
        logger.warn(`⚠️ 选择器 "${strategy.name}" 失败:`, error.message);
      }
    }

    return null;
  }

  /**
   * 页面内容分析
   */
  private async analyzePageContent(page: Page): Promise<void> {
    try {
      logger.info("🔎 开始分析页面内容...");

      // 获取页面标题
      const title = await page.title();

      logger.info(`📄 页面标题: ${title}`);

      // 检查页面是否有错误信息
      const errorMessages = await page.$$eval("*", (elements) => {
        const errors: string[] = [];
        elements.forEach((el) => {
          const text = el.textContent?.toLowerCase() || "";
          if (
            text.includes("error") ||
            text.includes("错误") ||
            text.includes("access denied") ||
            text.includes("访问被拒绝") ||
            text.includes("blocked") ||
            text.includes("被阻止")
          ) {
            errors.push(el.textContent || "");
          }
        });
        return errors;
      });

      if (errorMessages.length > 0) {
        logger.warn("⚠️ 页面可能包含错误信息:", errorMessages);
      }
    } catch (error: any) {
      logger.warn("⚠️ 页面内容分析失败:", error.message);
    }
  }

  /**
   * 执行具体的金价爬取逻辑 - 增强版
   */
  // protected 是 TypeScript/JavaScript 中的访问修饰符，表示该方法只能在当前类及其子类中访问，外部无法直接调用
  protected async performScrape(): Promise<GoldPriceData> {
    const page = await this.createPage();

    try {
      // 使用增强的页面访问方法
      await this.navigateToPageEnhanced(page, this.targetUrl);

      // 分析页面内容
      await this.analyzePageContent(page);

      // 智能查找价格元素
      const priceResult = await this.findPriceElementSmart(page);

      if (!priceResult) {
        // 如果找不到元素，截图保存用于调试
        const screenshotPath = `debug-no-element-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.error(`❌ 无法找到金价元素，已保存截图: ${screenshotPath}`);
        throw new Error("无法找到金价元素");
      }

      // 解析价格
      const price = parsePrice(priceResult.text);
      if (price <= 0) {
        throw new Error(`解析的金价无效: ${priceResult.text} -> ${price}`);
      }

      const goldPriceData: GoldPriceData = {
        price: price,
        created_at: formatTimestamp(),
        source: this.targetUrl,
        currency: "USD",
        time_period: "1d",
      };

      logger.info(
        `🎉 成功爬取金价数据: $${price} (使用选择器: ${priceResult.selector})`
      );
      return goldPriceData;
    } catch (error: any) {
      logger.error("金价爬取过程中发生错误:", error);
      // 在出错时也截图用于调试
      try {
        const errorScreenshotPath = `debug-error-${Date.now()}.png`;
        await page.screenshot({ path: errorScreenshotPath, fullPage: true });
        logger.info(`已保存错误截图: ${errorScreenshotPath}`);
      } catch (screenshotError) {
        logger.warn("保存错误截图失败:", screenshotError);
      }
      throw error;
    } finally {
      // 确保页面被正确关闭
      try {
        await page.close();
        logger.debug("页面已关闭");
      } catch (closeError) {
        logger.warn("关闭页面时出现错误:", closeError);
      }
    }
  }

  /**
   * 保存数据到数据库
   */
  public async saveToDatabase(data: GoldPriceData): Promise<boolean> {
    const record = {
      price: data.price,
      created_at: data.created_at,
      source: data.source,
      currency: data.currency,
      time_period: data.time_period,
    };

    return await this.database.insertRecord(record);
  }

  /**
   * 执行完整的爬取和保存流程
   */
  public async scrapeAndSave(): Promise<boolean> {
    try {
      logger.info("开始执行金价爬取任务...");

      const data = await this.scrape();
      if (!data) {
        logger.error("爬取数据失败");
        return false;
      }

      const saved = await this.saveToDatabase(data);
      if (saved) {
        logger.info(`金价爬取脚本执行完成！: $${data.price}`);
        return true;
      } else {
        logger.error("保存数据到数据库失败");
        return false;
      }
    } catch (error) {
      logger.error("金价爬取任务异常", error);
      return false;
    }
  }

  /**
   * 调试模式 - 启用有头浏览器和详细日志
   */
  static createDebugInstance(): GoldPriceScraper {
    return new GoldPriceScraper({
      headless: false,
      timeout: 90000, // 90秒超时
      retryCount: 1, // 调试时只重试1次
    });
  }

  /**
   * 测试数据库连接
   */
  public async testDatabaseConnection(): Promise<boolean> {
    return await this.database.testConnection();
  }

  /**
   * 获取历史数据
   */
  public async getHistoricalData(limit: number = 100) {
    return await this.database.getLatestRecords(limit);
  }

  /**
   * 获取数据源名称
   */
  public getSourceName(): string {
    return "eastmoney.com";
  }
}

// ==================== 调试入口 ====================
// 如果直接运行此文件，则启动调试模式
if (require.main === module) {
  async function debugRun() {
    console.log("🐛 启动金价爬虫调试模式...");
    console.log("💡 浏览器将以有头模式启动，你可以观察整个爬取过程");
    console.log("⏳ 请耐心等待...\n");

    // 创建调试实例
    const scraper = GoldPriceScraper.createDebugInstance();

    try {
      // 执行单次爬取
      const success = await scraper.scrapeAndSave();

      if (success) {
        console.log("\n🎉 调试完成！爬取成功！");

        // 显示最新的几条数据
        console.log("\n📊 最新爬取的数据：");
        const recentData = await scraper.getHistoricalData(100);
        console.table(recentData);
      } else {
        console.log("\n❌ 调试完成，但爬取失败！");
        console.log("💡 请检查上面的日志信息和保存的截图");
      }
    } catch (error: any) {
      console.error("\n💥 调试过程中发生错误：");
      console.error(error.message);

      if (error.name === "TimeoutError") {
        console.log("\n🕐 TimeoutError 分析：");
        console.log("- 可能原因1：网站加载速度慢，需要更长等待时间");
        console.log("- 可能原因2：网站检测到自动化工具，拒绝访问");
        console.log("- 可能原因3：网络连接问题");
        console.log("- 可能原因4：页面结构发生变化");
        console.log("\n💡 建议：查看保存的调试截图来分析具体问题");
      }
    }

    console.log("\n🔚 调试会话结束");
    process.exit(0);
  }

  // 启动调试
  debugRun().catch((error) => {
    console.error("💥 调试启动失败：", error);
    process.exit(1);
  });
}
