import { Browser, BrowserContext, chromium, Page } from "playwright";

import { ScrapedData, ScraperConfig } from "../types";

import { randomDelay, withRetry } from "../utils/helpers";

import { logger } from "../utils/logger";

import fs from "fs";

/**
 * 爬虫基类 - 提供通用的爬虫功能
 */
export abstract class BaseScraper<T extends ScrapedData> {
  protected config: Required<ScraperConfig>;

  protected browser: Browser | null = null;

  protected context: BrowserContext | null = null;

  constructor(config: Partial<ScraperConfig> = {}) {
    // 根据平台自动选择默认的 Chrome 路径
    let defaultExecutablePath = "";
    if (process.platform === "win32") {
      const winPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ];
      defaultExecutablePath = winPaths.find((p) => fs.existsSync(p)) || "";
    } else {
      const linuxPaths = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
      defaultExecutablePath = linuxPaths.find((p) => fs.existsSync(p)) || "/usr/bin/google-chrome";
    }

    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      executablePath: config.executablePath ?? defaultExecutablePath,
    };
  }

  /**
   * 初始化浏览器和上下文
   */
  protected async initBrowser(): Promise<void> {
    try {
      const launchOptions: any = {
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      };

      // 只有在配置了可执行路径时才设置
      if (this.config.executablePath) {
        launchOptions.executablePath = this.config.executablePath;
        logger.info(`使用系统 Chrome: ${this.config.executablePath}`);
      } else {
        logger.info("使用 Playwright 内置浏览器");
      }

      this.browser = await chromium.launch(launchOptions);

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
    // 检查浏览器上下文是否有效
    if (!this.context || this.browser?.isConnected() === false) {
      logger.info("浏览器上下文无效，重新初始化...");
      await this.cleanup();
      await this.initBrowser();
    }

    try {
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
    } catch (error) {
      logger.error("创建页面失败，尝试重新初始化浏览器", error);
      await this.cleanup();
      await this.initBrowser();

      // 重试一次
      const page = await this.context!.newPage();
      page.setDefaultTimeout(this.config.timeout);
      page.setDefaultNavigationTimeout(this.config.timeout);

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
