# 4F Pay

对接 `4f-api` 聚合支付收银台：选择支付类型 + 输入金额 → 拉起支付链接。

## 启动

```bash
npm install
npm run dev
```

默认 `http://localhost:5173`。开发代理：

- 前端 `/api/*` → `http://127.0.0.1:9099/sifang-api/api/*`

请先启动 `4f-api`（端口 9099，`context-path=/sifang-api`）。

## 接口

- `POST /api/pay/aggregate`  
  入参：`amount`（分）、`payType`（`ALIPAY` / `WECHAT` / …）  
  出参：`payUrl`、`orderNo`、`amount`、`payType`、`status`
- `GET /api/pay/aggregate/{orderNo}`  
  查单；`status=4` 为支付成功（前端每 3 秒轮询，成功后跳成功页）

## 页面

- `/` — 收银台（金额 + 支付方式 → 二维码/订单号 → 轮询 → 成功页）
