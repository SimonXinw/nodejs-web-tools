/**
 * 通用数据类型定义
 */

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
  value: any;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

// 金价数据接口
export interface GoldPriceData extends ScrapedData {
  value: number; // 金价
  currency: string; // 货币单位
  market: string; // 市场类型
}

// 数据库记录接口
export interface DatabaseRecord {
  id?: number;
  price: number;
  timestamp: string;
  source: string;
  currency?: string;
  market?: string;
  created_at?: string;
}

// 调度器配置接口
export interface SchedulerConfig {
  cronExpression: string;
  timezone?: string;
  immediate?: boolean; // 是否立即执行一次
}
