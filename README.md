# MediMate AI Frontend

React 19 + Vite frontend cho hệ thống trợ lý y khoa MediMate AI.

## Chạy local

```bash
npm install
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`. API development được cấu hình trong `.env.development` và proxy qua `/api`.

## Kiểm tra

```bash
npm run lint
npm run build
npm run test:e2e
```

## Production

- Vercel rewrite `/api/*` tới backend deploy theo `vercel.json`.
- SPA routes được rewrite về `index.html`.
- Các biến môi trường mẫu nằm trong `.env.example`.

## Tài liệu

- `API_ARCHITECTURE.md`: quy ước API layer.
- `docs/flows-and-use-cases.md`: luồng nghiệp vụ.
- `docs/2.md`: đăng ký bác sĩ bằng invitation.
- `docs/backend-facility-department-note.md`: phần backend còn thiếu cho invitation bác sĩ mới.
- `docs/backend-payment-readiness-note.md`: điều kiện backend để PayOS hoạt động end-to-end.
