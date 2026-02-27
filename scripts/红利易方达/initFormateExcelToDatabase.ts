import * as dotenv from "dotenv";

import * as XLSX from "xlsx";

import * as path from "path";

import { EFundsDividendDatabase } from "../../src/database/efunds-dividend-database";

import { YfdDividendInsert } from "../../src/database/efunds-dividend-database";

import { formatTimestamp } from "../../src/utils/helpers";

import { downloadExcel } from "./downloadLatestExcel";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const EXCEL_PATH = path.resolve(
  __dirname,
  "../../public/excel/易方达中证红利ETF_基金净值.xlsx"
);

const SOURCE = "excel-import";

// Excel 列名 → 字段映射
const COL_DATE = "净值日期";
const COL_NET_PRICE = "单位净值(元)";
const COL_NET_SCALE = "日涨跌";
const COL_NET_TOTSL = "累计净值(元)";

/**
 * 将 Excel 日期值转换为 YYYY-MM-DD 字符串
 * - Date 对象直接格式化
 * - Excel 序列号（数字）通过 xlsx 转换
 * - 字符串直接清洗斜杠
 */
const formatDate = (value: unknown): string => {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    const m = String(date.m).padStart(2, "0");
    const d = String(date.d).padStart(2, "0");

    return `${date.y}-${m}-${d}`;
  }

  return String(value).replace(/\//g, "-").trim();
};

/**
 * 解析涨跌幅
 * Excel 百分比格式存为小数（0.54% → 0.0054），需要 ×100
 * 文本格式（"+0.54%"）去掉符号直接解析
 */
const parseScale = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    // Excel percentage cell：0.0054 表示 0.54%，转成 0.54 存储
    return parseFloat((value * 100).toFixed(4));
  }

  const str = String(value).replace(/[%+\s]/g, "").trim();

  return isNaN(parseFloat(str)) ? 0 : parseFloat(str);
};

/**
 * 解析数字字段，兼容字符串和数字类型
 */
const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;

  const str = String(value).replace(/[,\s]/g, "").trim();

  return isNaN(parseFloat(str)) ? 0 : parseFloat(str);
};

/**
 * 读取 Excel 并转换为 YfdDividendInsert 数组
 */
const readExcel = (): YfdDividendInsert[] => {
  console.log(`📂 读取 Excel: ${EXCEL_PATH}`);

  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  console.log(`📊 共读取 ${rows.length} 行数据`);

  if (rows.length > 0) {
    console.log("📋 列名:", Object.keys(rows[0]));
    console.log("📋 第一行示例:", rows[0]);
  }

  const createdAt = formatTimestamp();

  const records: YfdDividendInsert[] = rows
    .filter((row) => row[COL_DATE] != null && row[COL_NET_PRICE] != null)
    .map((row) => ({
      date: formatDate(row[COL_DATE]),
      net_price: parseNumber(row[COL_NET_PRICE]),
      net_totsl: parseNumber(row[COL_NET_TOTSL]),
      net_scale: parseScale(row[COL_NET_SCALE]),
      source: SOURCE,
      created_at: createdAt,
    }));

  records.reverse();

  console.log(`✅ 有效数据 ${records.length} 条（已转为正序）`);

  return records;
};

/**
 * 主流程
 */
const run = async () => {
  console.log("🚀 开始同步易方达中证红利ETF历史净值数据\n");

  // 1. 下载最新 Excel
  console.log("⬇️  步骤 1/3：下载最新 Excel...");

  await downloadExcel();

  console.log();

  const records = readExcel();

  if (records.length === 0) {
    console.error("❌ 没有读取到有效数据，终止");
    process.exit(1);
  }

  console.log("\n📋 数据预览（后3条）:");
  console.table(records.slice(-3));

  const db = new EFundsDividendDatabase();

  // 3. 清空并重新写入
  console.log("\n🗑️  步骤 3/3：清空 yfd_dividend 表并写入...");

  const deleted = await db.deleteAllRecords();

  if (!deleted) {
    console.error("❌ 清空表失败，终止");
    process.exit(1);
  }

  console.log(`💾 批量插入 ${records.length} 条记录...`);

  const inserted = await db.batchInsert(records);

  if (inserted) {
    console.log(`\n🎉 导入完成！成功写入 ${records.length} 条记录到 yfd_dividend`);
  } else {
    console.error("❌ 批量插入失败");
    process.exit(1);
  }
};

run().catch((err) => {
  console.error("💥 脚本执行失败:", err);
  process.exit(1);
});
