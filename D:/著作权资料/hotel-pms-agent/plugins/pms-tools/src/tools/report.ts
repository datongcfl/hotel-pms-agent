import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 报表生成工具
 */
export function registerReportTools(ctx: Context, config: Config) {

  /** 生成日结报表 */
  ctx.tools.register(defineTool({
    name: 'generate_report',
    description: '生成各类财务报表',
    parameters: {
      reportType: {
        type: 'string',
        required: true,
        description: '报表类型：daily_revenue(日收入) / shift_summary(交班) / ar_aging(应收账龄) / occupancy(房态统计)'
      },
      date: {
        type: 'string',
        required: true,
        description: '报表日期 YYYY-MM-DD'
      },
      shift: {
        type: 'string',
        description: '班次（交班报表用）：morning / evening / night'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const report = await generateReportData(args.reportType, args.date, args.shift, config)
      return formatReport(report, args.reportType)
    }
  }))
}

async function generateReportData(type: string, date: string, shift: string | undefined, config: Config) {
  console.log(`[PMS] Generate report: ${type} for ${date}`)
  return {
    type,
    date,
    roomRevenue: 0,
    cateringRevenue: 0,
    otherRevenue: 0,
    totalRevenue: 0,
    cashIncome: 0,
    cardIncome: 0,
    mobilePayIncome: 0,
    onAccountAmount: 0,
    occupancyRate: 0,
    details: []
  }
}

function formatReport(data: any, type: string): string {
  const lines: string[] = [`=== ${getReportTitle(type)} ===`, `日期：${data.date}`, '']

  if (type === 'daily_revenue') {
    lines.push(
      `【收入汇总】`,
      `房费收入：¥${data.roomRevenue.toFixed(2)}`,
      `餐饮收入：¥${data.cateringRevenue.toFixed(2)}`,
      `其他收入：¥${data.otherRevenue.toFixed(2)}`,
      `收入合计：¥${data.totalRevenue.toFixed(2)}`,
      ``,
      `【收款方式】`,
      `现金：¥${data.cashIncome.toFixed(2)}`,
      `银行卡：¥${data.cardIncome.toFixed(2)}`,
      `移动支付：¥${data.mobilePayIncome.toFixed(2)}`,
      `挂账：¥${data.onAccountAmount.toFixed(2)}`,
      ``,
      `出租率：${(data.occupancyRate * 100).toFixed(1)}%`
    )
  }

  return lines.join('\n')
}

function getReportTitle(type: string): string {
  const map: Record<string, string> = {
    daily_revenue: '日收入报表',
    shift_summary: '交班报表',
    ar_aging: '应收账龄报表',
    occupancy: '房态统计表'
  }
  return map[type] || type
}
