<template>
  <div class="page">
    <!-- loading -->
    <main v-if="phase === 'loading'" class="status-panel">
      <p class="status-title">加载中…</p>
    </main>

    <!-- error -->
    <main v-else-if="phase === 'error'" class="status-panel">
      <p class="status-title danger">{{ errorMsg || '加载失败' }}</p>
      <button
        v-if="hasOrderNo"
        class="ghost-btn"
        type="button"
        @click="loadOrder"
      >
        重试
      </button>
    </main>

    <!-- paid success -->
    <main v-else-if="phase === 'success'" class="status-panel">
      <div class="icon-circle success">✓</div>
      <p class="status-title success-text">支付成功</p>
      <p v-if="displayOrderNo" class="order-id">订单号： {{ displayOrderNo }}</p>
    </main>

    <!-- closed -->
    <main v-else-if="phase === 'closed'" class="status-panel">
      <div class="icon-circle closed">!</div>
      <p class="status-title danger">订单已关闭</p>
      <p v-if="displayOrderNo" class="order-id">订单号： {{ displayOrderNo }}</p>
    </main>

    <!-- paying: QR + button -->
    <main v-else class="pay-panel">
      <div class="alipay-brand">
        <img src="/alipay.ico" alt="支付宝" class="alipay-icon" />
        <span>支付</span>
      </div>

      <p v-if="amountText" class="amount">
        <span class="currency">¥</span>{{ amountText }}
      </p>
      <p v-if="displayOrderNo" class="order-id">订单号： {{ displayOrderNo }}</p>

      <div class="qr-wrap">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="支付二维码"
          class="qr-image"
        />
        <div v-else class="qr-loading">生成二维码中…</div>
      </div>

      <button class="pay-btn" type="button" @click="handlePay">
        <img src="/alipay.ico" alt="" class="pay-btn-icon" />
        点击支付
      </button>
    </main>

    <!-- 隐藏探测支付结果 -->
    <iframe
      v-if="probeSrc"
      ref="probeFrame"
      class="probe-frame"
      :src="probeSrc"
      title="pay-probe"
      @load="onProbeLoad"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { queryOrder } from '../api/order'

const SUCCESS_PROBE_BASE =
  'https://www.steadypay.js.cn/paypage/success.php?trade_no='
const SUCCESS_HINTS = ['订单校验失败', '支付成功']

const props = defineProps({
  orderNo: { type: String, default: '' },
  /** 非 /:orderNo 的路径一律视为异常 */
  invalidPath: { type: Boolean, default: false },
})

/** loading | paying | success | closed | error */
const phase = ref('loading')
const errorMsg = ref('')
const order = ref(null)
const qrDataUrl = ref('')
const probeSrc = ref('')
const probeFrame = ref(null)

let pollTimer = null

const hasOrderNo = computed(() => Boolean(String(props.orderNo || '').trim()))
const displayOrderNo = computed(
  () => order.value?.orderNo || String(props.orderNo || '').trim(),
)
const payQrUrl = computed(() => order.value?.payQrUrl || '')
const channelTxid = computed(() => String(order.value?.channelTxid || '').trim())
const amountText = computed(() => {
  const a = order.value?.amount
  if (a == null || a === '') return ''
  const n = Number(a)
  return Number.isFinite(n) ? n.toFixed(2) : String(a)
})

async function generateQr(url) {
  if (!url) {
    qrDataUrl.value = ''
    return
  }
  qrDataUrl.value = await QRCode.toDataURL(url, {
    width: 220,
    margin: 2,
    color: {
      dark: '#0c1222',
      light: '#ffffff',
    },
  })
}

function markSuccess() {
  if (phase.value === 'success') return
  phase.value = 'success'
  stopPoll()
  probeSrc.value = ''
}

function buildProbeUrl() {
  const txid = channelTxid.value
  if (!txid) return ''
  return `${SUCCESS_PROBE_BASE}${encodeURIComponent(txid)}&_t=${Date.now()}`
}

