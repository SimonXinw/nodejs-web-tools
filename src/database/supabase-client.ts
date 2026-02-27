/**
 * 兼容性转发层
 * 新代码请直接引用具体的数据库类：
 *   import { GoldPriceDatabase } from "./gold-price-database"
 *   import { EFundsDividendDatabase } from "./efunds-dividend-database"
 */
export { BaseDatabase as SupabaseDatabase } from "./base-database";

export { GoldPriceDatabase } from "./gold-price-database";

export { EFundsDividendDatabase } from "./efunds-dividend-database";
