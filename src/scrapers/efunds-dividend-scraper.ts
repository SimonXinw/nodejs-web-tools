import { Page } from "playwright";

import { BaseScraper } from "../core/base-scraper";

import {
  EFundsDividendDatabase,
  YfdDividendInsert,
} from "../database/efunds-dividend-database";

import { ScraperConfig } from "../types";

import { formatTimestamp } from "../utils/helpers";

import { logger } from "../utils/logger";

const TARGET_URL = "https://www.efunds.com.cn/fund/515180.shtml";

const FUND_CODE = "515180";

const AASTOCKS_WARMUP_URL =
  "https://www.aastocks.com/tc/cnhk/quote/quick-quote.aspx";

const AASTOCKS_TARGET_URL =
  `https://www.aastocks.com/tc/cnhk/analysis/company-fundamental/` +
  `company-information?shsymbol=${FUND_CODE}`;

/** 轮换 User-Agent 池，降低被识别风险 */
const USER_AGENT_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
];

/**
 * 爬虫内部结果类型：YfdDividendInsert + price（满足 BaseScraper 的 ScrapedData 约定）
 */
type EFundsScrapeResult = YfdDividendInsert & { price: number };

/**
 * aastocks 场内价格数据
 */
export interface MarketPriceData {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  rawChange: string;
}


/**
 * 解析净值文本为 float，去除 %、空格等干扰字符
 */
const parseNetValue = (text: string): number => {
  const cleaned = text.replace(/[%,\s]/g, "").trim();

  const value = parseFloat(cleaned);

  return isNaN(value) ? 0 : value;
};

/**
 * 易方达中证红利ETF净值爬虫
 * 爬取 https://www.efunds.com.cn/fund/515180.shtml 页面的：
 *   - 单位净值 (#net-today)
 *   - 累计净值 (#net-totsl)
 *   - 日涨跌幅 (#net-scale)
 * 并保存到 yfd_dividend 表
 */
export class EFundsDividendScraper extends BaseScraper<EFundsScrapeResult> {
  private database: EFundsDividendDatabase;

  constructor(config: Partial<ScraperConfig> = {}) {
    super({
      headless: config.headless ?? true,

      timeout: config.timeout ?? 30000,

      retryCount: config.retryCount ?? 2,

      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

      viewport: config.viewport ?? { width: 1920, height: 1080 },

      ...config,
    });

    this.database = new EFundsDividendDatabase();
  }

