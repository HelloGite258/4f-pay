<template>
  <div class="page">
    <main class="pay-panel">
      <div class="brand">
        <img src="/alipay.ico" alt="支付宝" class="brand-icon" />
        <span>支付宝支付</span>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <template v-else>
        <p class="amount">
          <span class="currency">¥</span>{{ displayAmount }}
        </p>
        <p class="order-id">订单号 {{ orderNo || '—' }}</p>
        <p class="status" :class="statusClass">{{ statusText }}</p>

        <div class="qr-wrap">
          <img
            v-if="qrSrc"
            :src="qrSrc"
            alt="支付二维码"
            class="qr-image"
          />
          <div v-else class="qr-loading">{{ loadingTip }}</div>
        </div>

        <p class="pay-tip">
          {{ isPaid ? '订单已支付' : '请使用支付宝扫码完成支付' }}
        </p>

        <button v-if="isPaid" class="pay-btn is-done" type="button" disabled>
          已支付
        </button>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const ORDER_STATUS_MAP = {
  0: '无效',
  1: '请求中',
  2: '待支付',
  3: '确认中',
  4: '支付成功',
  5: '支付失败',
  6: '超时',
  7: '已关闭',
}

const loading = ref(false)
const errorMsg = ref('')
const orderNo = ref('')
const amount = ref(null)
const orderStatus = ref(null)
/** 通道返回的支付二维码图片地址 */
const payLink = ref('')
const qrSrc = ref('')

let pollTimer = null

const displayAmount = computed(() => {
  const n = Number(amount.value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
})

const statusText = computed(() => {
  if (orderStatus.value === null || orderStatus.value === undefined || orderStatus.value === '') {
    return '—'
  }
  return ORDER_STATUS_MAP[orderStatus.value] || `状态 ${orderStatus.value}`
})

const isPaid = computed(() => Number(orderStatus.value) === 4)

const statusClass = computed(() => {
  const s = Number(orderStatus.value)
  if (s === 4) return 'is-success'
  if (s === 5 || s === 6 || s === 7 || s === 0) return 'is-fail'
  return 'is-wait'
})

const loadingTip = computed(() => {
  if (loading.value) return '加载订单中…'
  return '暂无二维码'
})

function resolveOrderId() {
  return String(route.params.orderNo || '').trim()
}

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

async function fetchOrder(showLoading = true) {
  const id = resolveOrderId()
  if (!id) {
    errorMsg.value = '缺少订单号，请通过 /订单号 访问'
    return
  }

  if (showLoading) {
    loading.value = true
    errorMsg.value = ''
  }

  try {
    const url = `${apiBase()}/sifang-api/api/payOrderId/${encodeURIComponent(id)}`
    const res = await fetch(url)
    const json = await res.json()

    if (!json?.success || !json?.result) {
      errorMsg.value = json?.message || '查询订单失败'
      return
    }

    const data = json.result
    orderNo.value = data.orderNo || id
    amount.value = data.amount
    orderStatus.value = data.orderStatus
    payLink.value = data.payLink || ''

    if (isPaid.value) {
      qrSrc.value = ''
      stopPoll()
      return
    }

    // 直接展示通道二维码图片，不再解码
    qrSrc.value = payLink.value || ''
  } catch (e) {
    errorMsg.value = `加载失败：${e.message || e}`
  } finally {
    loading.value = false
  }
}

function startPoll() {
  stopPoll()
  pollTimer = window.setInterval(() => {
    if (isPaid.value) {
      stopPoll()
      return
    }
    fetchOrder(false)
  }, 3000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await fetchOrder(true)
  if (!errorMsg.value && !isPaid.value) {
    startPoll()
  }
})

onUnmounted(() => {
  stopPoll()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(22, 119, 255, 0.12), transparent),
    #fff;
}

.pay-panel {
  width: min(100%, 360px);
  text-align: center;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: #1677ff;
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}

.amount {
  font-size: clamp(2.2rem, 8vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--text);
}

.currency {
  font-size: 0.55em;
  margin-right: 0.12em;
  font-weight: 600;
  color: #1677ff;
  vertical-align: 0.12em;
}

.order-id {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.status {
  margin-top: 0.35rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.status.is-wait {
  color: #d97706;
}

.status.is-success {
  color: var(--success);
}

.status.is-fail {
  color: var(--danger);
}

.qr-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.85rem;
}

.qr-image {
  width: 220px;
  height: 220px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  border: 1px solid #e5e7eb;
}

.qr-loading {
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.85rem;
}

.pay-tip {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.error {
  color: var(--danger);
  font-size: 0.95rem;
  line-height: 1.5;
}

.pay-btn {
  width: 100%;
  max-width: 280px;
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.25rem;
  font-size: 1rem;
  font-weight: 650;
  color: #fff;
  background: linear-gradient(135deg, #1677ff, #0958d9);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-decoration: none;
  box-sizing: border-box;
}

.pay-btn.is-done {
  opacity: 0.65;
  cursor: default;
  background: #9ca3af;
}
</style>
