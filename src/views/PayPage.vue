<template>
  <div class="page">
    <main class="pay-panel">
      <div class="brand">
        <img src="/alipay.ico" alt="支付宝" class="brand-icon" />
        <span>支付宝支付</span>
      </div>

      <div class="qr-wrap">
        <img
          v-if="qrSrc"
          :src="qrSrc"
          alt="支付二维码"
          class="qr-image"
        />
        <div v-else class="qr-loading">加载二维码中…</div>
      </div>

      <p class="pay-tip">请点击下方按钮唤起支付宝完成支付</p>

      <p class="decoded-link">{{ PAY_URL }}</p>

      <a class="pay-btn" :href="payHref">
        <img src="/alipay.ico" alt="" class="pay-btn-icon" />
        去支付
      </a>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import QRCode from 'qrcode'

/** 支付宝收款码地址 */
const PAY_URL = 'https://www.steadypay.js.cn/pay/qrcode/2026081120460724747/'

const qrSrc = ref('')

/** 唤起支付宝打开支付地址 */
const payHref = computed(
  () =>
    'alipays://platformapi/startapp?appId=20000067&url=' +
    encodeURIComponent(PAY_URL),
)

onMounted(async () => {
  qrSrc.value = await QRCode.toDataURL(PAY_URL, {
    width: 220,
    margin: 2,
    color: { dark: '#0c1222', light: '#ffffff' },
  })
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
  margin-bottom: 1.5rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: #1677ff;
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
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
  margin-bottom: 0.75rem;
}

.decoded-link {
  font-size: 0.75rem;
  color: #374151;
  word-break: break-all;
  line-height: 1.45;
  margin-bottom: 1.25rem;
  padding: 0.65rem 0.75rem;
  background: #f3f4f6;
  border-radius: 8px;
  text-align: left;
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

.pay-btn-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.pay-btn:active {
  transform: scale(0.98);
}
</style>
