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
    super(config);
    this.database = new SupabaseDatabase("gold_prices");
  }

  /**
   * 执行具体的金价爬取逻辑
   */
  // protected 是 TypeScript/JavaScript 中的访问修饰符，表示该方法只能在当前类及其子类中访问，外部无法直接调用
  protected async performScrape(): Promise<GoldPriceData> {
    const page = await this.createPage();

    try {
      // 访问金价页面
      await this.navigateToPage(page, this.targetUrl);

      // 等待页面网络空闲（networkidle 表示网络连接数小于等于2，常用于判断页面资源加载完毕）
      await page.waitForLoadState("networkidle");

      // 尝试多个可能的价格选择器
      const priceSelectors = [
        "#app .layout_sm_main .layout_m_ms_s .sider_brief tbody tr td .price_up",
        "#app .layout_sm_main .layout_m_ms_s .sider_brief tbody tr td .price_down",
      ];

      let priceText: string | null = null;
      let usedSelector = "";

      // 依次尝试不同的选择器
      for (const selector of priceSelectors) {
        priceText = await this.getElementText(page, selector);
        if (priceText) {
          usedSelector = selector;
          logger.info(`使用选择器 ${selector} 成功获取价格: ${priceText}`);
          break;
        }
      }

      if (!priceText) {
        // 如果所有选择器都失败，尝试截图调试
        await page.screenshot({ path: `debug-${Date.now()}.png` });
        throw new Error("无法找到金价元素");
      }

      // 解析价格
      const price = parsePrice(priceText);
      if (price <= 0) {
        throw new Error(`解析的金价无效: ${priceText} -> ${price}`);
      }

      // 获取额外信息（可选）
      const marketInfo = await this.getMarketInfo(page);

      const goldPriceData: GoldPriceData = {
        value: price,
        timestamp: formatTimestamp(),
        source: this.getSourceName(),
        currency: "USD",
        market: "COMEX",
        metadata: {
          selector: usedSelector,
          rawText: priceText,
          ...marketInfo,
        },
      };

      logger.info(`成功爬取金价数据: $${price}`);
      return goldPriceData;
    } catch (error) {
      logger.error("金价爬取失败", error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * 获取市场附加信息
   */
  private async getMarketInfo(page: Page): Promise<Record<string, any>> {
    const marketInfo: Record<string, any> = {};

    try {
      // 尝试获取涨跌幅
      const changeSelectors = [
        '[data-test="instrument-price-change"]',
        ".instrument-price_change__JbFW4",
      ];

      for (const selector of changeSelectors) {
        const changeText = await this.getElementText(page, selector);
        if (changeText) {
          marketInfo.priceChange = changeText.trim();
          break;
        }
      }

      // 尝试获取涨跌百分比
      const percentSelectors = [
        '[data-test="instrument-price-change-percent"]',
        ".instrument-price_changePercent__qyGUr",
      ];

      for (const selector of percentSelectors) {
        const percentText = await this.getElementText(page, selector);
        if (percentText) {
          marketInfo.changePercent = percentText.trim();
          break;
        }
      }

      // 获取更新时间
      const timeSelectors = [
        ".instrument-metadata_time__L_-5B",
        ".text-xs.text-gray-500",
      ];

      for (const selector of timeSelectors) {
        const timeText = await this.getElementText(page, selector);
        if (timeText) {
          marketInfo.updateTime = timeText.trim();
          break;
        }
      }
    } catch (error) {
      logger.warn("获取市场附加信息失败", error);
    }

    return marketInfo;
  }

  /**
   * 保存数据到数据库
   */
  public async saveToDatabase(data: GoldPriceData): Promise<boolean> {
    const record = {
      price: data.value,
      timestamp: data.timestamp,
      source: data.source,
      currency: data.currency,
      market: data.market,
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
        logger.info(`金价爬取任务完成: $${data.value}`);
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
   * 获取数据源名称
   */
  public getSourceName(): string {
    return "investing.com";
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
}
