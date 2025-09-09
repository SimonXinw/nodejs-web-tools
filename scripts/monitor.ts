#!/usr/bin/env ts-node

/**
 * 系统监控脚本
 * 监控爬虫运行状态和数据质量
 */

import * as dotenv from 'dotenv';
import { SupabaseDatabase } from '../src/database/supabase-client';
import { logger } from '../src/utils/logger';

// 加载环境变量
dotenv.config();

interface MonitorReport {
  dataHealth: {
    totalRecords: number;
    recentRecords: number;
    lastUpdateTime: string;
    dataGaps: number;
    averagePrice: number;
  };
  systemHealth: {
    diskUsage: string;
    memoryUsage: string;
    logFileSize: string;
  };
  alerts: string[];
}

class SystemMonitor {
  private database: SupabaseDatabase;

  constructor() {
    this.database = new SupabaseDatabase('gold_price');
  }

  /**
   * 检查数据健康状况
   */
  async checkDataHealth(): Promise<MonitorReport['dataHealth']> {
    try {
      // 获取总记录数
      const totalRecords = await this.database.getRecordCount();
      
      // 获取最近24小时的记录
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentData = await this.database.getRecordsByDateRange(
        oneDayAgo.toISOString(),
        new Date().toISOString(),
        1000
      );
      
      const recentRecords = recentData.length;
      
      // 获取最新数据时间
      const latestData = await this.database.getLatestRecords(1);
      const lastUpdateTime = latestData.length > 0 
        ? latestData[0].created_at 
        : 'N/A';
      
      // 计算数据间隔（检测数据缺失）
      let dataGaps = 0;
      if (recentData.length > 1) {
        const sortedData = recentData.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        for (let i = 1; i < sortedData.length; i++) {
          const prevTime = new Date(sortedData[i - 1].created_at).getTime();
          const currTime = new Date(sortedData[i].created_at).getTime();
          const gap = (currTime - prevTime) / (1000 * 60 * 60); // 小时
          
          // 如果间隔超过2小时，认为是数据缺失
          if (gap > 2) {
            dataGaps++;
          }
        }
      }
      
      // 计算平均价格
      const averagePrice = recentData.length > 0
        ? recentData.reduce((sum, record) => sum + record.price, 0) / recentData.length
        : 0;
      
      return {
        totalRecords,
        recentRecords,
        lastUpdateTime,
        dataGaps,
        averagePrice: Math.round(averagePrice * 100) / 100
      };
      
    } catch (error) {
      logger.error('检查数据健康状况失败', error);
      throw error;
    }
  }

