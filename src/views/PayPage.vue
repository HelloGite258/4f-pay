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
    <main v-else-if="phase === 'success'" class="status-panel success-panel">
      <div class="icon-circle success">✓</div>
      <p class="status-title success-text">支付成功</p>
    </main>

    <!-- closed -->
    <main v-else-if="phase === 'closed'" class="status-panel">
      <div class="icon-circle closed">!</div>
      <p class="status-title danger">订单已关闭</p>
    </main>

    <!-- paying: iframe -->
    <main v-else class="pay-frame-wrap">
      <iframe
        ref="payFrame"
        class="pay-frame"
        :src="iframeSrc"
        title="支付页面"
        @load="onIframeLoad"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { checkPay, queryOrder } from '../api/order'

const props = defineProps({
  orderNo: { type: String, default: '' },
  /** 非 /:orderNo 的路径一律视为异常 */
  invalidPath: { type: Boolean, default: false },
})

/** loading | paying | success | closed | error */
const phase = ref('loading')
const errorMsg = ref('')
const order = ref(null)
const payFrame = ref(null)
const checking = ref(false)

let pollTimer = null
let lastIframeCheckAt = 0

const hasOrderNo = computed(() => Boolean(String(props.orderNo || '').trim()))
const iframeSrc = computed(() => order.value?.redirectUrl || '')

function applyStatus(vo) {
  order.value = vo
  const st = vo?.orderStatus
  if (st === 1) {
    phase.value = 'success'
    stopPoll()
    return
  }
  if (st === 2) {
    phase.value = 'closed'
    stopPoll()
    return
  }
  if (!iframeSrc.value) {
    phase.value = 'error'
    errorMsg.value = '支付链接为空'
    return
  }
  phase.value = 'paying'
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
  try {
    const vo = await queryOrder(no)
    applyStatus(vo)
  } catch (e) {
    phase.value = 'error'
    errorMsg.value = e.message || '查询失败'
  }
}

async function notifyCheckPay(reason) {
  const no = String(props.orderNo || '').trim()
  if (!no) return
  if (checking.value) return
  if (phase.value === 'success' || phase.value === 'closed') return
  checking.value = true
  try {
    const vo = await checkPay(no)
    if (vo?.orderStatus === 1) {
      applyStatus(vo)
    } else if (vo?.orderStatus === 2) {
      applyStatus(vo)
    } else {
      order.value = vo
      // iframe 里若同源可读到成功/异常文案, 也主动再检一次
      tryReadIframeAndDecide(reason)
    }
  } catch (e) {
    console.warn('[check_pay]', reason, e.message)
  } finally {
    checking.value = false
  }
}

function tryReadIframeAndDecide(reason) {
  const iframe = payFrame.value
  if (!iframe) return
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    const text = (doc.body && doc.body.innerText) || ''
    const html = doc.documentElement ? doc.documentElement.innerHTML : ''
    const blob = `${text}\n${html}`
    const paidHints = ['支付宝下单失败', '订单参数异常']
    if (paidHints.some((k) => blob.includes(k))) {
      // 同源才能走到这里; 再调一次服务端确认
      if (!checking.value) {
        notifyCheckPay(`iframe-text:${reason}`)
      }
    }
  } catch (_) {
    // 跨域无法读取, 依赖轮询 check_pay
  }
}

function onIframeLoad() {
  const now = Date.now()
  if (now - lastIframeCheckAt < 800) return
  lastIframeCheckAt = now
  tryReadIframeAndDecide('load')
  notifyCheckPay('iframe-load')
}

function startPoll() {
  stopPoll()
  pollTimer = window.setInterval(() => {
    notifyCheckPay('poll')
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
}

.status-panel {
  width: min(100%, 360px);
  text-align: center;
  padding: 3rem 1.25rem;
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
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: var(--text);
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  cursor: pointer;
}

.pay-frame-wrap {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pay-frame {
  flex: 1;
  width: 100%;
  min-height: 100vh;
  border: 0;
  background: #fff;
}
</style>
