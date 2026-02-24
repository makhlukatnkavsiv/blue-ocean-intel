/**
 * 蓝海选品情报 - 每日自动扫描 + 飞书推送
 * 使用方法：node scan.js
 */

const https = require("https");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;

// ─────────────────────────────────────────
// 📋 扫描任务配置（可自由修改）
// ─────────────────────────────────────────
const SCAN_TASKS = [
  {
    title: "🌐 独立站蓝海 · 美国 + 欧洲",
    channel: "indie",
    market: "美国 + 欧洲",
    category: "全品类",
  },
  {
    title: "📦 亚马逊趋势 · 美国站",
    channel: "amazon",
    market: "美国站",
    category: "全品类",
  },
  {
    title: "🎨 Etsy爆品 · 全球",
    channel: "etsy",
    market: "全球",
    category: "全品类",
  },
];

// ─────────────────────────────────────────
// 🤖 构建提示词
// ─────────────────────────────────────────
function buildPrompt(task) {
  const today = new Date().toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  const prompts = {
    indie: `你是一个顶级Shopify独立站选品专家。今天是${today}，请为我找出当前针对${task.market}市场、品类"${task.category}"的蓝海独立站商品Top 5。

蓝海标准：竞争对手少、用户需求真实、利润率>40%、适合FB/TikTok广告、近1周有上升趋势。

输出JSON数组（用\`\`\`json包裹），每个商品包含：
{"name":"商品名","category":"品类","trend":"趋势如↑本周搜索+35%","price_range":"$29-$49","profit_margin":"55%-65%","blue_score":8,"profit_score":9,"reasons":["蓝海原因1","原因2"],"action":"最关键的一个行动建议"}`,

    amazon: `你是一个亚马逊选品分析专家。今天是${today}，分析${task.market}中可在独立站复制的蓝海机会商品Top 5。

重点：亚马逊有销量但独立站未开发、BSR快速上升新品、可以高客单价在独立站售卖。

输出JSON数组（用\`\`\`json包裹）：
{"name":"商品名","category":"品类","trend":"趋势","price_range":"建议独立站售价","profit_margin":"利润率","blue_score":7,"profit_score":8,"reasons":["机会点1","机会点2"],"action":"行动建议"}`,

    etsy: `你是一个Etsy市场研究专家。今天是${today}，找出${task.market}Etsy近期爆品中可在独立站高溢价售卖的商品Top 5。

重点：Etsy销量好但可品牌化、用户愿意为独特性付溢价、搜索量上升但供给不足。

输出JSON数组（用\`\`\`json包裹）：
{"name":"商品名","category":"品类","trend":"趋势","price_range":"独立站建议售价","profit_margin":"利润率","blue_score":8,"profit_score":7,"reasons":["机会点1","机会点2"],"action":"行动建议"}`,
  };
  return prompts[task.channel];
}

// ─────────────────────────────────────────
// 🔌 调用 Anthropic API
// ─────────────────────────────────────────
function callAnthropic(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) return reject(new Error(json.error.message));
            const text = (json.content || [])
              .filter((b) => b.type === "text")
              .map((b) => b.text)
              .join("\n");
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────
// 📊 解析商品JSON
// ─────────────────────────────────────────
function parseProducts(text) {
  try {
    const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*?\])/);
    if (m) return JSON.parse(m[1]);
  } catch {}
  return [];
}

// ─────────────────────────────────────────
// 📨 构建飞书消息卡片
// ─────────────────────────────────────────
function buildFeishuCard(allResults, scanDate) {
  const elements = [];

  // 标题区
  elements.push({
    tag: "div",
    text: {
      tag: "lark_md",
      content: `📅 **${scanDate}** · 北京时间 10:00 自动推送\n🎯 今日共发现 **${allResults.reduce((s, r) => s + r.products.length, 0)}** 个蓝海机会`,
    },
  });

  elements.push({ tag: "hr" });

  // 各渠道结果
  for (const result of allResults) {
    if (!result.products.length) continue;

    elements.push({
      tag: "div",
      text: { tag: "lark_md", content: `**${result.title}**` },
    });

    for (let i = 0; i < result.products.length; i++) {
      const p = result.products[i];
      const blueBar = "🟦".repeat(Math.round((p.blue_score || 7) / 2)) + "⬜".repeat(5 - Math.round((p.blue_score || 7) / 2));
      const profitBar = "🟩".repeat(Math.round((p.profit_score || 7) / 2)) + "⬜".repeat(5 - Math.round((p.profit_score || 7) / 2));

      elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: [
            `**#${i + 1} ${p.name}**`,
            `${p.trend || ""} · ${p.category || ""}`,
            `💰 售价：${p.price_range || "—"} · 利润：${p.profit_margin || "—"}`,
            `蓝海 ${blueBar} ${p.blue_score}/10 · 暴利 ${profitBar} ${p.profit_score}/10`,
            `📌 ${(p.reasons || []).slice(0, 2).join(" / ")}`,
            `✅ ${p.action || ""}`,
          ].join("\n"),
        },
      });
    }

    elements.push({ tag: "hr" });
  }

  // 底部提示
  elements.push({
    tag: "note",
    elements: [
      {
        tag: "plain_text",
        content: "⚡ 由 Blue Ocean Intel 自动生成 · 数据仅供参考，实际选品请结合市场验证",
      },
    ],
  });

  return {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: "🌊 蓝海选品日报" },
        template: "blue",
      },
      elements,
    },
  };
}

// ─────────────────────────────────────────
// 📤 发送飞书消息
// ─────────────────────────────────────────
function sendToFeishu(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(FEISHU_WEBHOOK);
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────
// 🚀 主流程
// ─────────────────────────────────────────
async function main() {
  console.log("🌊 蓝海选品情报系统启动...");

  if (!ANTHROPIC_API_KEY) throw new Error("缺少 ANTHROPIC_API_KEY 环境变量");
  if (!FEISHU_WEBHOOK) throw new Error("缺少 FEISHU_WEBHOOK_URL 环境变量");

  const scanDate = new Date().toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "long", day: "numeric",
  });

  const allResults = [];

  for (const task of SCAN_TASKS) {
    console.log(`\n🔍 扫描中：${task.title}`);
    try {
      const prompt = buildPrompt(task);
      const raw = await callAnthropic(prompt);
      const products = parseProducts(raw);
      console.log(`  ✅ 发现 ${products.length} 个商品`);
      products.forEach((p, i) => console.log(`     ${i + 1}. ${p.name} (蓝海${p.blue_score}/暴利${p.profit_score})`));
      allResults.push({ title: task.title, products });
    } catch (e) {
      console.error(`  ❌ 失败：${e.message}`);
      allResults.push({ title: task.title, products: [] });
    }

    // 避免请求过快
    if (SCAN_TASKS.indexOf(task) < SCAN_TASKS.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("\n📨 发送到飞书...");
  const card = buildFeishuCard(allResults, scanDate);
  const result = await sendToFeishu(card);
  console.log("  飞书响应：", result);
  console.log("\n✅ 推送完成！");
}

main().catch((e) => {
  console.error("💥 致命错误：", e.message);
  process.exit(1);
});