  /**
   * 检查系统健康状况
   */
  async checkSystemHealth(): Promise<MonitorReport['systemHealth']> {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // 检查磁盘使用情况
      let diskUsage = 'N/A';
      try {
        const stats = fs.statSync('.');
        diskUsage = 'Available'; // 简化处理
      } catch {
        diskUsage = 'Unknown';
      }
      
      // 检查内存使用情况
      const memUsage = process.memoryUsage();
      const memoryUsage = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`;
      
      // 检查日志文件大小
      let logFileSize = 'N/A';
      try {
        const logPath = path.join('logs', 'combined.log');
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          logFileSize = `${Math.round(stats.size / 1024 / 1024 * 100) / 100}MB`;
        }
      } catch {
        logFileSize = 'Unknown';
      }
      
      return {
        diskUsage,
        memoryUsage,
        logFileSize
      };
      
    } catch (error) {
      logger.error('检查系统健康状况失败', error);
      throw error;
    }
  }

  /**
   * 生成告警信息
   */
  generateAlerts(dataHealth: MonitorReport['dataHealth']): string[] {
    const alerts: string[] = [];
    
    // 检查最近数据更新时间
    if (dataHealth.lastUpdateTime !== 'N/A') {
      const lastUpdate = new Date(dataHealth.lastUpdateTime);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 2) {
        alerts.push(`⚠️ 数据更新延迟: 最后更新于 ${hoursSinceUpdate.toFixed(1)} 小时前`);
      }
    }
    
    // 检查最近24小时数据量
    if (dataHealth.recentRecords < 12) { // 期望每小时至少1条记录
      alerts.push(`⚠️ 数据量不足: 最近24小时仅有 ${dataHealth.recentRecords} 条记录`);
    }
    
    // 检查数据缺失
    if (dataHealth.dataGaps > 3) {
      alerts.push(`⚠️ 数据缺失: 检测到 ${dataHealth.dataGaps} 个数据间隔异常`);
    }
    
    // 检查价格异常
    if (dataHealth.averagePrice > 0) {
      if (dataHealth.averagePrice < 1500 || dataHealth.averagePrice > 3000) {
        alerts.push(`⚠️ 价格异常: 平均价格 $${dataHealth.averagePrice} 超出正常范围`);
      }
    }
    
    return alerts;
  }

  /**
   * 生成监控报告
   */
  async generateReport(): Promise<MonitorReport> {
    logger.info('生成系统监控报告...');
    
    try {
      const dataHealth = await this.checkDataHealth();
      const systemHealth = await this.checkSystemHealth();
      const alerts = this.generateAlerts(dataHealth);
      
      const report: MonitorReport = {
        created_at: new Date().toISOString(),
        dataHealth,
        systemHealth,
        alerts
      };
      
      return report;
      
    } catch (error) {
      logger.error('生成监控报告失败', error);
      throw error;
    }
  }

  /**
   * 打印监控报告
   */
  printReport(report: MonitorReport): void {
    console.log('\n📊 系统监控报告');
    console.log('='.repeat(50));
    console.log(`🕐 生成时间: ${new Date(report.created_at).toLocaleString('zh-CN')}`);
    
    console.log('\n📈 数据健康状况:');
    console.log(`   总记录数: ${report.dataHealth.totalRecords.toLocaleString()}`);
    console.log(`   24小时新增: ${report.dataHealth.recentRecords}`);
    console.log(`   最后更新: ${report.dataHealth.lastUpdateTime !== 'N/A' 
      ? new Date(report.dataHealth.lastUpdateTime).toLocaleString('zh-CN')
      : 'N/A'}`);
    console.log(`   数据缺失: ${report.dataHealth.dataGaps} 个间隔`);
    console.log(`   平均价格: $${report.dataHealth.averagePrice}`);
    
    console.log('\n💻 系统健康状况:');
    console.log(`   磁盘状态: ${report.systemHealth.diskUsage}`);
    console.log(`   内存使用: ${report.systemHealth.memoryUsage}`);
    console.log(`   日志大小: ${report.systemHealth.logFileSize}`);
    
    if (report.alerts.length > 0) {
      console.log('\n🚨 告警信息:');
      report.alerts.forEach(alert => {
        console.log(`   ${alert}`);
      });
    } else {
      console.log('\n✅ 系统运行正常，无告警信息');
    }
    
    console.log('='.repeat(50));
  }

  /**
   * 保存监控报告到文件
   */
  saveReport(report: MonitorReport): string {
    const fs = require('fs');
    const path = require('path');
    
    // 确保监控目录存在
    const monitorDir = 'logs/monitor';
    if (!fs.existsSync(monitorDir)) {
      fs.mkdirSync(monitorDir, { recursive: true });
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monitor-report-${timestamp}.json`;
    const filepath = path.join(monitorDir, filename);
    
    // 保存报告
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    logger.info(`监控报告已保存: ${filepath}`);
    return filepath;
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📊 系统监控工具

用法:
  npm run monitor              # 生成并显示监控报告
  npm run monitor -- --save    # 保存报告到文件
  npm run monitor -- --watch   # 持续监控模式

选项:
  --save         保存报告到文件
  --watch        持续监控模式 (每5分钟检查一次)
  -h, --help     显示帮助信息

监控内容:
  - 数据库记录统计
  - 数据更新频率
  - 数据质量检查
  - 系统资源使用
  - 异常告警
    `);
    process.exit(0);
  }
  
  const monitor = new SystemMonitor();
  const shouldSave = args.includes('--save');
  const watchMode = args.includes('--watch');
  
  try {
    if (watchMode) {
      console.log('🔍 启动持续监控模式 (每5分钟检查一次)...');
      console.log('按 Ctrl+C 停止监控\n');
      
      const runCheck = async () => {
        try {
          const report = await monitor.generateReport();
          monitor.printReport(report);
          
          if (shouldSave) {
            monitor.saveReport(report);
          }
          
          // 如果有告警，记录到日志
          if (report.alerts.length > 0) {
            logger.warn('监控发现告警', { alerts: report.alerts });
          }
          
        } catch (error) {
          logger.error('监控检查失败', error);
        }
      };
      
      // 立即执行一次
      await runCheck();
      
      // 设置定时检查
      setInterval(runCheck, 5 * 60 * 1000); // 5分钟
      
      // 保持程序运行
      process.on('SIGINT', () => {
        console.log('\n👋 监控已停止');
        process.exit(0);
      });
      
    } else {
      // 单次检查模式
      const report = await monitor.generateReport();
      monitor.printReport(report);
      
      if (shouldSave) {
        monitor.saveReport(report);
      }
    }
    
  } catch (error) {
    console.error('❌ 监控失败:', error.message);
    process.exit(1);
  }
}

main();
