# 🌊 蓝海选品情报系统 · 飞书自动推送

每天北京时间 **10:00** 自动扫描独立站 / 亚马逊 / Etsy 蓝海商品，推送到飞书。

---

## 📋 你需要准备的东西（3样）

1. **GitHub 账号**（免费注册：github.com）
2. **Anthropic API Key**（你的 Claude API 密钥）
3. **飞书机器人 Webhook 地址**（下面教你建）

---

## 🚀 安装步骤（跟着做，大约15分钟）

### 第一步：创建飞书机器人

1. 打开飞书，进入你想接收消息的 **群组**
2. 点击右上角「设置」→「群机器人」→「添加机器人」
3. 选择「自定义机器人」→ 输入名字（比如：蓝海选品助手）→ 点完成
4. 复制显示的 **Webhook 地址**（格式：`https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx`）
5. 安全设置选「自定义关键词」，关键词填：`蓝海`

### 第二步：上传代码到 GitHub

1. 登录 [github.com](https://github.com)，点右上角「+」→「New repository」
2. 仓库名填：`blue-ocean-intel`，选 **Private（私有）**，点「Create repository」
3. 点「uploading an existing file」，把这个文件夹里的所有文件上传上去
   - 注意：`.github/workflows/daily-scan.yml` 这个路径要保留！
4. 点「Commit changes」

### 第三步：配置密钥（最关键！）

1. 在你的 GitHub 仓库页面，点「Settings」→ 左侧「Secrets and variables」→「Actions」
2. 点「New repository secret」，添加以下两条：

   | 名称 | 值 |
   |------|-----|
   | `ANTHROPIC_API_KEY` | 你的 Claude API Key（sk-ant-...） |
   | `FEISHU_WEBHOOK_URL` | 第一步复制的飞书 Webhook 地址 |

3. 每条填好后点「Add secret」

### 第四步：测试运行

1. 在仓库页面点「Actions」标签
2. 点左侧「🌊 蓝海选品日报」
3. 点右侧「Run workflow」→「Run workflow」
4. 等待 2-5 分钟，看飞书是否收到消息 ✅

---

## ⚙️ 自定义配置

打开 `scan.js` 文件，找到 `SCAN_TASKS` 部分，可以修改：

```js
const SCAN_TASKS = [
  {
    title: "🌐 独立站蓝海 · 美国 + 欧洲",
    channel: "indie",
    market: "美国 + 欧洲",   // ← 改这里换市场
    category: "全品类",       // ← 改这里换品类
  },
  // ... 可以增删任务
];
```

**支持的品类**：全品类、家居生活、宠物用品、健康美容、户外运动、厨房工具、儿童玩具、科技配件

**修改推送时间**：打开 `.github/workflows/daily-scan.yml`，修改 cron 表达式：
- 北京时间 10:00 = UTC `0 2 * * *`
- 北京时间 08:00 = UTC `0 0 * * *`
- 北京时间 12:00 = UTC `0 4 * * *`

---

## ❓ 常见问题

**Q：推送失败怎么办？**
A：在 GitHub Actions 页面点击失败的任务，看红色报错信息，通常是 API Key 填错了。

**Q：飞书没收到消息？**
A：检查群机器人的「关键词」设置，确保包含「蓝海」这个词。

**Q：能推送到多个飞书群吗？**
A：可以，创建多个飞书机器人，把 Webhook 用逗号分隔填入，然后让我帮你改代码支持多个推送。

**Q：API 费用大概多少？**
A：每次扫描约消耗 6000-8000 tokens（3个任务），约 $0.02-0.03 美元/天。

---

## 📞 需要帮助？

把报错信息发给 Claude，我来帮你排查！
