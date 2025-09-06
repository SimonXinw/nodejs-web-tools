#!/usr/bin/env ts-node

/**
 * 数据备份脚本
 * 用于备份 Supabase 中的金价数据
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseDatabase } from '../src/database/supabase-client';
import { logger } from '../src/utils/logger';

// 加载环境变量
dotenv.config();

interface BackupOptions {
  days?: number;
  format?: 'json' | 'csv';
  output?: string;
  compress?: boolean;
}

class DataBackup {
  private database: SupabaseDatabase;

  constructor() {
    this.database = new SupabaseDatabase('gold_prices');
  }

  /**
   * 备份数据到 JSON 文件
   */
  async backupToJson(options: BackupOptions = {}): Promise<string> {
    const { days = 30, output } = options;
    
    logger.info(`开始备份最近 ${days} 天的数据...`);
    
    try {
      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // 获取数据
      const data = await this.database.getRecordsByDateRange(
        startDate.toISOString(),
        endDate.toISOString(),
        10000 // 最多1万条记录
      );
      
      if (data.length === 0) {
        logger.warn('没有找到需要备份的数据');
        return '';
      }
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = output || `gold-prices-backup-${timestamp}.json`;
      const filepath = path.join('backup', filename);
      
      // 确保备份目录存在
      if (!fs.existsSync('backup')) {
        fs.mkdirSync('backup', { recursive: true });
      }
      
      // 创建备份数据结构
      const backupData = {
        metadata: {
          exportTime: new Date().toISOString(),
          recordCount: data.length,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          version: '1.0'
        },
        data: data
      };
      
      // 写入文件
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
      
      logger.info(`备份完成: ${filepath} (${data.length} 条记录)`);
      return filepath;
      
    } catch (error) {
      logger.error('数据备份失败', error);
      throw error;
    }
  }

  /**
   * 备份数据到 CSV 文件
   */
  async backupToCsv(options: BackupOptions = {}): Promise<string> {
    const { days = 30, output } = options;
    
    logger.info(`开始备份最近 ${days} 天的数据到 CSV...`);
    
    try {
      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // 获取数据
      const data = await this.database.getRecordsByDateRange(
        startDate.toISOString(),
        endDate.toISOString(),
        10000
      );
      
      if (data.length === 0) {
        logger.warn('没有找到需要备份的数据');
        return '';
      }
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = output || `gold-prices-backup-${timestamp}.csv`;
      const filepath = path.join('backup', filename);
      
      // 确保备份目录存在
      if (!fs.existsSync('backup')) {
        fs.mkdirSync('backup', { recursive: true });
      }
      
      // 生成 CSV 内容
      const headers = ['id', 'price', 'timestamp', 'source', 'currency', 'market', 'created_at'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // 处理包含逗号的值
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');
      
      // 写入文件
      fs.writeFileSync(filepath, csvContent);
      
      logger.info(`CSV 备份完成: ${filepath} (${data.length} 条记录)`);
      return filepath;
      
    } catch (error) {
      logger.error('CSV 备份失败', error);
      throw error;
    }
  }

  /**
   * 恢复数据从备份文件
   */
  async restoreFromBackup(backupFile: string): Promise<boolean> {
    logger.info(`开始从备份文件恢复数据: ${backupFile}`);
    
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error(`备份文件不存在: ${backupFile}`);
      }
      
      const content = fs.readFileSync(backupFile, 'utf-8');
      const backupData = JSON.parse(content);
      
      if (!backupData.data || !Array.isArray(backupData.data)) {
        throw new Error('无效的备份文件格式');
      }
      
      const records = backupData.data.map((item: any) => ({
        price: item.price,
        timestamp: item.timestamp,
        source: item.source,
        currency: item.currency || 'USD',
        market: item.market || 'COMEX'
      }));
      
      const success = await this.database.insertBatchRecords(records);
      
      if (success) {
        logger.info(`数据恢复成功: ${records.length} 条记录`);
        return true;
      } else {
        logger.error('数据恢复失败');
        return false;
      }
      
    } catch (error) {
      logger.error('数据恢复异常', error);
      return false;
    }
  }

  /**
   * 清理旧的备份文件
   */
  cleanOldBackups(daysToKeep: number = 7): void {
    logger.info(`清理 ${daysToKeep} 天前的备份文件...`);
    
    const backupDir = 'backup';
    if (!fs.existsSync(backupDir)) {
      return;
    }
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      const files = fs.readdirSync(backupDir);
      let deletedCount = 0;
      
      files.forEach(file => {
        const filepath = path.join(backupDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filepath);
          deletedCount++;
          logger.info(`删除旧备份文件: ${file}`);
        }
      });
      
      logger.info(`清理完成，删除了 ${deletedCount} 个旧备份文件`);
      
    } catch (error) {
      logger.error('清理备份文件失败', error);
    }
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const backup = new DataBackup();
  
  // 解析命令行参数
  const options: BackupOptions = {};
  let action = 'backup';
  let backupFile = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        console.log(`
📦 数据备份工具

用法:
  npm run backup              # 备份最近30天数据到JSON
  npm run backup -- --csv     # 备份到CSV格式
  npm run backup -- --days 7  # 备份最近7天数据
  npm run backup -- --restore backup.json  # 从备份恢复数据
  npm run backup -- --clean   # 清理旧备份文件

选项:
  --days <number>     备份天数 (默认: 30)
  --format <format>   输出格式: json|csv (默认: json)
  --output <file>     输出文件名
  --csv              使用CSV格式
  --restore <file>   从备份文件恢复数据
  --clean            清理7天前的备份文件
  -h, --help         显示帮助信息
        `);
        process.exit(0);
        
      case '--days':
        options.days = parseInt(args[++i]);
        break;
        
      case '--format':
        options.format = args[++i] as 'json' | 'csv';
        break;
        
      case '--output':
        options.output = args[++i];
        break;
        
      case '--csv':
        options.format = 'csv';
        break;
        
      case '--restore':
        action = 'restore';
        backupFile = args[++i];
        break;
        
      case '--clean':
        action = 'clean';
        break;
    }
  }
  
  try {
    switch (action) {
      case 'backup':
        if (options.format === 'csv') {
          await backup.backupToCsv(options);
        } else {
          await backup.backupToJson(options);
        }
        break;
        
      case 'restore':
        if (!backupFile) {
          console.error('❌ 请指定备份文件: --restore <file>');
          process.exit(1);
        }
        const restored = await backup.restoreFromBackup(backupFile);
        if (!restored) {
          process.exit(1);
        }
        break;
        
      case 'clean':
        backup.cleanOldBackups();
        break;
    }
    
    console.log('✅ 操作完成');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

main();
