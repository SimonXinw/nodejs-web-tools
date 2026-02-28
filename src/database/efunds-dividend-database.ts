import { BaseDatabase } from "./base-database";

import { logger } from "../utils/logger";

/**
 * yfd_dividend 表完整记录类型（含数据库自增 id）
 */
export interface YfdDividendRecord {
  id?: number;

  created_at: string;

  date: string;

  source: string;

  net_price: number;

  net_totsl: number | null;

  net_scale: number;

  adj_net_price: number;

  ma250: number | null;

  nav_ma250_deviation_pct: number | null;
}

/**
 * yfd_dividend 表插入类型（不含自增 id，created_at 由爬虫设置）
 */
export type YfdDividendInsert = Omit<YfdDividendRecord, "id">;

/**
 * 易方达中证红利ETF净值数据库操作类
 * 对应 yfd_dividend 表
 */
export class EFundsDividendDatabase extends BaseDatabase<YfdDividendRecord, YfdDividendInsert> {
  constructor() {
    super("yfd_dividend");
  }

  /**
   * 检查指定日期的记录是否已存在（用于增量插入去重）
   */
  async existsByDate(date: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("id")
      .eq("date", date)
      .limit(1);

    if (error) {
      logger.error(`检查日期 ${date} 是否存在时出错`, error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  /**
   * 按日期倒序查询最近 N 条记录（含全部字段，用于验证和展示）
   */
  async getRecentByDate(limit: number = 5): Promise<YfdDividendRecord[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("date, net_price, net_totsl, adj_net_price, ma250, nav_ma250_deviation_pct")
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("按日期查询记录失败", error);
      return [];
    }

    return (data || []) as YfdDividendRecord[];
  }

  /**
   * 获取最近 N 条 adj_net_price（按日期降序取，调用方自行 reverse 得到正序）
   * 主要用于 MA250 计算时的历史数据查询
   */
  async getRecentAdjPricesForMA(limit: number): Promise<number[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("adj_net_price")
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("查询 adj_net_price 历史数据失败", error);
      return [];
    }

    // reverse 使结果从旧到新（正序），与滑动窗口方向一致
    return (data || []).map((r) => r.adj_net_price as number).reverse();
  }

  /**
   * 插入净值记录
   */
  async insertRecord(record: YfdDividendInsert): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).insert(record);

      if (error) {
        logger.error("插入易方达净值记录失败", error);

        return false;
      }

      logger.info(
        `成功插入易方达净值记录: date=${record.date}, adj_net_price=${record.adj_net_price}, ma250=${record.ma250}, dev=${record.nav_ma250_deviation_pct}`
      );

      console.table(record);

      return true;
    } catch (error) {
      logger.error("插入易方达净值记录异常", error);

      return false;
    }
  }
}
