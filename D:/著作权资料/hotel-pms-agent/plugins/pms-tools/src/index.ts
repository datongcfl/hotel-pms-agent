import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { registerGuestTools } from './tools/guest.js'
import { registerBillingTools } from './tools/billing.js'
import { registerPaymentTools } from './tools/payment.js'
import { registerInvoiceTools } from './tools/invoice.js'
import { registerRoomTools } from './tools/room.js'
import { registerReportTools } from './tools/report.js'
import { registerShiftTools } from './tools/shift.js'

export const name = 'pms-tools'
export const inject = ['tools']

/**
 * PMS 工具配置接口
 */
export interface Config {
  /** 数据库连接串 */
  databaseUrl: string
  /** 数据库类型 */
  databaseType: 'mysql' | 'postgresql' | 'sqlserver'
  /** 支付网关地址 */
  paymentGateway: string
  /** 支付网关密钥 */
  paymentKey: string
  /** 发票系统地址 */
  invoiceSystemUrl: string
  /** 酒店编码 */
  hotelCode: string
  /** 酒店名称 */
  hotelName: string
  /** 货币 */
  currency: string
  /** 时区 */
  timezone: string
  /** 税率配置 */
  taxRate: {
    room: number
    catering: number
    goods: number
  }
  /** 服务费率 */
  serviceChargeRate: number
  /** 半日租截止时间 */
  halfDayDeadline: string
  /** 全日租截止时间 */
  fullDayDeadline: string
}

export const Config: Schema<Config> = Schema.object({
  databaseUrl: Schema.string().required(),
  databaseType: Schema.union(['mysql', 'postgresql', 'sqlserver']).default('mysql'),
  paymentGateway: Schema.string().required(),
  paymentKey: Schema.string().required(),
  invoiceSystemUrl: Schema.string().required(),
  hotelCode: Schema.string().required(),
  hotelName: Schema.string().required(),
  currency: Schema.string().default('CNY'),
  timezone: Schema.string().default('Asia/Shanghai'),
  taxRate: Schema.object({
    room: Schema.number().default(0.06),
    catering: Schema.number().default(0.06),
    goods: Schema.number().default(0.13),
  }).default({ room: 0.06, catering: 0.06, goods: 0.13 }),
  serviceChargeRate: Schema.number().default(0.10),
  halfDayDeadline: Schema.string().default('14:00'),
  fullDayDeadline: Schema.string().default('18:00'),
})

/**
 * 注册所有 PMS 工具
 */
export function apply(ctx: Context, config: Config) {
  registerGuestTools(ctx, config)
  registerBillingTools(ctx, config)
  registerPaymentTools(ctx, config)
  registerInvoiceTools(ctx, config)
  registerRoomTools(ctx, config)
  registerReportTools(ctx, config)
  registerShiftTools(ctx, config)
}
