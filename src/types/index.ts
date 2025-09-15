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

  // 添加系统浏览器配置
  executablePath?: string | undefined; // Chrome 可执行文件路径

  useSystemBrowser?: boolean; // Chrome 可执行文件路径
}

// 单个数据源配置接口
export interface DataSourceConfig {
  name: string; // 数据源名称，如 "纽约黄金"、"XAU现货黄金"、"沪金价格"
  url: string; // 目标URL
  selector: string; // CSS选择器
  fieldName: string; // 对应的字段名，如 "ny_price"、"xau_price"、"sh_price"
  currency?: string; // 货币单位，默认USD
}

// 多数据源配置接口
export interface MultiSourceConfig {
  sources: DataSourceConfig[]; // 数据源列表
  sequential?: boolean; // 是否按顺序爬取，默认true
  delayBetweenSources?: number; // 数据源之间的延迟时间(ms)，默认2000
}

// 爬虫结果接口
export interface ScrapedData {
  price: any;

  source: string;
}

// 单个价格数据接口
export interface PriceData {
  price: number;
  source: string;
  currency: string;
  timestamp: string;
}

// 多价格数据接口 - 支持多个数据源的价格
export interface MultiPriceData extends ScrapedData {
  prices: Record<string, PriceData>; // 键为fieldName，值为价格数据
  created_at: string; // 创建时间
  time_period: string; // 时间周期
  currency?: string; // 货币单位
}

// 金价数据接口 - 保持向后兼容
export interface GoldPriceData extends ScrapedData {
  currency: string; // 货币单位

  created_at: string; // 创建时间

  time_period: string; // 时间周期

  ny_price?: number; // 纽约黄金价格
  xau_price?: number; // XAU现货黄金价格
  sh_price?: number; // 沪金价格
}

// 多金价数据接口 - 新的多数据源金价结构
export interface MultiGoldPriceData extends MultiPriceData {
  ny_price?: number; // 纽约黄金价格
  xau_price?: number; // XAU现货黄金价格
  sh_price?: number; // 沪金价格
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

// 多价格数据库记录接口
export interface MultiPriceDatabaseRecord {
  id?: number;
  ny_price?: number; // 纽约黄金价格
  xau_price?: number; // XAU现货黄金价格
  sh_price?: number; // 沪金价格
  created_at: string;
  time_period?: string;
}

// 调度器配置接口
export interface SchedulerConfig {
  cronExpression: string;

  timezone?: string;

  immediate?: boolean; // 是否立即执行一次
}
