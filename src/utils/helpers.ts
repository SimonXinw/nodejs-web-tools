/**
 * 通用工具函数
 */

/**
 * 随机延迟函数
 * @param min 最小延迟时间(毫秒)
 * @param max 最大延迟时间(毫秒)
 */
export const randomDelay = (min: number = 1000, max: number = 3000): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 重试执行函数
 * @param fn 要执行的异步函数
 * @param maxRetries 最大重试次数
 * @param delayMs 重试间隔时间(毫秒)
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T | null> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        await randomDelay(delayMs, delayMs * 2);
      }
      return await fn();
    } catch (error) {
      console.log(`尝试 ${i + 1}/${maxRetries} 失败:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
  return null;
};

/**
 * 解析价格字符串为数字
 * @param priceText 价格文本
 */
export const parsePrice = (priceText: string): number => {
  if (!priceText) return 0;
  
  // 移除货币符号、逗号、空格等
  const cleanText = priceText.replace(/[$,\s€£¥]/g, '');
  const price = parseFloat(cleanText);
  
  return isNaN(price) ? 0 : price;
};

/**
 * 格式化时间戳
 * @param date 日期对象或时间戳
 */
export const formatTimestamp = (date?: Date | number | string): string => {
  const d = date ? new Date(date) : new Date();
  return d.toISOString();
};

/**
 * 验证环境变量
 * @param requiredVars 必需的环境变量列表
 */
export const validateEnvVars = (requiredVars: string[]): void => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }
};

/**
 * 安全的JSON解析
 * @param jsonString JSON字符串
 * @param defaultValue 默认值
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};
