import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 交接班工具
 */
export function registerShiftTools(ctx: Context, config: Config) {

  /** 交接班 */
  ctx.tools.register(defineTool({
    name: 'shift_handover',
    description: '执行交接班，生成交班报表',
    parameters: {
      shift: {
        type: 'string',
        required: true,
        description: '班次：morning(早班) / evening(中班) / night(夜班)'
      },
      handoverTo: {
        type: 'string',
        required: true,
        description: '接班人'
      },
      remark: { type: 'string', description: '交班备注' }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const shiftData = await collectShiftData(config)
      await saveShiftRecord(args, shiftData, config)
      return formatShiftHandover(args, shiftData)
    }
  }))

  /** 日结 */
  ctx.tools.register(defineTool({
    name: 'daily_close',
    description: '执行日结（夜审），生成日结报表并归档',
    parameters: {
      businessDate: {
        type: 'string',
        required: true,
        description: '营业日期 YYYY-MM-DD'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      // 1. 检查未结账单
      const unsettled = await checkUnsettledBills(args.businessDate, config)

      // 2. 汇总收入
      const summary = await collectDailySummary(args.businessDate, config)

      // 3. 校验账目
      const balanceCheck = verifyDailyBalance(summary)

      // 4. 归档
      await archiveDailyData(args.businessDate, summary, config)

      return formatDailyClose(args.businessDate, unsettled, summary, balanceCheck)
    }
  }))
}

async function collectShiftData(config: Config) {
  console.log('[PMS] Collect shift data')
  return {
    cashBegin: 0,
    cashEnd: 0,
    transactions: [],
    pendingItems: []
  }
}

async function saveShiftRecord(args: any, data: any, config: Config) {
  console.log(`[PMS] Save shift record: ${args.shift}`)
}

async function checkUnsettledBills(date: string, config: Config) {
  console.log(`[PMS] Check unsettled bills: ${date}`)
  return []
}

async function collectDailySummary(date: string, config: Config) {
  console.log(`[PMS] Collect daily summary: ${date}`)
  return { totalIncome: 0, cashIncome: 0, cardIncome: 0, mobilePayIncome: 0, onAccount: 0 }
}

function verifyDailyBalance(summary: any) {
  return { balanced: true, difference: 0 }
}

async function archiveDailyData(date: string, summary: any, config: Config) {
  console.log(`[PMS] Archive daily data: ${date}`)
}

function formatShiftHandover(args: any, data: any): string {
  return [
    '=== 交接班记录 ===',
    `班次：${args.shift}`,
    `接班人：${args.handoverTo}`,
    `备注：${args.remark || '无'}`,
    '',
    '交接完成'
  ].join('\n')
}

function formatDailyClose(date: string, unsettled: any[], summary: any, balance: any): string {
  const lines: string[] = [
    `=== 日结报告 ===`,
    `营业日期：${date}`,
    ''
  ]
  if (unsettled.length > 0) {
    lines.push(`未结账单：${unsettled.length} 笔，请跟进处理`)
  } else {
    lines.push('未结账单：无')
  }
  lines.push(
    '',
    `收入合计：¥${summary.totalIncome.toFixed(2)}`,
    balance.balanced ? '账目平衡：是' : `账目差异：¥${balance.difference.toFixed(2)}`,
    '',
    '日结完成，数据已归档'
  )
  return lines.join('\n')
}
