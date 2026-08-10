const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

/** 订单状态：与 4f-api SifangConstant 对齐 */
export const ORDER_STATUS = {
  WAIT_PAY: 2,
  SUCCESS: 4,
  FAIL: 5,
  CLOSED: 7,
}

/**
 * 与 4f-api CreateTradeOrderOutDto / AggregatePayStatusVo 对齐
 */
function normalizeAggregate(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  return {
    orderNo: raw.orderNo ?? '',
    payUrl: raw.payUrl ?? '',
    amount: raw.amount == null ? null : Number(raw.amount),
    payType: raw.payType ?? '',
    status: raw.status == null ? null : Number(raw.status),
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const msg = data.message || data.msg || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data.result ?? data
}

/** POST /api/pay/aggregate  amount 单位：分 */
export async function createAggregatePay({ amount, payType }) {
  const raw = await request('/api/pay/aggregate', {
    method: 'POST',
    body: JSON.stringify({ amount, payType }),
  })
  return normalizeAggregate(raw)
}

/** GET /api/pay/aggregate/{orderNo} */
export async function queryAggregatePay(orderNo) {
  const raw = await request(`/api/pay/aggregate/${encodeURIComponent(orderNo)}`)
  return normalizeAggregate(raw)
}

/** 支付类型（与 4f-api PayTypeEnum 一致，前端仅开放微信/支付宝） */
export const PAY_TYPES = [
  { code: 'ALIPAY', label: '支付宝' },
  { code: 'WECHAT', label: '微信' },
]
