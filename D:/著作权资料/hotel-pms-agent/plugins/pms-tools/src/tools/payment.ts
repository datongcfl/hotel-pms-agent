import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 支付处理工具
 */
export function registerPaymentTools(ctx: Context, config: Config) {

  /** 处理支付 */
  ctx.tools.register(defineTool({
    name: 'process_payment',
    description: '处理客人支付（现金/银行卡/微信/支付宝/挂账）',
    parameters: {
      reservationId: { type: 'string', required: true, description: '入住编号' },
      amount: { type: 'number', required: true, description: '支付金额' },
      method: {
        type: 'string',
        required: true,
        description: '支付方式：cash/credit_card/wechat/alipay/on_account(挂账)'
      },
      onAccountInfo: {
        type: 'object',
        description: '挂账信息（挂账时必填）',
        properties: {
          companyName: { type: 'string', description: '协议单位名称' },
          contractNo: { type: 'string', description: '协议编号' }
        }
      },
      isRefund: {
        type: 'boolean',
        description: '是否退款（默认 false）',
        default: false
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      // === 退款需二次确认 ===
      if (args.isRefund) {
        if (args.amount > 10000) {
          return `退款 ¥${args.amount.toFixed(2)} 超过单笔上限 ¥10000，需要值班经理审批`
        }
        return `需要确认：退款 ¥${args.amount.toFixed(2)}（${getMethodText(args.method)}），请确认是否执行？`
      }

      // === 大额支付需审批 ===
      if (args.amount > 5000) {
        return `支付金额 ¥${args.amount.toFixed(2)} 超过 5000 元，需要值班经理审批`
      }

      // === 挂账校验 ===
      if (args.method === 'on_account') {
        if (!args.onAccountInfo?.companyName || !args.onAccountInfo?.contractNo) {
          return `挂账需要提供协议单位名称和协议编号`
        }
        const contract = await verifyContract(
          args.onAccountInfo.companyName,
          args.onAccountInfo.contractNo,
          config
        )
        if (!contract.valid) {
          return `协议验证失败：${contract.reason}`
        }
      }

      // === 调用支付网关 ===
      const result = await callPaymentGateway(args, config)

      // === 记录审计日志 ===
      await logPaymentAudit({
        action: args.isRefund ? 'refund' : 'payment',
        amount: args.amount,
        method: args.method,
        reservationId: args.reservationId,
        transactionId: result.transactionId,
        timestamp: new Date().toISOString(),
        operator: 'pms-agent'
      }, config)

      const prefix = args.isRefund ? '退款' : '支付'
      return `${prefix}成功：¥${args.amount.toFixed(2)}（${getMethodText(args.method)}），交易号：${result.transactionId}`
    }
  }))

  /** 查询支付记录 */
  ctx.tools.register(defineTool({
    name: 'query_payments',
    description: '查询支付/退款记录',
    parameters: {
      reservationId: { type: 'string', description: '入住编号' },
      startDate: { type: 'string', description: '开始日期' },
      endDate: { type: 'string', description: '结束日期' },
      method: { type: 'string', description: '支付方式筛选' }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const payments = await queryPaymentRecords(args, config)
      return formatPayments(payments)
    }
  }))
}

// ============================================
// 支付网关调用
// ============================================

async function callPaymentGateway(args: any, config: Config) {
  console.log(`[PMS] Call payment gateway: ${config.paymentGateway}`)
  // TODO: 实现实际支付网关调用
  // const response = await fetch(`${config.paymentGateway}/pay`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${config.paymentKey}` },
  //   body: JSON.stringify(args)
  // })
  return { transactionId: `TXN${Date.now()}`, status: 'success' }
}

async function verifyContract(companyName: string, contractNo: string, config: Config) {
  console.log(`[PMS] Verify contract: ${companyName} / ${contractNo}`)
  // TODO: 实现协议验证
  return { valid: true }
}

async function logPaymentAudit(record: any, config: Config) {
  console.log(`[PMS-AUDIT]`, record)
  // TODO: 写入审计日志
}

async function queryPaymentRecords(args: any, config: Config) {
  console.log(`[PMS] Query payments:`, args)
  return []
}

// ============================================
// 辅助函数
// ============================================

function getMethodText(method: string): string {
  const map: Record<string, string> = {
    cash: '现金',
    credit_card: '银行卡',
    wechat: '微信支付',
    alipay: '支付宝',
    on_account: '挂账'
  }
  return map[method] || method
}

function formatPayments(payments: any[]): string {
  if (payments.length === 0) return '暂无支付记录'
  const lines = ['=== 支付记录 ===']
  for (const p of payments) {
    lines.push(`${p.timestamp} | ${getMethodText(p.method)} | ¥${p.amount} | ${p.transactionId}`)
  }
  return lines.join('\n')
}
