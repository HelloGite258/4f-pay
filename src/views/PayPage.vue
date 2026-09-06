<template>
  <div class="page">
    <main class="stage">
      <div class="brand">
        <img src="/alipay.ico" alt="" class="brand-icon" />
        <span class="brand-name">支付宝</span>
      </div>

      <div class="status-block">
        <div class="loader" aria-hidden="true">
          <span class="ring" />
          <span class="ring ring-delay" />
          <span class="dot" />
        </div>
        <h1 class="title">匹配中</h1>
        <p class="subtitle">正在匹配订单，请稍候</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  --pay-blue: #1677ff;
  --ink: #0f172a;
  --muted: #64748b;

  position: relative;
  isolation: isolate;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  overflow: hidden;
  background:
    radial-gradient(ellipse 90% 55% at 50% -15%, rgba(22, 119, 255, 0.16), transparent 58%),
    linear-gradient(165deg, #eef5ff 0%, #ffffff 42%, #f5f8fc 100%);
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}

.stage {
  width: min(100%, 320px);
  text-align: center;
  animation: rise 0.55s ease-out both;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2.75rem;
}

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--pay-blue);
}

.status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loader {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 1.5rem;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid transparent;
  border-top-color: var(--pay-blue);
  border-right-color: rgba(22, 119, 255, 0.25);
  animation: spin 1s linear infinite;
}

.ring-delay {
  inset: 8px;
  border-top-color: rgba(22, 119, 255, 0.55);
  border-right-color: transparent;
  animation-duration: 1.45s;
  animation-direction: reverse;
}

.dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--pay-blue);
  animation: pulse 1.2s ease-in-out infinite;
}

.title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink);
}

.subtitle {
  margin: 0.65rem 0 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.85);
    opacity: 0.65;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
