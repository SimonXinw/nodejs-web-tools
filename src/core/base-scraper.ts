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
      });

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

    // 设置页面超时
    page.setDefaultTimeout(this.config.timeout);

    page.setDefaultNavigationTimeout(this.config.timeout);

    // 拦截不必要的资源以提高速度
    await page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();

      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    return page;
  }

  /**
   * 导航到指定页面
   */
  protected async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      logger.info(`访问页面: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle",

        timeout: this.config.timeout,
      });

      // 随机延迟，模拟人类行为
      await randomDelay(1000, 3000);

      logger.info(`成功访问页面: ${url}`);
    } catch (error) {
      logger.error(`页面访问失败: ${url}`, error);

      throw error;
    }
  }

  /**
   * 获取元素文本内容
   */
  protected async getElementText(
    page: Page,
    selector: string
  ): Promise<string> {
    try {
      await page.waitForSelector(selector, { timeout: this.config.timeout });

      const element = await page.$(selector);

      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      const text = await element.textContent();

      return text?.trim() || "";
    } catch (error) {
      logger.error(`获取元素文本失败: ${selector}`, error);

      throw error;
    }
  }

  /**
   * 获取元素属性
   */
  protected async getElementAttribute(
    page: Page,

    selector: string,

    attribute: string
  ): Promise<string | null> {
    try {
      await page.waitForSelector(selector, { timeout: this.config.timeout });

      const element = await page.$(selector);

      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      return await element.getAttribute(attribute);
    } catch (error) {
      logger.error(`获取元素属性失败: ${selector}.${attribute}`, error);

      throw error;
    }
  }

  /**
   * 执行爬取并重试
   */
  public async scrape(): Promise<T | null> {
    return await withRetry(
      async () => await this.performScrape(),

      this.config.retryCount,

      2000
    );
  }

  /**
   * 具体的爬取实现 - 由子类实现
   */
  protected abstract performScrape(): Promise<T>;

  /**
   * 获取数据源名称 - 由子类实现
   */
  public abstract getSourceName(): string;

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();

        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();

        this.browser = null;
      }

      logger.info("爬虫资源清理完成");
    } catch (error) {
      logger.error("爬虫资源清理失败", error);
    }
  }
}
