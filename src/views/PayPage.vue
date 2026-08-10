<template>
  <div class="page">
    <!-- 下单表单 -->
    <main v-if="phase === 'form'" class="form-panel">
      <h1 class="brand">聚合支付</h1>
      <p class="hint">选择支付方式并输入金额</p>

      <label class="field-label" for="amount">金额（元）</label>
      <div class="amount-input-wrap">
        <span class="currency">¥</span>
        <input
          id="amount"
          v-model="amountYuan"
          class="amount-input"
          type="number"
          inputmode="decimal"
          min="0.01"
          step="0.01"
          placeholder="0.00"
        />
      </div>

      <p class="field-label">支付方式</p>
      <div class="pay-type-grid">
        <button
          v-for="item in PAY_TYPES"
          :key="item.code"
          type="button"
          class="pay-type-btn"
          :class="{ active: payType === item.code }"
          @click="payType = item.code"
        >
          {{ item.label }}
        </button>
      </div>

      <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

      <button
        class="pay-btn"
        type="button"
        :disabled="submitting"
        @click="submitPay"
      >
        {{ submitting ? '下单中…' : '去支付' }}
      </button>
    </main>

    <!-- loading -->
    <main v-else-if="phase === 'loading'" class="status-panel">
      <p class="status-title">正在拉起支付…</p>
    </main>

    <!-- success -->
    <main v-else-if="phase === 'success'" class="status-panel">
      <div class="icon-circle success">✓</div>
      <p class="status-title success-text">支付成功</p>
      <p v-if="amountText" class="amount success-amount">
        <span class="currency">¥</span>{{ amountText }}
      </p>
      <p v-if="orderNo" class="order-id">订单号： {{ orderNo }}</p>
      <button class="ghost-btn" type="button" @click="backToForm">再下一单</button>
    </main>

    <!-- error -->
    <main v-else-if="phase === 'error'" class="status-panel">
      <p class="status-title danger">{{ errorMsg || '下单失败' }}</p>
      <button class="ghost-btn" type="button" @click="backToForm">重试</button>
    </main>

    <!-- paying: QR + orderNo + poll -->
    <main v-else class="pay-panel">
      <div class="alipay-brand">
        <img
          v-if="payType === 'ALIPAY'"
          src="/alipay.ico"
          alt=""
          class="alipay-icon"
        />
        <span>{{ payTypeLabel }}</span>
      </div>

      <p v-if="amountText" class="amount">
        <span class="currency">¥</span>{{ amountText }}
      </p>
      <p v-if="orderNo" class="order-id">订单号： {{ orderNo }}</p>

      <div class="qr-wrap">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="支付二维码"
          class="qr-image"
        />
        <div v-else class="qr-loading">生成二维码中…</div>
      </div>

      <p class="poll-hint">请扫码支付，支付完成后将自动跳转</p>

      <button class="pay-btn" type="button" @click="handlePay">
        点击支付
      </button>
      <button class="ghost-btn" type="button" @click="backToForm">
        重新下单
      </button>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import QRCode from 'qrcode'
import {
  createAggregatePay,
  queryAggregatePay,
  ORDER_STATUS,
  PAY_TYPES,
} from '../api/pay'

/** form | loading | paying | success | error */
const phase = ref('form')
const errorMsg = ref('')
const submitting = ref(false)

const amountYuan = ref('')
const payType = ref('ALIPAY')

const orderNo = ref('')
const payUrl = ref('')
const amountFen = ref(null)
const qrDataUrl = ref('')

let pollTimer = null

const payTypeLabel = computed(() => {
  const hit = PAY_TYPES.find((t) => t.code === payType.value)
  return hit ? hit.label : payType.value
})

const amountText = computed(() => {
  const a = amountFen.value
  if (a == null || a === '') return ''
  const n = Number(a) / 100
  return Number.isFinite(n) ? n.toFixed(2) : ''
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

function parseAmountFen() {
  const yuan = Number(String(amountYuan.value || '').trim())
  if (!Number.isFinite(yuan) || yuan <= 0) {
    return null
  }
  return Math.round(yuan * 100)
}

function markSuccess() {
  if (phase.value === 'success') return
  phase.value = 'success'
  stopPoll()
}

async function pollStatus() {
  const no = String(orderNo.value || '').trim()
  if (!no || phase.value !== 'paying') return
  try {
    const vo = await queryAggregatePay(no)
    if (!vo) return
    if (vo.status === ORDER_STATUS.SUCCESS) {
      markSuccess()
      return
    }
    if (
      vo.status === ORDER_STATUS.FAIL ||
      vo.status === ORDER_STATUS.CLOSED
    ) {
      phase.value = 'error'
      errorMsg.value =
        vo.status === ORDER_STATUS.CLOSED ? '订单已关闭' : '支付失败'
      stopPoll()
    }
  } catch (e) {
    console.warn('[poll status]', e.message || e)
  }
}

function startPoll() {
  stopPoll()
  pollStatus()
  pollTimer = window.setInterval(() => {
    pollStatus()
  }, 3000)
}

function stopPoll() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function submitPay() {
  errorMsg.value = ''
  const fen = parseAmountFen()
  if (fen == null) {
    errorMsg.value = '请输入有效金额'
    return
  }
  if (!payType.value) {
    errorMsg.value = '请选择支付方式'
    return
  }

  submitting.value = true
  phase.value = 'loading'
  stopPoll()
  try {
    const vo = await createAggregatePay({
      amount: fen,
      payType: payType.value,
    })
    if (!vo?.payUrl) {
      phase.value = 'error'
      errorMsg.value = '支付链接为空'
      return
    }
    if (!vo.orderNo) {
      phase.value = 'error'
      errorMsg.value = '订单号为空'
      return
    }
    orderNo.value = vo.orderNo
    payUrl.value = vo.payUrl
    amountFen.value = vo.amount != null ? vo.amount : fen
    phase.value = 'paying'
    await generateQr(vo.payUrl)
    startPoll()
  } catch (e) {
    phase.value = 'error'
    errorMsg.value = e.message || '下单失败'
  } finally {
    submitting.value = false
  }
}

function handlePay() {
  const url = payUrl.value
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function backToForm() {
  stopPoll()
  phase.value = 'form'
  errorMsg.value = ''
  orderNo.value = ''
  payUrl.value = ''
  qrDataUrl.value = ''
  amountFen.value = null
}

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
.pay-panel,
.form-panel {
  width: min(100%, 360px);
  text-align: center;
}

.brand {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.field-label {
  display: block;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.45rem;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background: #fff;
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1.5rem;
  font-weight: 700;
  width: 100%;
  background: transparent;
  color: var(--text);
}

.amount-input-wrap .currency {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gold);
}

.pay-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.pay-type-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 0.65rem 0.35rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text);
}

.pay-type-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(22, 119, 255, 0.06);
  font-weight: 650;
}

.form-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
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
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.ghost-btn {
  margin-top: 1rem;
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

.success-amount {
  font-size: 1.75rem;
  margin-top: 0.5rem;
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

.poll-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
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
  margin-bottom: 1rem;
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

.pay-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.pay-btn:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
