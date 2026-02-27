import { BaseDatabase } from "./base-database";

import { logger } from "../utils/logger";

/**
 * gold_price 表完整记录类型（含数据库自增 id）
 */
export interface GoldPriceRecord {
  id?: number;

  price?: number;

  ny_price?: number;

  xau_price?: number;

  sh_price?: number;

  created_at: string;

  source?: string;

  currency?: string;

  time_period?: string;
}

/**
 * gold_price 表插入类型（不含自增 id）
 */
export type GoldPriceInsert = Omit<GoldPriceRecord, "id">;

/**
 * 金价数据库操作类
 * 对应 gold_price 表，支持单数据源和多数据源两种插入场景
 */
export class GoldPriceDatabase extends BaseDatabase<GoldPriceRecord, GoldPriceInsert> {
  constructor() {
    super("gold_price");
  }

  /**
   * 插入金价记录（单数据源 / 多数据源通用）
   */
  async insertRecord(record: GoldPriceInsert): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).insert(record);

      if (error) {
        logger.error("插入金价记录失败", error);

        return false;
      }

      const priceInfo = [
        record.ny_price != null ? `ny=${record.ny_price}` : null,
        record.xau_price != null ? `xau=${record.xau_price}` : null,
        record.sh_price != null ? `sh=${record.sh_price}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      logger.info(`成功插入金价记录: ${priceInfo || `price=${record.price}`}`);

      console.table(record);

      return true;
    } catch (error) {
      logger.error("插入金价记录异常", error);

      return false;
    }
  }
}
