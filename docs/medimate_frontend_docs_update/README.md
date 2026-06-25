# MediMate AI Frontend

Frontend cho **MediMate AI**, nền tảng định hướng trước khi đi khám. Ứng dụng giúp người dùng mô tả triệu chứng, nhận gợi ý chuyên khoa và tìm cơ sở y tế phù hợp; đồng thời cung cấp workspace vận hành cho Staff và Admin.

> **Lưu ý y tế:** MediMate AI chỉ cung cấp thông tin hỗ trợ và không thay thế chẩn đoán, tư vấn hoặc điều trị từ bác sĩ hay cơ sở y tế có chuyên môn. Trong tình huống khẩn cấp, hãy liên hệ ngay dịch vụ cấp cứu tại địa phương.

## Tính năng chính

- Đăng ký, đăng nhập bằng tài khoản hoặc Google OAuth.
- Quên mật khẩu và đổi mật khẩu.
- Phân tích triệu chứng, câu hỏi lâm sàng và phiên phân tích.
- Tìm kiếm cơ sở y tế, chuyên khoa, khoa tại cơ sở và bác sĩ.
- Quản lý hồ sơ cá nhân phục vụ onboarding và định hướng.
- Đăng ký gói dịch vụ, checkout và xử lý kết quả PayOS đã xác minh.
- Không gian làm việc cho Patient, Staff và Admin.
- Quản trị người dùng, cơ sở y tế, bác sĩ, chuyên khoa, chương ICD, câu hỏi lâm sàng, gói đăng ký và cấu hình AI.
- Đăng ký Staff chờ duyệt và đăng ký Doctor bằng liên kết mời.
- Kiểm thử route, accessibility, performance và visual regression bằng Playwright.

Các màn hình hồ sơ y tế và quản lý thuốc hiện chỉ là demo hoặc capability thử nghiệm nếu chưa có backend production và product decision rõ ràng.

## Công nghệ hiện tại

- React `19.3.0-canary-dbc37501-20260612`
- React DOM `19.3.0-canary-dbc37501-20260612`
- Vite `8.0.16`
- Google OAuth
- MapLibre GL, React Map GL
- Playwright, axe-core
- ESLint flat config
- Vercel

> Repo đang dùng React canary theo ngày. Không nâng version React/Vite hoặc đổi framework khi chưa có PR riêng, lý do kỹ thuật rõ ràng và kết quả regression test.

## Yêu cầu

- Node.js phù hợp với Vite 8. Khuyến nghị dùng Node.js LTS mới đủ hỗ trợ Vite hiện tại.
- npm.
- Backend MediMate AI đang hoạt động.
- Google OAuth Client ID nếu kiểm thử đăng nhập Google.
- Không commit khóa API, token, mật khẩu hoặc thông tin xác thực thật vào repository.

## Cài đặt

```bash
git clone https://github.com/5erax/SEP490_FE_MedicalAIAssistant.git
cd SEP490_FE_MedicalAIAssistant
npm install
```

Tạo file môi trường:

```bash
cp .env.example .env.local
```

Trên PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Cập nhật `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Có | Backend target cho Vite proxy `/api/*`. |
| `VITE_GOOGLE_CLIENT_ID` | Khi dùng Google OAuth | Google OAuth Client ID cho domain frontend. |

## Chạy dự án

```bash
npm run dev
```

Ứng dụng mặc định chạy tại `http://localhost:3000`.

## Các lệnh bắt buộc cần biết

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển tại cổng 3000 |
| `npm run build` | Tạo production build trong `dist/` |
| `npm run preview` | Xem thử production build |
| `npm run lint` | Kiểm tra mã nguồn bằng ESLint |
| `npm run test:e2e` | Chạy toàn bộ kiểm thử Playwright |
| `npm run test:e2e:routes` | Kiểm tra route, alias, redirect và uncaught page error |
| `npm run test:e2e:a11y` | Kiểm tra accessibility bằng Playwright và axe-core |
| `npm run test:e2e:performance` | Chạy kiểm thử hiệu năng smoke |
| `npm run test:e2e:visual` | Chạy kiểm thử visual regression |
| `npm run test:e2e:visual:update` | Cập nhật snapshot sau khi thay đổi UI đã được review |

## Kiến trúc hiện tại

```text
src/
├── components/   # Component dùng chung và workspace shell
├── pages/        # Route/page hiện tại
├── router/       # Route registry, access guard và navigation helper
├── services/     # API client, endpoint và domain services
├── state/        # Trạng thái UI/personalization
├── styles/       # CSS, token và stylesheet
└── utils/        # Tiện ích dùng chung

tests/e2e/         # Route, accessibility, performance và visual tests
docs/              # Tài liệu sản phẩm, backend, kiến trúc, UI/UX và quality
```

API frontend đi theo luồng bắt buộc:

```text
Page/Component -> Domain Service -> ENDPOINTS -> apiRequest() -> Backend
```

Route frontend đi theo luồng bắt buộc:

```text
URL -> src/router/routes.js -> src/router/access.js -> src/App.jsx -> Page/Shell
```

## Quy tắc production bắt buộc

Mọi PR frontend phải thỏa mãn các gate sau:

1. Không hard-code endpoint trong component/page.
2. Không gửi token, PII, triệu chứng, câu trả lời lâm sàng hoặc kết quả AI vào log, analytics, screenshot hoặc localStorage ngoài whitelist.
3. Không thêm capability sản phẩm nếu chưa có actor, API contract, quyền truy cập và tiêu chí nghiệm thu.
4. Không thêm thư viện lớn hoặc đổi kiến trúc khi chưa có lý do, phạm vi và test regression.
5. Không commit code chết, file thử nghiệm, snapshot sai, mock production hoặc comment TODO mơ hồ.
6. Build, lint và test liên quan phải đạt trước khi merge.
7. Tài liệu phải được cập nhật nếu thay đổi route, API, state, UI pattern, env, deployment hoặc test gate.

Chi tiết xem [Frontend production standards](docs/frontend-architecture/production-frontend-standards.md).

## Triển khai

Dự án được cấu hình cho Vercel:

- `/api/*` được rewrite đến backend.
- Các route SPA được rewrite về `index.html`.
- Google OAuth Client ID phải cho phép domain production tương ứng.

Trước khi triển khai:

```bash
npm run lint
npm run build
npm run test:e2e
```

Không nên giữ backend IP cố định trong cấu hình production dài hạn. Khi chuyển môi trường, cần dùng cấu hình deployment/environment phù hợp và HTTPS.

## Tài liệu bắt đầu từ đâu

- [Mục lục tài liệu](docs/README.md)
- [Định nghĩa sản phẩm và luồng nghiệp vụ](docs/product-definition/README.md)
- [Backend và tích hợp](docs/backend/README.md)
- [Kiến trúc frontend](docs/frontend-architecture/README.md)
- [Frontend production standards](docs/frontend-architecture/production-frontend-standards.md)
- [Developer workflow](docs/frontend-architecture/developer-workflow.md)
- [Refactor & cleanup guide](docs/frontend-architecture/refactor-cleanup-guide.md)
- [Testing baseline](docs/quality/testing-baseline.md)
- [UI/UX](docs/ui-ux/README.md)

## Bảo mật

Không báo cáo lỗ hổng bảo mật trong issue công khai. Vui lòng đọc [SECURITY.md](SECURITY.md) để biết phạm vi hỗ trợ và cách gửi báo cáo riêng tư.

## Giấy phép

Dự án được phát hành theo [MIT License](LICENSE).
