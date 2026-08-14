import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 发票管理工具
 */
export function registerInvoiceTools(ctx: Context, config: Config) {

  /** 开具发票 */
  ctx.tools.register(defineTool({
    name: 'generate_invoice',
    description: '开具增值税发票（普通发票或专用发票）',
    parameters: {
      reservationId: {
        type: 'string',
        required: true,
        description: '入住编号'
      },
      invoiceType: {
        type: 'string',
        required: true,
        description: '发票类型：general(普票) / special(专票)'
      },
      title: {
        type: 'string',
        required: true,
        description: '发票抬头（个人或企业名称）'
      },
      taxNumber: {
        type: 'string',
        description: '税号（专票必填，普票企业抬头必填）'
      },
      bankName: { type: 'string', description: '开户银行（专票必填）' },
      bankAccount: { type: 'string', description: '银行账号（专票必填）' },
      address: { type: 'string', description: '地址（专票必填）' },
      phone: { type: 'string', description: '电话（专票必填）' },
      email: { type: 'string', description: '接收邮箱' },
      items: {
        type: 'array',
        description: '开票项目（默认取全部消费）',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' },
            taxRate: { type: 'number' }
          }
        }
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      // 专票信息完整性校验
      if (args.invoiceType === 'special') {
        const missing = []
        if (!args.taxNumber) missing.push('税号')
        if (!args.bankName) missing.push('开户银行')
        if (!args.bankAccount) missing.push('银行账号')
        if (!args.address) missing.push('地址')
        if (!args.phone) missing.push('电话')
        if (missing.length > 0) {
          return `专票信息不完整，缺少：${missing.join('、')}`
        }
      }

      // 调用发票系统
      const result = await callInvoiceSystem(args, config)

      // 记录审计日志
      await logInvoiceAudit({
        action: 'issue_invoice',
        invoiceType: args.invoiceType,
        title: args.title,
        reservationId: args.reservationId,
        invoiceNumber: result.invoiceNumber,
        timestamp: new Date().toISOString()
      }, config)

      const typeText = args.invoiceType === 'special' ? '增值税专用发票' : '增值税普通发票'
      return `${typeText}开具成功\n发票号码：${result.invoiceNumber}\n抬头：${args.title}\n金额：¥${result.amount}\n税额：¥${result.taxAmount}`
    }
  }))

  /** 作废发票 */
  ctx.tools.register(defineTool({
    name: 'void_invoice',
    description: '作废已开具的发票（需要二次确认）',
    parameters: {
      invoiceNumber: {
        type: 'string',
        required: true,
        description: '发票号码'
      },
      reason: {
        type: 'string',
        required: true,
        description: '作废原因'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `需要确认：作废发票 ${args.invoiceNumber}（原因：${args.reason}），请确认是否执行？`
    }
  }))

  /** 查询发票 */
  ctx.tools.register(defineTool({
    name: 'query_invoice',
    description: '查询发票开具记录',
    parameters: {
      invoiceNumber: { type: 'string', description: '发票号码' },
      reservationId: { type: 'string', description: '入住编号' },
      startDate: { type: 'string', description: '开始日期' },
      endDate: { type: 'string', description: '结束日期' }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const invoices = await queryInvoiceRecords(args, config)
      return formatInvoices(invoices)
    }
  }))
}

// ============================================
// 发票系统调用
// ============================================

async function callInvoiceSystem(args: any, config: Config) {
  console.log(`[PMS] Call invoice system: ${config.invoiceSystemUrl}`)
  // TODO: 实现实际调用
  return {
    invoiceNumber: `INV${Date.now()}`,
    amount: 0,
    taxAmount: 0,
    status: 'success'
  }
}

async function logInvoiceAudit(record: any, config: Config) {
  console.log(`[PMS-AUDIT]`, record)
}

async function queryInvoiceRecords(args: any, config: Config) {
  console.log(`[PMS] Query invoices:`, args)
  return []
}

function formatInvoices(invoices: any[]): string {
  if (invoices.length === 0) return '暂无发票记录'
  const lines = ['=== 发票记录 ===']
  for (const inv of invoices) {
    lines.push(`${inv.invoiceNumber} | ${inv.title} | ¥${inv.amount} | ${inv.date}`)
  }
  return lines.join('\n')
}
