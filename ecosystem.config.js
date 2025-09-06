/**
 * PM2 配置文件
 * 用于生产环境部署和进程管理
 */

module.exports = {
  apps: [
    {
      // 主应用
      name: 'gold-scraper',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      
      // 重启策略
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 5000,
      
      // 日志配置
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 进程管理
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // 高级配置
      node_args: '--max-old-space-size=512',
      
      // 健康检查
      health_check_grace_period: 10000,
      
      // 集群配置（如果需要）
      // instances: 'max',
      // exec_mode: 'cluster'
    },
    
    // 监控进程（可选）
    {
      name: 'gold-monitor',
      script: 'scripts/monitor.ts',
      interpreter: 'ts-node',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */6 * * *', // 每6小时重启一次
      
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      
      log_file: './logs/pm2-monitor.log',
      out_file: './logs/pm2-monitor-out.log',
      error_file: './logs/pm2-monitor-error.log',
      
      // 监控进程参数
      args: '--watch --save'
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/nodejs-web-tools.git',
      path: '/var/www/gold-scraper',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