function refreshProbe() {
  if (phase.value !== 'paying') return
  const url = buildProbeUrl()
  if (!url) return
  // 隐藏访问通道结果页（可能有业务副作用）
  probeSrc.value = url
  // 跨域 iframe 通常读不到内容，走同源代理拉取文案判定
  probeViaFetch()
}

function onProbeLoad() {
  if (phase.value !== 'paying') return
  const iframe = probeFrame.value
  if (!iframe) return
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    const text = (doc.body && doc.body.innerText) || ''
    const html = doc.documentElement ? doc.documentElement.innerHTML : ''
    const blob = `${text}\n${html}`
    if (SUCCESS_HINTS.some((k) => blob.includes(k))) {
      markSuccess()
    }
  } catch (_) {
    // 跨域忽略，依赖 probeViaFetch
  }
}

async function probeViaFetch() {
  if (phase.value !== 'paying') return
  const txid = channelTxid.value
  if (!txid) return
  try {
    // 开发/线上可通过反向代理把 /steadypay-probe 转到 steadypay，避免跨域
    const res = await fetch(
      `/steadypay-probe/success.php?trade_no=${encodeURIComponent(txid)}&_t=${Date.now()}`,
      { credentials: 'omit' },
    )
    const html = await res.text()
    if (SUCCESS_HINTS.some((k) => html.includes(k))) {
      markSuccess()
    }
  } catch (e) {
    console.warn('[pay-probe]', e.message || e)
  }
}

function applyStatus(vo) {
  order.value = vo
  const st = vo?.orderStatus
  if (st === 1) {
    markSuccess()
    return
  }
  if (st === 2) {
    phase.value = 'closed'
    stopPoll()
    probeSrc.value = ''
    return
  }
  if (!vo?.payQrUrl) {
    phase.value = 'error'
    errorMsg.value = '支付链接为空'
    return
  }
  if (!String(vo.channelTxid || '').trim()) {
    phase.value = 'error'
    errorMsg.value = '通道订单号为空'
    return
  }
  phase.value = 'paying'
  generateQr(vo.payQrUrl)
  startPoll()
}

async function loadOrder() {
  if (props.invalidPath) {
    phase.value = 'error'
    errorMsg.value = '请通过正确链接访问'
    return
  }

  const no = String(props.orderNo || '').trim()
  if (!no) {
    phase.value = 'error'
    errorMsg.value = '请通过正确链接访问'
    return
  }

  phase.value = 'loading'
  errorMsg.value = ''
  qrDataUrl.value = ''
  probeSrc.value = ''
  try {
    const vo = await queryOrder(no)
    applyStatus(vo)
  } catch (e) {
    phase.value = 'error'
    errorMsg.value = e.message || '查询失败'
  }
}

function handlePay() {
  const url = payQrUrl.value
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function startPoll() {
  stopPoll()
  refreshProbe()
  pollTimer = window.setInterval(() => {
    refreshProbe()
  }, 3000)
}

function stopPoll() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => [props.orderNo, props.invalidPath],
  () => {
    stopPoll()
    loadOrder()
  },
)

onMounted(() => {
  loadOrder()
})

onBeforeUnmount(() => {
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
}

.status-panel,
.pay-panel {
  width: min(100%, 360px);
  text-align: center;
}

.status-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0.75rem 0 0.5rem;
}

.success-text {
  color: var(--success);
}

.danger {
  color: var(--danger);
}

.icon-circle {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
}

.icon-circle.success {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
}

.icon-circle.closed {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
}

.ghost-btn {
  margin-top: 1.25rem;
  border: 1px solid #d1d5db;
  background: transparent;
  color: var(--text);
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  cursor: pointer;
}

.amount {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.45rem;
}

.currency {
  font-size: 1.25rem;
  margin-right: 0.15rem;
  font-weight: 600;
  color: var(--gold);
}

.order-id {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
  word-break: break-all;
}

.alipay-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: #1677ff;
}

.alipay-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}

.qr-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.qr-image {
  width: 220px;
  height: 220px;
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
}

.pay-btn-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.pay-btn:active {
  transform: scale(0.98);
}

.probe-frame {
  position: absolute;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
