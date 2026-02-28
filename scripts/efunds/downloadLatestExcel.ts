import * as dotenv from "dotenv";

import * as fs from "fs";

import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const FUND_CODE = "515180";

const FUND_SETUP_DATE = "2019-11-26";

const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../public/excel/易方达中证红利ETF_基金净值.xlsx"
);

/**
 * 获取北京时区当日日期，格式 YYYY-MM-DD
 */
const getBeijingDateString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

export const downloadExcel = async (): Promise<void> => {
  const endDate = getBeijingDateString();

  const url =
    `https://api.efunds.com.cn/xcowch/front/fund/nav/export` +
    `?fundCode=${FUND_CODE}&startDate=${FUND_SETUP_DATE}&endDate=${endDate}`;

  console.log(`📅 下载范围: ${FUND_SETUP_DATE} ~ ${endDate}`);
  console.log(`🔗 下载地址: ${url}\n`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: "https://www.efunds.com.cn/",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败: HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";

  console.log(`📋 响应类型: ${contentType}`);

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength === 0) {
    throw new Error("下载内容为空，可能 API 已变更或需要登录");
  }

  const dir = path.dirname(OUTPUT_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, Buffer.from(buffer));

  const sizeKB = (buffer.byteLength / 1024).toFixed(1);

  console.log(`✅ 已保存到: ${OUTPUT_PATH}  (${sizeKB} KB)`);
};

// 直接运行此文件时才执行
if (require.main === module) {
  (async () => {
    console.log("🚀 开始下载易方达中证红利ETF历史净值 Excel\n");

    try {
      await downloadExcel();

      console.log("\n🎉 下载完成！");
      console.log("💡 可运行 pnpm run import:efunds 将数据导入 Supabase");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      console.error(`\n❌ 下载失败: ${message}`);

      process.exit(1);
    }
  })();
}
