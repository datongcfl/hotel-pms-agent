import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../index.js'

/**
 * 房态管理工具
 */
export function registerRoomTools(ctx: Context, config: Config) {

  /** 查询房态 */
  ctx.tools.register(defineTool({
    name: 'query_room',
    description: '查询房间状态、入住信息或房态一览表',
    parameters: {
      queryType: {
        type: 'string',
        required: true,
        description: '查询类型：single(单房) / status(按状态) / floor(按楼层) / all(全部)'
      },
      value: {
        type: 'string',
        description: '查询值（单房填房号，按状态填状态，按楼层填楼层号）'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const rooms = await queryRoomStatus(args.queryType, args.value, config)
      return formatRoomStatus(rooms)
    }
  }))

  /** 更新房态 */
  ctx.tools.register(defineTool({
    name: 'update_room_status',
    description: '更新房间状态（脏房/净房/维修中）',
    parameters: {
      roomNumber: { type: 'string', required: true, description: '房号' },
      status: {
        type: 'string',
        required: true,
        description: '新状态：clean(净房) / dirty(脏房) / maintenance(维修)'
      },
      remark: { type: 'string', description: '备注' }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value: string) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      await updateRoomInDB(args.roomNumber, args.status, args.remark, config)
      const statusMap: Record<string, string> = {
        clean: '净房', dirty: '脏房', maintenance: '维修中'
      }
      return `房号 ${args.roomNumber} 已更新为「${statusMap[args.status] || args.status}」`
    }
  }))
}

async function queryRoomStatus(queryType: string, value: string | undefined, config: Config) {
  console.log(`[PMS] Query rooms: ${queryType}=${value}`)
  return []
}

async function updateRoomInDB(roomNumber: string, status: string, remark: string, config: Config) {
  console.log(`[PMS] Update room: ${roomNumber} -> ${status}`)
}

function formatRoomStatus(rooms: any[]): string {
  if (rooms.length === 0) return '暂无房态信息'
  const lines = ['=== 房态一览 ===']
  const statusMap: Record<string, string> = {
    vacant_clean: '空净', vacant_dirty: '空脏', occupied: '住客', maintenance: '维修'
  }
  for (const r of rooms) {
    lines.push(`${r.roomNumber} | ${r.roomType} | ${statusMap[r.status] || r.status} | ¥${r.rate}`)
  }
  return lines.join('\n')
}
