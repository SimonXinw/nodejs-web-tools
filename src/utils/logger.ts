import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * 日志工具类
 */
class Logger {
  private logger: winston.Logger;

  constructor() {
    // 确保日志目录存在
    const logDir = process.env.LOG_FILE_PATH || './logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
        })
      ),
      transports: [
        // 错误日志文件
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // 所有日志文件
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: Error | any): void {
    this.logger.error(message, error);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

// 导出单例实例
export const logger = new Logger();
