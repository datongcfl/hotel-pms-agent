/**
 * 酒店业务知识插件
 *
 * 向系统提示词注入酒店行业专业知识
 */

export const name = 'pms-knowledge'

/** 酒店行业知识库 */
export const HOTEL_KNOWLEDGE = {
  // 计费规则
  billing: {
    roomCharge: '房费从入住次日算起，退房日14:00前免费，14:00-18:00加收半日租，18:00后加收全日租',
    serviceCharge: '服务费一般为10%，协议单位免收',
    taxRate: { room: '6%', catering: '6%', goods: '13%' }
  },

  // 支付方式
  payment: {
    cash: '现金收取，需验钞',
    creditCard: '银行卡，通过POS机刷卡',
    wechat: '微信支付，扫码或被扫码',
    alipay: '支付宝，扫码或被扫码',
    onAccount: '挂账，仅限签约协议单位，需验证协议有效性'
  },

  // 发票
  invoice: {
    general: '增值税普通发票，只需抬头',
    special: '增值税专用发票，需抬头+税号+开户行+账号+地址+电话'
  },

  // VIP 等级折扣
  vipDiscount: {
    normal: 1.0,
    silver: 0.95,
    gold: 0.90,
    platinum: 0.85,
    diamond: 0.80
  }
}

export function apply(ctx: any) {
  console.log('[PMS-KNOWLEDGE] Hotel knowledge loaded')
}
