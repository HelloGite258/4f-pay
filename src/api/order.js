const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

/**
 * 与 4f-pay-api PaytoolOrderQueryVo 对齐:
 * orderNo / channelTxid / orderStatus / payQrUrl / amount
 */
function normalizeOrder(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  return {
    orderNo: raw.orderNo ?? '',
    channelTxid: raw.channelTxid ?? '',
    orderStatus: raw.orderStatus == null ? null : Number(raw.orderStatus),
    payQrUrl: raw.payQrUrl ?? '',
    amount: raw.amount ?? null,
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

/** GET /api/paytool/order/{orderNo} */
export async function queryOrder(orderNo) {
  const raw = await request(`/api/paytool/order/${encodeURIComponent(orderNo)}`)
  return normalizeOrder(raw)
}
