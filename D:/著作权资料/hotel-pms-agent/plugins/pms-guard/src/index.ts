import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import * as fs from 'fs'
import * as path from 'path'

export const name = 'pms-guard'
export const inject = ['tools']

/**
 * 安全护栏配置
 */
export interface Config {
  /** 需要二次确认的操作 */
  requireConfirmationOperations: string[]
  /** 最大退款金额 */
  maxRefundAmount: number
  /** 审计日志路径 */
  auditLogPath: string
  /** 是否脱敏敏感信息 */
  sensitiveDataMasking: boolean
}

export const Config: Schema<Config> = Schema.object({
  requireConfirmationOperations: Schema.array(Schema.string()).default([
    'refund', 'void_invoice', 'adjust_balance', 'write_off'
  ]),
  maxRefundAmount: Schema.number().default(10000),
  auditLogPath: Schema.string().default('/var/log/pms-agent-audit.log'),
  sensitiveDataMasking: Schema.boolean().default(true),
})

/**
 * 安全护栏插件
 *
 * 功能：
 * 1. 拦截所有工具调用，记录审计日志
 * 2. 高风险操作（退款、作废发票、调账、冲账）需要二次确认
 * 3. 退款金额校验
 * 4. 敏感信息脱敏（身份证、手机号）
 */
export function apply(ctx: Context, config: Config) {

  // 确保审计日志目录存在
  ensureLogDir(config.auditLogPath)

  // 拦截工具调用
  ctx.tools.on('beforeCall', (event: any) => {
    const toolName = event.name
    const args = event.args || {}

    // 1. 记录审计日志
    writeAuditLog(config.auditLogPath, {
      tool: toolName,
      args: config.sensitiveDataMasking ? maskSensitive(args) : args,
      timestamp: new Date().toISOString(),
      operator: 'pms-agent'
    })

    // 2. 高风险操作需确认
    if (config.requireConfirmationOperations.includes(toolName)) {
      event.requireConfirmation = true
    }

    // 3. 退款金额校验
    if (toolName === 'process_payment' && args.isRefund === true) {
      if (args.amount > config.maxRefundAmount) {
        event.block = `退款金额 ¥${args.amount} 超过单笔上限 ¥${config.maxRefundAmount}，需要值班经理审批`
      }
    }

    // 4. 大额支付校验
    if (toolName === 'process_payment' && !args.isRefund) {
      if (args.amount > 5000) {
        event.block = `支付金额 ¥${args.amount} 超过 5000 元，需要值班经理审批`
      }
    }
  })

  // 工具调用完成后记录结果
  ctx.tools.on('afterCall', (event: any) => {
    writeAuditLog(config.auditLogPath, {
      tool: event.name,
      result: 'success',
      timestamp: new Date().toISOString()
    })
  })
}

// ============================================
// 审计日志
// ============================================

function ensureLogDir(logPath: string) {
  const dir = path.dirname(logPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function writeAuditLog(logPath: string, record: any) {
  const line = JSON.stringify(record) + '\n'
  try {
    fs.appendFileSync(logPath, line, 'utf-8')
  } catch (err) {
    console.error('[PMS-GUARD] Failed to write audit log:', err)
  }
}

// ============================================
// 敏感信息脱敏
// ============================================

function maskSensitive(data: any): any {
  if (typeof data !== 'object' || data === null) return data
  const masked = JSON.parse(JSON.stringify(data))

  // 身份证脱敏：前4后4
  if (masked.idCard) {
    masked.idCard = String(masked.idCard).replace(/(\d{4})\d{10}(\d{4})/, '$1******$2')
  }

  // 手机号脱敏：前3后4
  if (masked.phone) {
    masked.phone = String(masked.phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  // 递归处理嵌套对象
  for (const key of Object.keys(masked)) {
    if (typeof masked[key] === 'object') {
      masked[key] = maskSensitive(masked[key])
    }
  }

  return masked
}
