#!/usr/bin/env ts-node

/**
 * 爬虫测试脚本
 * 用于测试爬虫功能和数据库连接
 */

import * as dotenv from 'dotenv';
import { GoldPriceScraper } from '../src/scrapers/gold-price-scraper';
import { logger } from '../src/utils/logger';

// 加载环境变量
dotenv.config();

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

class ScraperTester {
  private scraper: GoldPriceScraper;
  private results: TestResult[] = [];

  constructor() {
    this.scraper = new GoldPriceScraper({
      headless: true,
      timeout: 30000,
      retryCount: 2
    });
  }

  private addResult(test: string, success: boolean, message: string, data?: any): void {
    this.results.push({ test, success, message, data });
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${test}: ${message}`);
    if (data) {
      console.log('   数据:', JSON.stringify(data, null, 2));
    }
  }

  async testDatabaseConnection(): Promise<void> {
    console.log('\n🔗 测试数据库连接...');
    try {
      const connected = await this.scraper.testDatabaseConnection();
      if (connected) {
        this.addResult('数据库连接', true, 'Supabase 连接成功');
      } else {
        this.addResult('数据库连接', false, 'Supabase 连接失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('数据库连接', false, `连接异常: ${errorMessage}`);
    }
  }

  async testScraping(): Promise<void> {
    console.log('\n🕷️ 测试数据爬取...');
    try {
      const data = await this.scraper.scrape();
      if (data && data.price > 0) {
        this.addResult('数据爬取', true, `成功获取金价: $${data.price}`, {
          price: data.price,
          created_at: data.created_at,
          source: data.source
        });
      } else {
        this.addResult('数据爬取', false, '爬取数据无效或为空');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('数据爬取', false, `爬取失败: ${errorMessage}`);
    }
  }

  async testDataSaving(): Promise<void> {
    console.log('\n💾 测试数据保存...');
    try {
      const success = await this.scraper.scrapeAndSave();
      if (success) {
        this.addResult('数据保存', true, '数据成功保存到数据库');
      } else {
        this.addResult('数据保存', false, '数据保存失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('数据保存', false, `保存异常: ${errorMessage}`);
    }
  }

  async testHistoryRetrieval(): Promise<void> {
    console.log('\n📊 测试历史数据获取...');
    try {
      const history = await this.scraper.getHistoricalData(5);
      if (history && history.length > 0) {
        this.addResult('历史数据', true, `成功获取 ${history.length} 条历史记录`, {
          count: history.length,
          latest: history[0],
          oldest: history[history.length - 1]
        });
      } else {
        this.addResult('历史数据', false, '未找到历史数据');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('历史数据', false, `获取失败: ${errorMessage}`);
    }
  }

  async testEnvironmentVariables(): Promise<void> {
    console.log('\n⚙️ 检查环境变量...');
    
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.addResult('环境变量', true, '所有必需的环境变量已配置');
    } else {
      this.addResult('环境变量', false, `缺少环境变量: ${missingVars.join(', ')}`);
    }

    // 检查可选变量
    const optionalVars = {
      'SCRAPER_HEADLESS': process.env.SCRAPER_HEADLESS || 'true',
      'SCRAPER_TIMEOUT': process.env.SCRAPER_TIMEOUT || '30000',
      'SCRAPER_RETRY_COUNT': process.env.SCRAPER_RETRY_COUNT || '3',
      'GOLD_PRICE_SCHEDULE': process.env.GOLD_PRICE_SCHEDULE || '0 * * * *'
    };

    console.log('   可选配置:');
    Object.entries(optionalVars).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 开始运行爬虫测试套件...\n');
    
    await this.testEnvironmentVariables();
    await this.testDatabaseConnection();
    await this.testScraping();
    await this.testDataSaving();
    await this.testHistoryRetrieval();
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📋 测试结果汇总:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test.padEnd(15)} - ${result.message}`);
    });
    
    console.log('='.repeat(50));
    console.log(`总计: ${passed}/${total} 项测试通过`);
    
    if (passed === total) {
      console.log('🎉 所有测试通过！爬虫系统运行正常。');
    } else {
      console.log('⚠️  部分测试失败，请检查配置和网络连接。');
    }
  }
}

// 主程序
async function main() {
  const tester = new ScraperTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    logger.error('测试过程中出现未捕获的错误', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 测试异常:', errorMessage);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 爬虫测试工具

用法:
  npm run test:scraper     # 运行完整测试套件
  ts-node scripts/test-scraper.ts

选项:
  -h, --help              显示帮助信息

测试项目:
  - 环境变量配置检查
  - 数据库连接测试
  - 数据爬取功能测试
  - 数据保存功能测试
  - 历史数据获取测试
`);
  process.exit(0);
}

main();
