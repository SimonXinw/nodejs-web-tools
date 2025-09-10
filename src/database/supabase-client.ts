import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { DatabaseRecord } from "../types";

import { logger } from "../utils/logger";

import { validateEnvVars } from "../utils/helpers";

/**
 * Supabase 数据库客户端
 */
export class SupabaseDatabase {
  private client: SupabaseClient;

  private tableName: string;

  constructor(tableName: string = "gold_price") {
    // 验证必需的环境变量 - 优先使用 SERVICE_ROLE_KEY，回退到 ANON_KEY
    validateEnvVars(["SUPABASE_URL"]);

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      throw new Error(
        "需要配置 SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_ANON_KEY"
      );
    }

    this.client = createClient(process.env.SUPABASE_URL!, supabaseKey);

    this.tableName = tableName;

    logger.info(`Supabase 客户端初始化完成，表名: ${tableName}`);
  }

  /**
   * 插入单条记录
   */
  async insertRecord(
    record: Omit<DatabaseRecord, "id" | "created_at">
  ): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).insert(record);

      if (error) {
        logger.error("插入记录失败", error);

        return false;
      }

      logger.info(`成功插入记录: 价格=${record.price}, 来源=${record.source}`);
      
      console.table(record);

      return true;
    } catch (error) {
      logger.error("插入记录异常", error);

      return false;
    }
  }

  /**
   * 批量插入记录
   */
  async insertBatchRecords(
    records: Omit<DatabaseRecord, "id" | "created_at">[]
  ): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).insert(records);

      if (error) {
        logger.error("批量插入记录失败", error);

        return false;
      }

      logger.info(`成功批量插入 ${records.length} 条记录`);

      return true;
    } catch (error) {
      logger.error("批量插入记录异常", error);

      return false;
    }
  }

  /**
   * 查询最新记录
   */
  async getLatestRecords(limit: number = 100): Promise<DatabaseRecord[]> {
    try {
      const { data, error } = await this.client

        .from(this.tableName)

        .select("*")

        .order("created_at", { ascending: false })

        .limit(limit);

      if (error) {
        logger.error("查询最新记录", error);

        return [];
      }

      return data || [];
    } catch (error) {
      logger.error("查询最新记录", error);

      return [];
    }
  }

  /**
   * 按时间范围查询记录
   */
  async getRecordsByDateRange(
    startDate: string,

    endDate: string,

    limit: number = 1000
  ): Promise<DatabaseRecord[]> {
    try {
      const { data, error } = await this.client

        .from(this.tableName)

        .select("*")

        .gte("created_at", startDate)

        .lte("created_at", endDate)

        .order("created_at", { ascending: true })

        .limit(limit);

      if (error) {
        logger.error("按时间范围查询记录失败", error);

        return [];
      }

      return data || [];
    } catch (error) {
      logger.error("按时间范围查询记录异常", error);

      return [];
    }
  }

  /**
   * 获取记录总数
   */
  async getRecordCount(): Promise<number> {
    try {
      const { count, error } = await this.client

        .from(this.tableName)

        .select("*", { count: "exact", head: true });

      if (error) {
        logger.error("获取记录总数失败", error);

        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error("获取记录总数异常", error);

      return 0;
    }
  }

  /**
   * 删除过期记录
   */
  async deleteOldRecords(daysToKeep: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();

      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await this.client

        .from(this.tableName)

        .delete()

        .lt("created_at", cutoffDate.toISOString());

      if (error) {
        logger.error("删除过期记录失败", error);

        return false;
      }

      logger.info(`成功删除 ${daysToKeep} 天前的过期记录`);

      return true;
    } catch (error) {
      logger.error("删除过期记录异常", error);

      return false;
    }
  }

  /**
   * 检查数据库连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client

        .from(this.tableName)

        .select("id")

        .limit(1);

      if (error) {
        logger.error("数据库连接测试失败", error);

        return false;
      }

      logger.info("数据库连接测试成功");

      return true;
    } catch (error) {
      logger.error("数据库连接测试异常", error);

      return false;
    }
  }
}
