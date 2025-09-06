#!/usr/bin/env node

/**
 * 项目根目录入口文件
 * 提供简单的命令行界面来启动不同功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查是否已编译
function checkBuild() {
  if (!fs.existsSync('dist')) {
    console.log('🔨 首次运行，正在编译项目...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ 编译完成');
    } catch (error) {
      console.error('❌ 编译失败，请检查代码');
      process.exit(1);
    }
  }
}

// 检查环境变量
function checkEnv() {
  if (!fs.existsSync('.env')) {
    console.log('⚠️  未找到 .env 文件');
    console.log('请先运行: npm run setup');
    console.log('或手动复制: cp env.example .env');
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
🏆 Node.js 金价爬虫工具

用法:
  node index.js [选项]

选项:
  --help, -h        显示帮助信息
  --setup           运行初始化向导
  --dev             开发模式运行
  --api             启动 API 服务器
  --manual          手动执行一次爬取
  --test            测试爬虫功能
  --monitor         系统监控
  --backup          数据备份

示例:
  node index.js --dev     # 开发模式
  node index.js --api     # 带 API 服务器
  node index.js --manual  # 手动爬取一次
  node index.js --test    # 测试功能

更多信息请查看 README.md
  `);
}

// 主程序
function main() {
  const args = process.argv.slice(2);

  // 显示帮助
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    return;
  }

  // 初始化设置
  if (args.includes('--setup')) {
    console.log('🚀 启动初始化向导...');
    execSync('npm run setup', { stdio: 'inherit' });
    return;
  }

  // 检查环境
  checkEnv();

  try {
    if (args.includes('--dev')) {
      console.log('🔧 启动开发模式...');
      if (args.includes('--api')) {
        execSync('npm run dev:api', { stdio: 'inherit' });
      } else {
        execSync('npm run dev', { stdio: 'inherit' });
      }
    } else if (args.includes('--api')) {
      console.log('🌐 启动 API 服务器...');
      checkBuild();
      execSync('npm run start:api', { stdio: 'inherit' });
    } else if (args.includes('--manual')) {
      console.log('🎯 手动执行爬取...');
      execSync('npm run dev -- --manual', { stdio: 'inherit' });
    } else if (args.includes('--test')) {
      console.log('🧪 测试爬虫功能...');
      execSync('npm run test:scraper', { stdio: 'inherit' });
    } else if (args.includes('--monitor')) {
      console.log('📊 启动系统监控...');
      execSync('npm run monitor', { stdio: 'inherit' });
    } else if (args.includes('--backup')) {
      console.log('📦 启动数据备份...');
      execSync('npm run backup', { stdio: 'inherit' });
    } else {
      // 默认生产模式
      console.log('🚀 启动生产模式...');
      checkBuild();
      execSync('npm start', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 运行主程序
main();
