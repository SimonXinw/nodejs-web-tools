import { Browser, BrowserContext, chromium, Page } from "playwright";
import { ScrapedData, ScraperConfig } from "../types";
import { randomDelay, withRetry } from "../utils/helpers";
import { logger } from "../utils/logger";

/**
 * 爬虫基类 - 提供通用的爬虫功能
 */
export abstract class BaseScraper<T extends ScrapedData> {
  protected config: Required<ScraperConfig>;
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: config.viewport ?? { width: 1920, height: 1080 },
    };
  }

  /**
   * 初始化浏览器和上下文
   */
  protected async initBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      this.context = await this.browser.newContext({
        userAgent: this.config.userAgent,
        viewport: this.config.viewport,
        locale: "en-US",
        timezoneId: "America/New_York",
        permissions: ["notifications"],
        colorScheme: "light",
        extraHTTPHeaders: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      // 反检测脚本
      await this.context.addInitScript(`() => {
        // 隐藏webdriver特征
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // 删除自动化检测特征
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        // 模拟真实的Chrome特征
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      }`);

      logger.info("浏览器初始化成功");
    } catch (error) {
      logger.error("浏览器初始化失败", error);
      throw error;
    }
  }

  /**
   * 创建新页面
   */
  protected async createPage(): Promise<Page> {
    if (!this.context) {
      await this.initBrowser();
    }

    const page = await this.context!.newPage();

    // 设置超时时间
    page.setDefaultTimeout(this.config.timeout);

    return page;
  }

  /**
   * 安全访问页面
   */
  protected async navigateToPage(page: Page, url: string): Promise<void> {
    await randomDelay(500, 1500);

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: this.config.timeout,
    });

    logger.info(`成功访问页面: ${url}`);
  }

  /**
   * 等待元素并获取文本
   */
  protected async getElementText(
    page: Page,
    selector: string
  ): Promise<string | null> {
    try {
      await page.waitForSelector(selector, { timeout: this.config.timeout });
      const element = await page.$(selector);
      return element ? await element.textContent() : null;
    } catch (error) {
      logger.warn(`获取元素文本失败: ${selector}`, error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  protected async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info("浏览器资源清理完成");
    } catch (error) {
      logger.error("清理浏览器资源失败", error);
    }
  }

  /**
   * 执行爬取任务（带重试机制）
   */
  public async scrape(): Promise<T | null> {
    return withRetry(async () => {
      try {
        await this.initBrowser();
        const result = await this.performScrape();
        return result;
      } finally {
        await this.cleanup();
      }
    }, this.config.retryCount);
  }

  /**
   * 抽象方法：具体的爬取逻辑，由子类实现
   */
  protected abstract performScrape(): Promise<T>;
}
