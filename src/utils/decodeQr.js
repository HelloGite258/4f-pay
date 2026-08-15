import jsQR from 'jsqr'

/** 开发环境把 xlcloud 图片走本地代理，避免 canvas 跨域污染 */
export function toDecodableImageUrl(rawUrl) {
  if (!rawUrl) return ''
  try {
    const u = new URL(rawUrl, window.location.origin)
    if (u.hostname === 'xapi.xlcloudpay.com') {
      return `/xlcloud-img${u.pathname}${u.search}`
    }
  } catch {
    // ignore
  }
  return rawUrl
}

/**
 * 访问二维码图片并解码出真实支付链接
 * @param {string} imageUrl 二维码图片地址
 * @returns {Promise<string>}
 */
export async function decodePayUrlFromQrImage(imageUrl) {
  const src = toDecodableImageUrl(imageUrl)
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('无法创建画布')
  }
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  if (!result?.data) {
    throw new Error('二维码解码失败')
  }
  return String(result.data).trim()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('二维码图片加载失败'))
    img.src = src
  })
}
