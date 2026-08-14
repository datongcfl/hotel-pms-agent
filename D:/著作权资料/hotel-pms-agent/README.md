# Hotel PMS Cashier Agent

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的酒店 PMS 收银 Agent。

## 功能概览

| 模块 | 功能 |
|------|------|
| 客人管理 | 查询客人信息、历史消费记录 |
| 账单处理 | 退房结算、账单查询、消费录入 |
| 支付处理 | 现金/银行卡/微信/支付宝/挂账 |
| 发票管理 | 开具/作废/查询增值税发票 |
| 房态管理 | 查询/更新房间状态 |
| 报表生成 | 日收入/交班/应收/房态报表 |
| 交接班 | 交接班记录、日结夜审 |
| 安全护栏 | 审计日志、操作确认、敏感信息脱敏 |

## 项目结构

```
hotel-pms-agent/
├── profile/
│   ├── package.json              # Profile 依赖配置
│   └── cordis.patch.yml          # 主配置（系统提示词、工具顺序、计费规则）
├── plugins/
│   ├── pms-tools/                # PMS 核心工具插件
│   │   ├── src/
│   │   │   ├── index.ts          # 插件入口
│   │   │   ├── tools/
│   │   │   │   ├── guest.ts      # 客人管理（query_guest, query_guest_history）
│   │   │   │   ├── billing.ts    # 账单处理（calculate_checkout, query_billing, post_charge）
│   │   │   │   ├── payment.ts    # 支付处理（process_payment, query_payments）
│   │   │   │   ├── invoice.ts    # 发票管理（generate_invoice, void_invoice, query_invoice）
│   │   │   │   ├── room.ts       # 房态管理（query_room, update_room_status）
│   │   │   │   ├── report.ts     # 报表生成（generate_report）
│   │   │   │   └── shift.ts      # 交接班（shift_handover, daily_close）
│   │   │   └── utils/
│   │   │       └── billing.ts    # 计费工具函数（房费、税、服务费）
│   │   └── cordis.patch.yml
│   ├── pms-knowledge/            # 酒店业务知识插件
│   │   └── src/index.ts
│   └── pms-guard/                # 安全护栏插件
│       └── src/index.ts          # 审计日志、操作确认、脱敏
├── skills/
│   ├── check-out-settlement/     # 退房结算技能
│   │   └── SKILL.md
│   ├── daily-close/              # 日结技能
│   │   └── SKILL.md
│   └── dispute-resolution/       # 客诉处理技能
│       └── SKILL.md
├── AGENTS.md                     # Agent 工作指南
└── README.md
```

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 22.19 或 >= 24
- [pnpm](https://pnpm.io/) 包管理器
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

### 安装

```bash
# 1. 克隆 DeepSeek Harness
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install && pnpm run build

# 2. 克隆本项目
git clone https://github.com/YOUR_USERNAME/hotel-pms-agent.git

# 3. 安装插件到 Profile
dsh plugin --profile hotel-pms add ./hotel-pms-agent/plugins/pms-tools
dsh plugin --profile hotel-pms add ./hotel-pms-agent/plugins/pms-knowledge
dsh plugin --profile hotel-pms add ./hotel-pms-agent/plugins/pms-guard
```

### 配置环境变量

```bash
export DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
export PMS_DB_URL="mysql://user:pass@localhost:3306/hotel_pms"
export PAYMENT_GATEWAY_URL="https://pay.example.com/api"
export PAYMENT_GATEWAY_KEY="your-payment-key"
export INVOICE_SYSTEM_URL="https://inv.example.com/api"
```

### 启动

```bash
# 验证配置
dsh --profile hotel-pms --dump-config

# 启动 Web UI
dsh --profile hotel-pms web

# CLI 模式（单次任务）
dsh --profile hotel-pms "301房客人退房，算一下费用"
```

## 使用示例

### 退房结算

```
用户：301房客人要退房，算一下总共多少钱

Agent：[调用 query_guest → calculate_checkout]
→ 301房客人张先生，入住3天，退房费用如下：
  - 房费：3晚 × ¥580 = ¥1,740
  - minibar：¥85
  - 洗衣：¥40
  - 服务费（10%）：¥186.50
  - 增值税（6%）：¥123.09
  - 总计：¥2,174.59

用户：他用微信支付

Agent：[调用 process_payment]
→ 微信支付成功 ¥2,174.59，交易号：WX20260814001

用户：开发票，抬头XX科技有限公司，税号91110...

Agent：[调用 generate_invoice]
→ 增值税普票已开具，发票号：02600012345
```

### 日结

```
用户：做今天的日结

Agent：[调用 daily_close]
→ 检查未结账单...
  未结账单：2笔（308房、412房未退房）
  收入合计：¥45,680.00
  账目平衡：是
  日结完成，数据已归档
```

## 计费规则

| 规则 | 说明 |
|------|------|
| 退房 ≤ 14:00 | 免当日房费 |
| 14:00-18:00 退房 | 加收 50% 房费 |
| > 18:00 退房 | 加收 100% 房费 |
| 服务费 | 10%（协议单位免收） |
| 住宿增值税 | 6% |
| 餐饮增值税 | 6% |
| 商品增值税 | 13% |

## 安全机制

| 机制 | 说明 |
|------|------|
| 审计日志 | 所有操作自动记录，不可删除 |
| 操作确认 | 退款/作废发票/调账需二次确认 |
| 金额限制 | 单笔 > 5000 需审批，退款 > 10000 需审批 |
| 敏感信息 | 身份证/手机号自动脱敏 |
| 双向校验 | 所有金额计算自动校验 |

## 自定义

### 修改计费规则

编辑 `profile/cordis.patch.yml` 中的 `pms-tools.config`：

```yaml
- id: pms-tools
  config:
    taxRate:
      room: 0.06        # 住宿税率
      catering: 0.06    # 餐饮税率
      goods: 0.13       # 商品税率
    serviceChargeRate: 0.10  # 服务费率
    halfDayDeadline: '14:00' # 半日租界限
    fullDayDeadline: '18:00' # 全日租界限
```

### 添加自定义工具

参考 `plugins/pms-tools/src/tools/` 下的实现模式：

```typescript
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'your_tool_name',
  description: '工具描述',
  parameters: { /* 参数定义 */ },
  output: { /* 输出定义 */ },
  async execute(args) {
    // 业务逻辑
    return 'result'
  }
}))
```

## 技术栈

| 组件 | 技术 |
|------|------|
| Agent 框架 | [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) |
| 模型 | DeepSeek（可替换） |
| 语言 | TypeScript |
| 数据库 | MySQL（可配置 PostgreSQL / SQL Server） |
| 支付 | 银联商务（可配置其他网关） |
| 发票 | 百望云（可配置其他系统） |

## License

MIT
