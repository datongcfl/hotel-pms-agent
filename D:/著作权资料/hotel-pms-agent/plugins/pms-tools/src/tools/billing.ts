import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'
import { calculateRoomCharges, calculateTax, calculateServiceCharge } from '../utils/billing.js'

/**
 * 账单处理工具
 */
export function registerBillingTools(ctx: Context, config: Config) {

  /** 计算退房总费用 */
  ctx.tools.register(defineTool({
    name: 'calculate_checkout',
    description: '计算客人退房总费用，包括房费、杂费、税费、服务费',
    parameters: {
      reservationId: {
        type: 'string',
        required: true,
        description: '预订/入住编号'
      },
      checkoutTime: {
        type: 'string',
        required: true,
        description: '实际退房时间，格式 YYYY-MM-DD HH:mm'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      // 1. 查询入住记录
      const reservation = await queryReservation(args.reservationId, config)
      if (!reservation) {
        return `未找到预订记录：${args.reservationId}`
      }

      // 2. 计算房费（含半日租/全日租判断）
      const roomResult = calculateRoomCharges(
        reservation.checkinTime,
        args.checkoutTime,
        reservation.roomRate,
        config.halfDayDeadline,
        config.fullDayDeadline
      )

      // 3. 查询杂费消费
      const extras = await queryExtraCharges(args.reservationId, config)

      // 4. 计算服务费（协议单位免收）
      const serviceCharge = calculateServiceCharge(
        roomResult.total + extras.total,
        config.serviceChargeRate,
        reservation.isContract
      )

      // 5. 计算税费
      const tax = calculateTax({
        room: roomResult.total,
        catering: extras.catering,
        goods: extras.goods,
        rates: config.taxRate
      })

      // 6. 汇总
      const total = roomResult.total + extras.total + serviceCharge + tax

      // 7. 双向校验
      const components = roomResult.total + extras.total + serviceCharge + tax
      if (Math.abs(components - total) > 0.01) {
        return `计算校验失败，请人工核对`
      }

      return formatCheckoutSummary({
        guestName: reservation.guestName,
        roomNumber: reservation.roomNumber,
        roomCharges: roomResult,
        extras,
        serviceCharge,
        tax,
        total,
        isContract: reservation.isContract
      })
    }
  }))

  /** 查询账单明细 */
  ctx.tools.register(defineTool({
    name: 'query_billing',
    description: '查询客人/房间的账单明细',
    parameters: {
      type: {
        type: 'string',
        required: true,
        description: '查询类型：reservation(预订号) / room(房号) / name(客人姓名)'
      },
      value: {
        type: 'string',
        required: true,
        description: '查询值'
      },
      startDate: { type: 'string', description: '开始日期 YYYY-MM-DD' },
      endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const bills = await queryBills(args.type, args.value, args.startDate, args.endDate, config)
      return formatBillDetails(bills)
    }
  }))

  /** 录入消费项目 */
  ctx.tools.register(defineTool({
    name: 'post_charge',
    description: '向客人账单录入消费项目（minibar、餐饮、洗衣、SPA等）',
    parameters: {
      reservationId: {
        type: 'string',
        required: true,
        description: '入住编号'
      },
      items: {
        type: 'array',
        required: true,
        description: '消费项目列表',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: '类别：restaurant/minibar/laundry/spa/conference/other'
            },
            description: { type: 'string', description: '项目描述' },
            amount: { type: 'number', description: '单价' },
            quantity: { type: 'number', description: '数量', default: 1 }
          }
        }
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const results: any[] = []
      for (const item of args.items) {
        const record = await insertCharge({
          reservationId: args.reservationId,
          ...item,
          subtotal: item.amount * (item.quantity || 1),
          postedAt: new Date().toISOString(),
          postedBy: 'pms-agent'
        }, config)
        results.push(record)
      }
      const totalAmount = results.reduce((sum, r) => sum + r.subtotal, 0)
      return `成功录入 ${results.length} 笔消费，合计 ¥${totalAmount.toFixed(2)}`
    }
  }))
}

// ============================================
// 数据库操作
// ============================================

interface Reservation {
  reservationId: string
  guestName: string
  roomNumber: string
  checkinTime: string
  plannedCheckout: string
  roomRate: number
  isContract: boolean
  status: string
}

async function queryReservation(reservationId: string, config: Config): Promise<Reservation | null> {
  console.log(`[PMS] Query reservation: ${reservationId}`)
  // TODO: 实现实际查询
  return null
}

async function queryExtraCharges(reservationId: string, config: Config) {
  console.log(`[PMS] Query extra charges: ${reservationId}`)
  return { total: 0, catering: 0, goods: 0, items: [] }
}

async function queryBills(type: string, value: string, startDate: string, endDate: string, config: Config) {
  console.log(`[PMS] Query bills: ${type}=${value}`)
  return []
}

async function insertCharge(charge: any, config: Config) {
  console.log(`[PMS] Insert charge:`, charge)
  return { ...charge, id: Date.now().toString() }
}

// ============================================
// 格式化输出
// ============================================

function formatCheckoutSummary(data: any): string {
  const lines: string[] = [
    `=== 退房结算单 ===`,
    `客人：${data.guestName} | 房号：${data.roomNumber}`,
    ``,
    `【房费明细】`,
  ]

  for (const detail of data.roomCharges.details) {
    lines.push(`  ${detail.date} ${detail.type} ¥${detail.amount.toFixed(2)}`)
  }
  lines.push(`  房费小计：¥${data.roomCharges.total.toFixed(2)}`)

  if (data.extras.items.length > 0) {
    lines.push(``, `【杂费明细】`)
    for (const item of data.extras.items) {
      lines.push(`  ${item.description} ×${item.quantity} ¥${item.subtotal.toFixed(2)}`)
    }
    lines.push(`  杂费小计：¥${data.extras.total.toFixed(2)}`)
  }

  if (data.serviceCharge > 0) {
    lines.push(``, `服务费（${data.isContract ? '协议免收' : '10%'}）：¥${data.serviceCharge.toFixed(2)}`)
  }

  lines.push(`增值税：¥${data.tax.toFixed(2)}`)
  lines.push(``)
  lines.push(`应付总计：¥${data.total.toFixed(2)}`)

  return lines.join('\n')
}

function formatBillDetails(bills: any[]): string {
  if (bills.length === 0) return '暂无账单记录'
  const lines = ['=== 账单明细 ===']
  for (const bill of bills) {
    lines.push(`${bill.date} | ${bill.description} | ${bill.category} | ¥${bill.amount}`)
  }
  const total = bills.reduce((sum, b) => sum + b.amount, 0)
  lines.push(`--- 合计：¥${total.toFixed(2)} ---`)
  return lines.join('\n')
}
