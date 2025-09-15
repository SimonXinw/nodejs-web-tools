import { Browser, BrowserContext, chromium, Page } from "playwright";

import {
  ScrapedData,
  ScraperConfig,
  DataSourceConfig,
  MultiSourceConfig,
  PriceData,
  MultiPriceData,
} from "../types";

import {
  randomDelay,
  withRetry,
  parsePrice,
  formatTimestamp,
} from "../utils/helpers";

import { logger } from "../utils/logger";

import fs from "fs";

/**
 * 爬虫基类 - 提供通用的爬虫功能
 * 支持单数据源和多数据源爬取模式
 */
export abstract class BaseScraper<T extends ScrapedData> {
  protected config: Required<ScraperConfig>;

  protected browser: Browser | null = null;

  protected context: BrowserContext | null = null;

  // 多数据源配置
  protected multiSourceConfig?: MultiSourceConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    // 根据平台自动选择默认的 Chrome 路径
    let defaultExecutablePath = "";

    const useSystemBrowser = config.useSystemBrowser ?? false;

    if (useSystemBrowser) {
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
        defaultExecutablePath =
          linuxPaths.find((p) => fs.existsSync(p)) || "/usr/bin/google-chrome";
      }
    }

    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      executablePath: useSystemBrowser
        ? config.executablePath ?? defaultExecutablePath
        : "",
      useSystemBrowser,
    };
  }

  /**
   * 设置多数据源配置
   * @param multiSourceConfig 多数据源配置
   */
  protected setMultiSourceConfig(multiSourceConfig: MultiSourceConfig): void {
    this.multiSourceConfig = {
      sequential: true, // 默认按顺序爬取
      delayBetweenSources: 2000, // 默认延迟2秒
      ...multiSourceConfig,
    };
    logger.info(
      `已配置多数据源模式，共 ${this.multiSourceConfig.sources.length} 个数据源`
    );
  }

  /**
   * 获取浏览器启动选项
   */
  protected getLaunchOptions(): any {
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

    return launchOptions;
  }

  /**
   * 初始化浏览器和上下文
   */
  protected async initBrowser(): Promise<void> {
    try {
      const launchOptions = this.getLaunchOptions();

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
   * 只等待DOM加载完成，具体元素的等待交给后续的selector等待逻辑
   */
  protected async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      logger.info(`访问页面: ${url}`);

      await page.goto(url, {
        waitUntil: "domcontentloaded", // 只等待DOM加载完成，不等待网络空闲
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
   * 从单个数据源爬取价格数据
   * @param page 页面对象
   * @param source 数据源配置
   * @returns 价格数据
   */
  protected async scrapeFromSingleSource(
    page: Page,
    source: DataSourceConfig
  ): Promise<PriceData> {
    logger.info(`🔍 开始爬取数据源: ${source.name} (${source.url})`);

    try {
      // 导航到目标页面
      await this.navigateToPage(page, source.url);

      // 获取价格文本
      const priceText = await this.getElementText(page, source.selector);

      if (!priceText) {
        throw new Error(`未能获取到价格文本，选择器: ${source.selector}`);
      }

      // 解析价格
      const price = parsePrice(priceText);
      if (price <= 0) {
        throw new Error(`解析的价格无效: ${priceText} -> ${price}`);
      }

      const priceData: PriceData = {
        price,
        source: source.url,
        currency: source.currency || "USD",
        timestamp: formatTimestamp(),
      };

      logger.info(
        `✅ 成功爬取 ${source.name}: $${price} ${priceData.currency}`
      );
      return priceData;
    } catch (error) {
      logger.error(`❌ 爬取数据源失败: ${source.name}`, error);
      throw error;
    }
  }

  /**
   * 多数据源爬取方法
   * @returns 多价格数据
   */
  protected async performMultiSourceScrape(): Promise<MultiPriceData> {
    if (!this.multiSourceConfig) {
      throw new Error("未配置多数据源，请先调用 setMultiSourceConfig()");
    }

    const page = await this.createPage();

    const prices: Record<string, PriceData> = {};

    const sources = this.multiSourceConfig.sources;

    try {
      logger.info(`🚀 开始多数据源爬取，共 ${sources.length} 个数据源`);

      if (this.multiSourceConfig.sequential) {
        // 按顺序爬取
        for (let i = 0; i < sources.length; i++) {
          const source = sources[i];

          try {
            const priceData = await this.scrapeFromSingleSource(page, source);

            prices[source.fieldName] = priceData;

            // 如果不是最后一个数据源，则等待一段时间
            if (
              i < sources.length - 1 &&
              this.multiSourceConfig!.delayBetweenSources
            ) {
              logger.info(
                `⏳ 等待 ${
                  this.multiSourceConfig!.delayBetweenSources
                }ms 后继续下一个数据源...`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, this.multiSourceConfig!.delayBetweenSources)
              );
            }
          } catch (error) {
            logger.warn(
              `⚠️ 数据源 ${source.name} 爬取失败，继续下一个:`,
              error
            );
            // 可以选择继续或者抛出错误，这里选择继续
          }
        }
      } else {
        // 并行爬取（暂时不实现，因为需求是按顺序）
        logger.warn("并行爬取模式暂未实现，将使用顺序模式");
      }

      // 检查是否至少成功爬取了一个数据源
      if (Object.keys(prices).length === 0) {
        throw new Error("所有数据源都爬取失败");
      }

      const multiPriceData: MultiPriceData = {
        price: prices[0]?.price, // 为了兼容基类接口
        source: sources.map((s) => s.url)?.join(", "),
        prices,
        created_at: formatTimestamp(),
        time_period: "realtime",
      };

      logger.info(
        `🎉 多数据源爬取完成，成功获取 ${Object.keys(prices).length}/${
          sources.length
        } 个价格`
      );
      return multiPriceData;
    } finally {
      await page.close();
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
   * 执行多数据源爬取并重试
   */
  public async scrapeMultiSource(): Promise<MultiPriceData | null> {
    if (!this.multiSourceConfig) {
      throw new Error("未配置多数据源，请先调用 setMultiSourceConfig()");
    }

    return await withRetry(
      async () => await this.performMultiSourceScrape(),
      this.config.retryCount,
      2000
    );
  }

  /**
   * 具体的爬取实现 - 由子类实现
   * 单数据源模式使用此方法
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
