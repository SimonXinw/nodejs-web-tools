#!/usr/bin/env node

/**
 * 项目初始化脚本
 * 自动完成环境配置和依赖安装
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 欢迎使用金价爬虫工具初始化脚本！\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    // 1. 检查 Node.js 版本
    console.log('📋 检查环境...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      console.error('❌ 需要 Node.js 18 或更高版本，当前版本:', nodeVersion);
      process.exit(1);
    }
    console.log('✅ Node.js 版本检查通过:', nodeVersion);

    // 2. 安装依赖
    console.log('\n📦 安装项目依赖...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ 依赖安装完成');
    } catch (error) {
      console.error('❌ 依赖安装失败:', error.message);
      process.exit(1);
    }

    // 3. 安装 Playwright 浏览器
    console.log('\n🎭 安装 Playwright 浏览器...');
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('✅ Playwright 浏览器安装完成');
    } catch (error) {
      console.error('❌ Playwright 安装失败:', error.message);
      console.log('💡 你可以稍后手动运行: npx playwright install chromium');
    }

    // 4. 配置环境变量
    console.log('\n⚙️  配置环境变量...');
    const envPath = '.env';
    
    if (fs.existsSync(envPath)) {
      const overwrite = await question('📄 .env 文件已存在，是否覆盖？(y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('⏭️  跳过环境变量配置');
        rl.close();
        return;
      }
    }

    console.log('\n请输入 Supabase 配置信息:');
    const supabaseUrl = await question('🔗 Supabase URL: ');
    const supabaseKey = await question('🔑 Supabase Anon Key: ');
    
    const schedule = await question('⏰ 定时任务 Cron 表达式 (默认每小时执行): ') || '0 * * * *';
    const headless = await question('👻 是否无头模式运行 (Y/n): ');
    
    const envContent = `# Supabase 配置
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}

# 爬虫配置
SCRAPER_HEADLESS=${headless.toLowerCase() !== 'n'}
SCRAPER_TIMEOUT=30000
SCRAPER_RETRY_COUNT=3

# 定时任务配置 (cron 格式)
GOLD_PRICE_SCHEDULE=${schedule}

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ 环境变量配置完成');

    // 5. 创建必要的目录
    console.log('\n📁 创建项目目录...');
    const dirs = ['logs', 'data', 'backup'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 创建目录: ${dir}`);
      }
    });

    // 6. 编译 TypeScript
    console.log('\n🔨 编译 TypeScript...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ TypeScript 编译完成');
    } catch (error) {
      console.error('❌ TypeScript 编译失败:', error.message);
    }

    console.log('\n🎉 初始化完成！');
    console.log('\n📖 接下来你可以:');
    console.log('   npm run dev          # 开发模式运行');
    console.log('   npm run dev -- -m    # 手动执行一次爬取');
    console.log('   npm start            # 生产模式运行');
    console.log('   npm run scrape:gold  # 单独运行金价爬虫');
    
    const testRun = await question('\n🧪 是否现在测试运行一次？(Y/n): ');
    if (testRun.toLowerCase() !== 'n') {
      console.log('\n🧪 测试运行中...');
      try {
        execSync('npm run dev -- --manual', { stdio: 'inherit' });
        console.log('✅ 测试运行成功！');
      } catch (error) {
        console.error('❌ 测试运行失败，请检查配置');
      }
    }

  } catch (error) {
    console.error('❌ 初始化过程中出现错误:', error.message);
  } finally {
    rl.close();
  }
}

setup();
