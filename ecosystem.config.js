const sharedConfig = {
  script: "node",
  instances: 1,
  exec_mode: "fork",
  env_file: "./.env",
  autorestart: true,
  watch: false,
  max_memory_restart: "500M",
  restart_delay: 5000,
  max_restarts: 10,
  min_uptime: "10s",
  kill_timeout: 5000,
  merge_logs: true,
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
};

module.exports = {
  apps: [
    // ─── 黄金价格爬虫 ──────────────────────────────────────────────────────
    {
      ...sharedConfig,
      name: "gold-scraper",
      args: "-r dotenv/config ./dist/index.js --scraper gold-price",
      log_file:  "./logs/gold-pm2-combined.log",
      out_file:  "./logs/gold-pm2-out.log",
      error_file:"./logs/gold-pm2-error.log",
      env: {
        NODE_ENV: "production",
        SCRAPER_HEADLESS: "true",
      },
    },

    // ─── 易方达中证红利ETF 爬虫 ───────────────────────────────────────────
    {
      ...sharedConfig,
      name: "efunds-scraper",
      args: "-r dotenv/config ./dist/index.js --scraper efunds-dividend",
      log_file:  "./logs/efunds-pm2-combined.log",
      out_file:  "./logs/efunds-pm2-out.log",
      error_file:"./logs/efunds-pm2-error.log",
      env: {
        NODE_ENV: "production",
        SCRAPER_HEADLESS: "true",
      },
    },
  ],
};
