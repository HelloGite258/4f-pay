# 4F Pay

支付收银台：通过 `/:orderNo` 打开订单并拉起支付。

## 启动

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（默认 `http://localhost:5173`）。

## 路径

- `/:orderNo` — 查询订单并获取支付链接
- 其他路径 — 页面异常
