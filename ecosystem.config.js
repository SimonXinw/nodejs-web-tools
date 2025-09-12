module.exports = {
  apps: [
    {
      name: "gold-scraper",
      script: "node",
      args: "-r dotenv/config ./dist/index.js",

      // 基本配置
      instances: 1,
      exec_mode: "fork",

      // 环境变量文件
      env_file: "./.env",

      // 环境变量
      env: {
        NODE_ENV: "production",
        ENABLE_API: "true",
        API_PORT: 3667,
        SCRAPER_HEADLESS: "true",
      },

      // 开发环境
      env_development: {
        NODE_ENV: "development",
        ENABLE_API: "true",
        API_PORT: 3667,
        SCRAPER_HEADLESS: "true",
      },

      // 日志配置
      log_file: "./logs/pm2-combined.log",
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_type: "json",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // 重启策略
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",

      // 健康检查
      health_check_path: "/health",
      health_check_grace_period: 30000,

      // 其他配置
      kill_timeout: 5000,
    },
  ],
};
