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

  net_totsl: number;

  net_scale: number;

  adj_net_price: number;
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
   * 按日期倒序查询最近 N 条记录
   */
  async getRecentByDate(limit: number = 5): Promise<YfdDividendRecord[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("date, net_price, net_totsl, adj_net_price")
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("按日期查询记录失败", error);
      return [];
    }

    return (data || []) as YfdDividendRecord[];
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
        `成功插入易方达净值记录: date=${record.date}, net_price=${record.net_price}, net_totsl=${record.net_totsl}, net_scale=${record.net_scale}`
      );

      console.table(record);

      return true;
    } catch (error) {
      logger.error("插入易方达净值记录异常", error);

      return false;
    }
  }
}
