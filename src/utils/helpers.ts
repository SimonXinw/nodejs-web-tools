/**
 * 通用工具函数
 */

/**
 * 随机延迟函数
 * @param min 最小延迟时间(毫秒)
 * @param max 最大延迟时间(毫秒)
 */
export const randomDelay = (

  min: number = 1000,

  max: number = 3000

): Promise<void> => {

  const delay = Math.floor(Math.random() * (max - min + 1)) + min;

  return new Promise((resolve) => setTimeout(resolve, delay));

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
  const cleanText = priceText.replace(/[$,\s€£¥]/g, "");

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

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  const invalid = requiredVars.filter((varName) => {

    const value = process.env[varName];

    return (
      value &&
      (value.includes("your_") ||
        value.includes("_here") ||
        value === "your_supabase_project_url" ||
        value === "your_supabase_anon_key")
    );

  });

  if (missing.length > 0 || invalid.length > 0) {

    console.error("\n❌ 环境变量配置错误！\n");

    if (missing.length > 0) {

      console.error("缺少必需的环境变量:");

      missing.forEach((varName) => console.error(`  - ${varName}`));

      console.error("");

    }

    if (invalid.length > 0) {

      console.error("环境变量值无效（仍为占位符）:");

      invalid.forEach((varName) =>
        console.error(`  - ${varName}: ${process.env[varName]}`)
      );

      console.error("");

    }

    console.error("📋 配置步骤:");

    console.error("1. 访问 https://supabase.com 创建项目");

    console.error("2. 在项目设置 -> API 中获取:");

    console.error("   - Project URL (SUPABASE_URL)");

    console.error("   - anon public key (SUPABASE_ANON_KEY)");

    console.error("3. 在 SQL 编辑器中执行 scripts/init-database.sql");

    console.error("4. 更新 .env 文件中的配置");

    console.error("");

    console.error("示例配置:");

    console.error("SUPABASE_URL=https://abcdefgh.supabase.co");

    console.error("SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");

    console.error("");

    throw new Error(`环境变量配置错误: ${[...missing, ...invalid].join(", ")}`);

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
