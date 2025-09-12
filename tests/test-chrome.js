// 简化的 Chrome 浏览器测试脚本（支持自定义 chromedriver 路径）
import { chromium } from "playwright";
import fs from "fs";

// 根据操作系统自动选择 Chrome 可执行文件路径
let executablePath;

if (process.env.CHROME_EXECUTABLE_PATH) {
  executablePath = process.env.CHROME_EXECUTABLE_PATH;
} else if (process.platform === "win32") {
  // 常见 Windows Chrome 安装路径
  const winPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  executablePath = winPaths.find((p) => fs.existsSync(p));

  if (!executablePath) {
    console.warn(
      "未检测到常规 Windows Chrome 路径，建议设置 CHROME_EXECUTABLE_PATH 环境变量"
    );
    executablePath = winPaths[0]; // 默认给一个
  }
} else {
  // Linux 默认路径
  executablePath = "/usr/bin/google-chrome";
}

async function testChrome() {
  console.log("🧪 测试系统 Chrome 浏览器...");
  console.log(`使用的 Chrome 可执行文件路径: ${executablePath}`);

  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://www.example.com");
    const title = await page.title();

    console.log(`✅ 测试成功: ${title}`);

    await browser.close();
    console.log("✅ Chrome 浏览器配置正常!");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    process.exit(1);
  }
}

testChrome();
