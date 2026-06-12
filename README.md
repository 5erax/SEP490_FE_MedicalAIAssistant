# MediMate AI Frontend

Frontend cho **MediMate AI**, nền tảng hỗ trợ người dùng theo dõi sức khỏe, phân tích triệu chứng, quản lý hồ sơ y tế và kết nối với cơ sở y tế. Ứng dụng cũng cung cấp không gian làm việc riêng cho nhân viên y tế và quản trị viên.

> **Lưu ý y tế:** MediMate AI chỉ cung cấp thông tin hỗ trợ và không thay thế chẩn đoán, tư vấn hoặc điều trị từ bác sĩ hay cơ sở y tế có chuyên môn. Trong tình huống khẩn cấp, hãy liên hệ ngay dịch vụ cấp cứu tại địa phương.

## Tính năng chính

- Đăng ký, đăng nhập bằng tài khoản hoặc Google OAuth.
- Phân tích triệu chứng và trò chuyện với trợ lý AI.
- Tìm kiếm cơ sở y tế, chuyên khoa và bác sĩ phù hợp.
- Quản lý hồ sơ cá nhân, hồ sơ y tế và thông tin thuốc.
- Đăng ký gói dịch vụ và xử lý kết quả thanh toán PayOS.
- Phân quyền không gian làm việc cho người dùng, nhân viên y tế và quản trị viên.
- Quản trị người dùng, cơ sở y tế, bác sĩ, gói đăng ký và cấu hình AI.
- Đăng ký bác sĩ qua liên kết mời.
- Hỗ trợ tùy chỉnh hiển thị và kiểm thử accessibility.

## Công nghệ

- React 19
- Vite 8
- MapLibre GL và React Map GL
- Google OAuth
- Playwright và axe-core
- ESLint
- Vercel

## Yêu cầu

- Node.js `20.19.0` trở lên, hoặc `22.12.0` trở lên
- npm
- Backend MediMate AI đang hoạt động
- Google OAuth Client ID nếu cần kiểm thử đăng nhập Google

## Cài đặt

```bash
git clone https://github.com/5erax/SEP490_FE_MedicalAIAssistant.git
cd SEP490_FE_MedicalAIAssistant
npm install
```

Tạo file môi trường từ mẫu:

```bash
cp .env.example .env.local
```

Trên PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Cập nhật các biến trong `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Có | Địa chỉ backend. Vite chuyển tiếp các request `/api/*` đến địa chỉ này. |
| `VITE_GOOGLE_CLIENT_ID` | Khi dùng Google OAuth | Client ID được cấu hình cho domain chạy frontend. |

Không commit khóa API, token, mật khẩu hoặc thông tin xác thực thật vào repository.

## Chạy dự án

```bash
npm run dev
```

Ứng dụng mặc định chạy tại [http://localhost:3000](http://localhost:3000).

## Các lệnh hữu ích

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển tại cổng 3000 |
| `npm run build` | Tạo production build trong `dist/` |
| `npm run preview` | Xem thử production build |
| `npm run lint` | Kiểm tra mã nguồn bằng ESLint |
| `npm run test:e2e` | Chạy toàn bộ kiểm thử Playwright |
| `npm run test:e2e:routes` | Kiểm tra các route chính |
| `npm run test:e2e:a11y` | Kiểm tra accessibility bằng Playwright và axe-core |
| `npm run test:e2e:performance` | Chạy kiểm thử hiệu năng |
| `npm run test:e2e:visual` | Chạy kiểm thử giao diện trực quan |

## Kiến trúc thư mục

```text
src/
├── components/   # Thành phần giao diện theo miền chức năng
├── pages/        # Các trang và workspace
├── router/       # Điều hướng và danh sách route
├── services/     # API client, endpoint và domain services
├── state/        # Trạng thái và tùy chọn hiển thị
├── styles/       # Design tokens và stylesheet
└── utils/        # Tiện ích dùng chung

tests/e2e/         # Kiểm thử end-to-end, accessibility và visual
docs/              # Tài liệu luồng nghiệp vụ và tích hợp backend
```

API frontend được tổ chức theo luồng:

```text
Page/Component -> Domain Service -> ENDPOINTS -> apiRequest() -> Backend
```

Xem [API_ARCHITECTURE.md](API_ARCHITECTURE.md) để biết quy ước chi tiết. Các endpoint mới nên được khai báo trong `src/services/endpoints.js`, không viết trực tiếp rải rác trong component.

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

Không nên giữ địa chỉ backend cố định trong `vercel.json` khi chuyển môi trường. Hãy cập nhật cấu hình triển khai phù hợp và luôn sử dụng HTTPS cho production.

## Tài liệu liên quan

- [Kiến trúc API](API_ARCHITECTURE.md)
- [Luồng và use case](docs/flows-and-use-cases.md)
- [Đăng ký bác sĩ bằng invitation](docs/2.md)
- [Ghi chú tích hợp facility department](docs/backend-facility-department-note.md)
- [Điều kiện tích hợp thanh toán](docs/backend-payment-readiness-note.md)

## Bảo mật

Không báo cáo lỗ hổng bảo mật trong issue công khai. Vui lòng đọc [SECURITY.md](SECURITY.md) để biết phạm vi hỗ trợ và cách gửi báo cáo riêng tư.

## Giấy phép

Dự án được phát hành theo [MIT License](LICENSE).
