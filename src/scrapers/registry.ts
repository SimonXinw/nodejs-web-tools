import { GoldPriceScraper } from "./gold-price-scraper";

import { ScraperConfig } from "../types";

/**
 * 通用爬虫适配器接口
 * 每个爬虫都必须实现这些方法，供 Application 调用
 */
export interface ScraperAdapter {
  testDatabaseConnection(): Promise<boolean>;

  runTask(): Promise<boolean>;

  getHistoricalData(limit: number): Promise<unknown>;
}

/**
 * 爬虫注册表条目
 */
export interface ScraperRegistryEntry {
  key: string;

  name: string;

  description: string;

  create(config: Partial<ScraperConfig>): ScraperAdapter;
}

/**
 * 爬虫注册表
 * 新增爬虫时，只需在此数组中添加一条记录即可
 */
export const scraperRegistry: ScraperRegistryEntry[] = [
  {
    key: "gold-price",

    name: "金价爬虫",

    description: "爬取纽约黄金(ny_price)、XAU现货黄金(xau_price)、沪金价格(sh_price)",

    create(config) {
      const scraper = new GoldPriceScraper(config);

      const useMultiSource = process.env.SCRAPER_MODE !== "single";

      return {
        testDatabaseConnection: () => scraper.testDatabaseConnection(),

        runTask: async () => {
          if (useMultiSource) {
            scraper.setupMultiSourceMode();

            return scraper.scrapeMultiSourceAndSave();
          }

          return scraper.scrapeAndSave();
        },

        getHistoricalData: (limit) => scraper.getHistoricalData(limit),
      };
    },
  },

  // 在此处添加新爬虫，示例：
  // {
  //   key: "stock-price",
  //   name: "股票价格爬虫",
  //   description: "爬取 A 股实时价格",
  //   create(config) {
  //     const scraper = new StockPriceScraper(config);
  //     return {
  //       testDatabaseConnection: () => scraper.testDatabaseConnection(),
  //       runTask: () => scraper.scrapeAndSave(),
  //       getHistoricalData: (limit) => scraper.getHistoricalData(limit),
  //     };
  //   },
  // },
];

/**
 * 根据 key 查找注册表条目
 */
export const findScraper = (key: string): ScraperRegistryEntry | undefined => {
  return scraperRegistry.find((entry) => entry.key === key);
};
