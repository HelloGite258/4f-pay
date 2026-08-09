const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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

/** 按订单号查询 redirectUrl + 状态 */
export function queryOrder(orderNo) {
  return request(`/api/paytool/order/${encodeURIComponent(orderNo)}`)
}

/** 支付成功验单通知(服务端查 redirectUrl 判定并落库) */
export function checkPay(orderNo) {
  return request('/api/paytool/order/check_pay', {
    method: 'POST',
    body: JSON.stringify({ orderNo }),
  })
}
