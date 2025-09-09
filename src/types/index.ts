// 爬虫配置接口
export interface ScraperConfig {

  headless?: boolean;

  timeout?: number;

  retryCount?: number;

  userAgent?: string;

  viewport?: {

    width: number;

    height: number;

  };

}

// 爬虫结果接口
export interface ScrapedData {

  price: any;

  source: string;

}

// 金价数据接口
export interface GoldPriceData extends ScrapedData {

  currency: string; // 货币单位

  created_at: string; // 创建时间

  time_period: string; // 时间周期

}

// 数据库记录接口 - 与 gold_price 表结构保持一致
export interface DatabaseRecord {

  id?: number;

  price: number;

  created_at: string;

  source?: string;

  currency?: string;

  time_period?: string;

}

// 调度器配置接口
export interface SchedulerConfig {

  cronExpression: string;

  timezone?: string;

  immediate?: boolean; // 是否立即执行一次

}
