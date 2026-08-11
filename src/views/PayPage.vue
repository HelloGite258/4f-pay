<template>
  <div class="page">
    <main class="pay-panel">
      <div class="wx-brand">
        <img src="/wechat.svg" alt="微信" class="wx-icon" />
        <span>微信支付</span>
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

      <p class="pay-tip">请点击下方按钮唤起微信完成支付</p>

      <button
        class="pay-btn"
        type="button"
        :disabled="!qrSrc || paying"
        @click="handlePay"
      >
        <img src="/wechat.svg" alt="" class="pay-btn-icon" />
        {{ paying ? '打开中…' : '去支付' }}
      </button>

      <p v-if="payHint" class="pay-hint">{{ payHint }}</p>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import jsQR from 'jsqr'

const PAY_QR_IMG =
  'https://xapi.xlcloudpay.com/api/scan/imgs/3335b4804c79d86fdb525d0fb0ca2954fe03bfca62e48c33b69a81c81f0f19488670b5b58499532e7682321c129c8f8c7ea8c50cd0f1ea2c0cb91af8fe4be9aa8a206e1d8f1171ca1068d309e561ab8bb962914e228d24c32166dd73443de201725528eda4d112565e21f3a84c43824a02065a66d42198e283d66dfed1aa0f38.png'

const qrSrc = ref('')
const paying = ref(false)
const payHint = ref('')
const payLink = ref('')

let objectUrl = ''
let qrBlob = null

function proxyUrl(url) {
  if (!import.meta.env.DEV) return url
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('xlcloudpay.com')) {
      return `/xlcloud-img${parsed.pathname}${parsed.search}`
    }
  } catch (_) {
    /* ignore */
  }
  return url
}

async function blobToImageData(blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function decodePayLink(blob) {
  const imageData = await blobToImageData(blob)
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return code?.data ? String(code.data).trim() : ''
}

async function fetchQrImage() {
  qrSrc.value = ''
  payLink.value = ''
  qrBlob = null
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }

  const candidates = [proxyUrl(PAY_QR_IMG), PAY_QR_IMG].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  )

  for (const src of candidates) {
    try {
      const res = await fetch(src, { credentials: 'omit', mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      qrBlob = blob
      objectUrl = URL.createObjectURL(blob)
      qrSrc.value = objectUrl
      payLink.value = await decodePayLink(blob)
      return
    } catch (_) {
      /* try next */
    }
  }

  qrSrc.value = PAY_QR_IMG
}

/** 解码图中链接并跳转，由系统唤起微信（不做浏览器判断） */
async function handlePay() {
  if (paying.value) return
  paying.value = true
  payHint.value = ''

  try {
    let link = payLink.value
    if (!link && qrBlob) {
      link = await decodePayLink(qrBlob)
      payLink.value = link
    }
    if (!link) {
      payHint.value = '未能识别支付链接'
      return
    }
    // 图中一般是 weixin://wxpay/...，直接跳转即可唤起微信
    window.location.href = link
  } catch (e) {
    payHint.value = e.message || '打开失败'
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  fetchQrImage()
})

onBeforeUnmount(() => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
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
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(7, 193, 96, 0.12), transparent),
    #fff;
}

.pay-panel {
  width: min(100%, 360px);
  text-align: center;
}

.wx-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.5rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: #07c160;
}

.wx-icon {
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
  margin-bottom: 1.25rem;
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
  background: linear-gradient(135deg, #07c160, #06ad56);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.pay-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pay-btn-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.pay-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.pay-hint {
  margin-top: 0.85rem;
  font-size: 0.8rem;
  color: #b45309;
  line-height: 1.45;
}
</style>