  /**
   * 访问页面，携带模拟真实浏览器的请求头
   */
  private async navigatePage(page: Page): Promise<void> {
    logger.info(`🌐 开始访问页面: ${TARGET_URL}`);

    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Sec-Ch-Ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    });

    await page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: this.config.timeout,
    });

    logger.info("✅ 页面访问成功");
  }

  /**
   * 等待并读取指定 id 元素的文本内容
   */
  private async readElementText(page: Page, id: string): Promise<string> {
    return this.readElementBySelectorText(page, `#${id}`);
  }

  /**
   * 等待并读取任意 CSS selector 元素的文本内容
   */
  private async readElementBySelectorText(
    page: Page,
    selector: string
  ): Promise<string> {
    try {
      await page.waitForSelector(selector, {
        timeout: 10000,
        state: "attached",
      });

      const text = await page.$eval(selector, (el) => el.textContent || "");

      return text.trim();
    } catch (error: any) {
      logger.warn(`⚠️ 读取元素 ${selector} 失败: ${error.message}`);

      return "";
    }
  }

  /**
   * 实现 BaseScraper 的抽象方法 - 执行页面爬取
   */
  protected async performScrape(): Promise<EFundsScrapeResult> {
    const page = await this.createPage();

    try {
      await this.navigatePage(page);

      const netPriceText = await this.readElementText(page, "net-today");

      const netTotslText = await this.readElementText(page, "net-totsl");

      const netScaleText = await this.readElementText(page, "net-scale");

      const navDateText = await this.readElementBySelectorText(
        page,
        ".nav-update"
      );

      logger.info(
        `📊 原始数据 - 日期: "${navDateText}", 单位净值: "${netPriceText}", 累计净值: "${netTotslText}", 涨跌: "${netScaleText}"`
      );

      const netPrice = parseNetValue(netPriceText);

      const netTotsl = parseNetValue(netTotslText);

      const netScale = parseNetValue(netScaleText);

      if (netPrice <= 0) {
        const screenshotPath = `debug-efunds-${Date.now()}.png`;

        await page.screenshot({ path: screenshotPath, fullPage: true });

        throw new Error(
          `解析单位净值失败，原始文本: "${netPriceText}"，已保存截图: ${screenshotPath}`
        );
      }

      const result: EFundsScrapeResult = {
        price: netPrice,
        source: TARGET_URL,
        date: navDateText,
        net_price: netPrice,
        net_totsl: netTotsl,
        net_scale: netScale,
        adj_net_price: netPrice,
        created_at: formatTimestamp(),
      };

      logger.info(
        `🎉 易方达净值爬取成功 - 单位净值: ${netPrice}, 累计净值: ${netTotsl}, 涨跌: ${netScale}%`
      );

      return result;
    } catch (error: any) {
      logger.error("易方达净值爬取过程中发生错误:", error);

      try {
        const errorPath = `debug-efunds-error-${Date.now()}.png`;

        await page.screenshot({ path: errorPath, fullPage: true });

        logger.info(`已保存错误截图: ${errorPath}`);
      } catch {
        logger.warn("保存错误截图失败");
      }

      throw error;
    } finally {
      try {
        await page.close();
      } catch {
        logger.warn("关闭页面时出现错误");
      }
    }
  }

  /**
   * 从 HTML 字符串中提取指定 id 元素的文本内容
   */
  private extractTextById(html: string, id: string): string | null {
    const regex = new RegExp(`id=["']${id}["'][^>]*>([^<]*)<`);
    const match = html.match(regex);

    return match ? match[1].trim() : null;
  }

  /**
   * 解析涨跌文本，例如 "+0.015 (1.042%)" → { change, changePct }
   */
  private parseChangeText(text: string): {
    change: number | null;
    changePct: number | null;
  } {
    const match = text.match(/([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)/);

    if (match) {
      return {
        change: parseFloat(match[1]),
        changePct: parseFloat(match[2]),
      };
    }

    return { change: null, changePct: null };
  }

  /**
   * 方式一：直接 HTTP fetch 获取场内价格
   * 先访问热身页面复用 Cookie，再访问目标页面解析数据
   */
  private async fetchMarketPriceViaHttp(): Promise<MarketPriceData> {
    const userAgent =
      USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];

    const baseHeaders: Record<string, string> = {
      "User-Agent": userAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
    };

    // 热身请求，获取 Cookie
    logger.info("🌐 [HTTP] 热身请求中...");

    const warmupResp = await fetch(AASTOCKS_WARMUP_URL, {
      headers: baseHeaders,
    });

    const rawCookies = warmupResp.headers.getSetCookie
      ? warmupResp.headers.getSetCookie()
      : [];

    const cookieStr = rawCookies.map((c) => c.split(";")[0]).join("; ");

    // 正式请求
    const mainHeaders: Record<string, string> = {
      ...baseHeaders,
      Referer: AASTOCKS_WARMUP_URL,
      "Sec-Fetch-Site": "same-origin",
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    };

    logger.info("🌐 [HTTP] 请求目标页面...");

    const resp = await fetch(AASTOCKS_TARGET_URL, { headers: mainHeaders });

    if (!resp.ok) {
      throw new Error(`HTTP 请求失败: ${resp.status} ${resp.statusText}`);
    }

    const html = await resp.text();

    const priceText = this.extractTextById(html, "SQ_Last");
    const changeText = this.extractTextById(html, "SQ_Change");

    if (!priceText || !changeText) {
      throw new Error(
        `页面元素未找到 (SQ_Last=${priceText}, SQ_Change=${changeText})，可能被反爬`
      );
    }

    const price = parseFloat(priceText);

    if (isNaN(price) || price <= 0) {
      throw new Error(`价格解析失败，原始值: "${priceText}"`);
    }

    const { change, changePct } = this.parseChangeText(changeText);

    return {
      symbol: FUND_CODE,
      price,
      change,
      changePct,
      rawChange: changeText,
    };
  }

  /**
   * 方式二：Playwright 浏览器获取场内价格（降级备用）
   */
  private async fetchMarketPriceViaPlaywright(): Promise<MarketPriceData> {
    const page = await this.createPage();

    try {
      logger.info("🌐 [Playwright] 热身请求中...");

      await page.goto(AASTOCKS_WARMUP_URL, {
        waitUntil: "domcontentloaded",
        timeout: this.config.timeout,
      });

      logger.info("🌐 [Playwright] 请求目标页面...");

      await page.goto(AASTOCKS_TARGET_URL, {
        waitUntil: "domcontentloaded",
        timeout: this.config.timeout,
      });

      const priceText = await this.readElementBySelectorText(page, "#SQ_Last");
      const changeText = await this.readElementBySelectorText(
        page,
        "#SQ_Change"
      );

      if (!priceText) {
        const screenshotPath = `debug-aastocks-${Date.now()}.png`;

        await page.screenshot({ path: screenshotPath, fullPage: true });

        throw new Error(`SQ_Last 元素为空，已截图: ${screenshotPath}`);
      }

      const price = parseFloat(priceText);

      if (isNaN(price) || price <= 0) {
        throw new Error(`价格解析失败，原始值: "${priceText}"`);
      }

      const { change, changePct } = this.parseChangeText(changeText);

      return {
        symbol: FUND_CODE,
        price,
        change,
        changePct,
        rawChange: changeText,
      };
    } finally {
      try {
        await page.close();
      } catch {
        logger.warn("关闭 Playwright 页面时出现错误");
      }
    }
  }

  /**
   * 获取 ETF 场内实时价格
   * 按顺序尝试各种方式，成功立即返回，全部失败返回 null
   */
  public async fetchMarketPrice(): Promise<MarketPriceData | null> {
    logger.info("🔍 开始获取 515180 场内价格...");

    const strategies: Array<{
      name: string;
      fn: () => Promise<MarketPriceData>;
    }> = [
      { name: "HTTP", fn: () => this.fetchMarketPriceViaHttp() },
      { name: "Playwright", fn: () => this.fetchMarketPriceViaPlaywright() },
    ];

    for (const [index, { name, fn }] of strategies.entries()) {
      try {
        const result = await fn();

        logger.info(
          `✅ [${name}] 场内价格获取成功 - 价格: ${result.price}, 涨跌: ${result.rawChange}`
        );

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        const isLast = index === strategies.length - 1;

        if (isLast) {
          logger.error(`❌ [${name}] 失败: ${msg}，所有方式均已耗尽`);
        } else {
          logger.warn(`⚠️ [${name}] 失败: ${msg}，尝试下一种方式...`);
        }
      }
    }

    return null;
  }

  /**
   * 保存数据到 yfd_dividend 表
   */
  public async saveToDatabase(data: EFundsScrapeResult): Promise<boolean> {
    // 实时爬取场景：当日即为最新，前复权净值 = 单位净值（无历史分红调整）
    const record: YfdDividendInsert = {
      date: data.date,
      source: data.source,
      net_price: data.net_price,
      net_totsl: data.net_totsl,
      net_scale: data.net_scale,
      adj_net_price: data.net_price,
      created_at: data.created_at,
    };

    return await this.database.insertRecord(record);
  }

  /**
   * 执行完整的爬取 + 保存流程
   */
  public async scrapeAndSave(): Promise<boolean> {
    try {
      logger.info("🚀 开始执行易方达中证红利ETF净值爬取任务...");

      const data = await this.scrape();

      if (!data) {
        logger.error("爬取数据失败");

        return false;
      }

      const saved = await this.saveToDatabase(data);

      if (saved) {
        logger.info(
          `✅ 易方达净值爬取完成！单位净值: ${data.net_price}, 累计净值: ${data.net_totsl}, 涨跌: ${data.net_scale}%`
        );

        return true;
      } else {
        logger.error("保存数据到数据库失败");

        return false;
      }
    } catch (error) {
      logger.error("易方达净值爬取任务异常", error);

      return false;
    }
  }

  /**
   * 数据源名称
   */
  public getSourceName(): string {
    return "efunds.com.cn";
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
