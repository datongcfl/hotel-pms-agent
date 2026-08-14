import type { Config } from '../index.js'

/**
 * 账单计算工具函数
 */

interface RoomChargeDetail {
  date: string
  type: 'night' | 'half_day' | 'full_day'
  amount: number
}

interface RoomChargeResult {
  total: number
  nights: number
  details: RoomChargeDetail[]
}

/**
 * 计算房费（含半日租/全日租判断）
 */
export function calculateRoomCharges(
  checkinTime: string,
  checkoutTime: string,
  roomRate: number,
  halfDayDeadline: string,
  fullDayDeadline: string
): RoomChargeResult {
  const checkin = new Date(checkinTime)
  const checkout = new Date(checkoutTime)
  const halfDayHour = parseInt(halfDayDeadline.split(':')[0])
  const fullDayHour = parseInt(fullDayDeadline.split(':')[0])

  const details: RoomChargeDetail[] = []
  let total = 0
  let nights = 0

  // 计算完整晚数
  const checkinDate = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate())
  const checkoutDate = new Date(checkout.getFullYear(), checkout.getMonth(), checkout.getDate())
  const dayDiff = Math.floor((checkoutDate.getTime() - checkinDate.getTime()) / 86400000)

  // 入住日当天不计费（房费从次日开始）
  // 退房日根据时间判断是否加收
  nights = dayDiff

  // 完整夜晚房费
  for (let i = 0; i < nights; i++) {
    const date = new Date(checkinDate)
    date.setDate(date.getDate() + i + 1)
    details.push({
      date: formatDate(date),
      type: 'night',
      amount: roomRate
    })
    total += roomRate
  }

  // 退房日加收判断
  const checkoutHour = checkout.getHours()
  if (checkoutHour >= halfDayHour && checkoutHour < fullDayHour) {
    // 半日租
    details.push({
      date: formatDate(checkoutDate),
      type: 'half_day',
      amount: roomRate * 0.5
    })
    total += roomRate * 0.5
  } else if (checkoutHour >= fullDayHour) {
    // 全日租
    details.push({
      date: formatDate(checkoutDate),
      type: 'full_day',
      amount: roomRate
    })
    total += roomRate
  }

  return { total, nights, details }
}

/**
 * 计算税费
 */
export function calculateTax(data: {
  room: number
  catering: number
  goods: number
  rates: { room: number; catering: number; goods: number }
}): number {
  const roomTax = data.room * data.rates.room
  const cateringTax = data.catering * data.rates.catering
  const goodsTax = data.goods * data.rates.goods
  return round2(roomTax + cateringTax + goodsTax)
}

/**
 * 计算服务费
 */
export function calculateServiceCharge(
  subtotal: number,
  rate: number,
  isContract: boolean
): number {
  if (isContract) return 0
  return round2(subtotal * rate)
}

/**
 * 金额四舍五入到分
 */
export function round2(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
