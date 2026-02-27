import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { logger } from "../utils/logger";

import { validateEnvVars } from "../utils/helpers";

/**
 * 数据库抽象基类
 * TRecord - 完整记录类型（含 id，用于查询返回）
 * TInsert - 插入记录类型（不含自增 id）
 */
export abstract class BaseDatabase<TRecord, TInsert> {
  protected client: SupabaseClient;

  protected tableName: string;

  constructor(tableName: string) {
    validateEnvVars(["SUPABASE_URL"]);

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      throw new Error(
        "需要配置 SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_ANON_KEY",
      );
    }

    this.client = createClient(process.env.SUPABASE_URL!, supabaseKey);

    this.tableName = tableName;

    logger.info(`数据库客户端初始化完成，表名: ${tableName}`);
  }

  /**
   * 插入单条记录（子类实现，具有完整类型约束）
   */
  abstract insertRecord(record: TInsert): Promise<boolean>;

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

      logger.info(`数据库连接测试成功，表名: ${this.tableName}`);

      return true;
    } catch (error) {
      logger.error("数据库连接测试异常", error);

      return false;
    }
  }

  /**
   * 查询最新记录
   */
  async getLatestRecords(limit: number = 100): Promise<TRecord[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        logger.error("查询最新记录失败", error);

        return [];
      }

      return (data || []) as TRecord[];
    } catch (error) {
      logger.error("查询最新记录异常", error);

      return [];
    }
  }

  /**
   * 按时间范围查询记录
   */
  async getRecordsByDateRange(
    startDate: string,

    endDate: string,

    limit: number = 1000,
  ): Promise<TRecord[]> {
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

      return (data || []) as TRecord[];
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
}
