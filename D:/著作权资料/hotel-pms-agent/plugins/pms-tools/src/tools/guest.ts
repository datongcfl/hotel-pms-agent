import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 客人管理工具
 */
export function registerGuestTools(ctx: Context, config: Config) {

  /** 查询客人信息 */
  ctx.tools.register(defineTool({
    name: 'query_guest',
    description: '通过姓名、房号、手机号或证件号查询客人入住信息',
    parameters: {
      queryType: {
        type: 'string',
        required: true,
        description: '查询类型：name(姓名) / room(房号) / phone(手机号) / idCard(证件号) / reservationId(预订号)'
      },
      value: {
        type: 'string',
        required: true,
        description: '查询值'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const guest = await queryGuestFromDB(args.queryType, args.value, config)
      if (!guest) {
        return `未找到匹配的客人信息（${args.queryType}: ${args.value}）`
      }
      return formatGuestInfo(guest)
    }
  }))

  /** 查询客人历史消费 */
  ctx.tools.register(defineTool({
    name: 'query_guest_history',
    description: '查询客人的历史入住和消费记录',
    parameters: {
      guestId: {
        type: 'string',
        required: true,
        description: '客人编号'
      },
      limit: {
        type: 'number',
        description: '返回记录数，默认10',
        default: 10
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const history = await queryGuestHistory(args.guestId, args.limit, config)
      return formatHistory(history)
    }
  }))
}

// ============================================
// 数据库操作（示例实现）
// ============================================

interface GuestInfo {
  guestId: string
  name: string
  idType: string
  idMasked: string
  phoneMasked: string
  roomNumber: string
  reservationId: string
  checkinTime: string
  plannedCheckout: string
  roomRate: number
  status: 'reserved' | 'checked_in' | 'checked_out' | 'no_show'
  vipLevel: string
  company: string
  isContract: boolean
}

async function queryGuestFromDB(
  queryType: string,
  value: string,
  config: Config
): Promise<GuestInfo | null> {
  // TODO: 实现实际数据库查询
  // const pool = mysql.createPool(config.databaseUrl)
  // const sql = buildGuestQuery(queryType)
  // const [rows] = await pool.execute(sql, [value])
  // return rows[0] as GuestInfo

  // 模拟数据
  console.log(`[PMS] Query guest: ${queryType}=${value}, DB=${config.databaseUrl}`)
  return null
}

async function queryGuestHistory(
  guestId: string,
  limit: number,
  config: Config
): Promise<any[]> {
  console.log(`[PMS] Query history: guest=${guestId}, limit=${limit}`)
  return []
}

function formatGuestInfo(guest: GuestInfo): string {
  const statusText: Record<string, string> = {
    reserved: '已预订',
    checked_in: '已入住',
    checked_out: '已退房',
    no_show: '未到店'
  }
  return [
    `=== 客人信息 ===`,
    `姓名：${guest.name}`,
    `房号：${guest.roomNumber}`,
    `预订号：${guest.reservationId}`,
    `状态：${statusText[guest.status] || guest.status}`,
    `入住时间：${guest.checkinTime}`,
    `计划退房：${guest.plannedCheckout}`,
    `房价：¥${guest.roomRate}/晚`,
    `VIP等级：${guest.vipLevel}`,
    `协议单位：${guest.isContract ? guest.company : '否'}`,
  ].join('\n')
}

function formatHistory(history: any[]): string {
  if (history.length === 0) return '暂无历史记录'
  return ['=== 历史记录 ===', ...history.map(h =>
    `${h.checkinDate} ~ ${h.checkoutDate} | ¥${h.totalAmount} | ${h.roomType}`
  )].join('\n')
}
