# Hướng dẫn đóng góp

Cảm ơn bạn muốn đóng góp cho MediMate AI Frontend. Dự án có các luồng liên quan đến sức khỏe, xác thực và thanh toán, nên mọi thay đổi cần nhỏ, dễ review và thận trọng với dữ liệu nhạy cảm.

## Trước khi bắt đầu

- Đọc [README.md](../README.md), [SECURITY.md](SECURITY.md) và tài liệu liên quan trong [docs/](../docs/).
- Kiểm tra issue và pull request hiện có để tránh làm trùng việc.
- Giữ mỗi thay đổi tập trung vào một lỗi, một tính năng hoặc một cập nhật tài liệu.
- Không sửa file ngoài phạm vi và không xóa hành vi hiện có nếu issue không yêu cầu.

## Cài đặt môi trường

```bash
npm install
cp .env.example .env.local
npm run dev
```

Trên PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Dùng biến môi trường có tiền tố `VITE_` cho cấu hình frontend. Không commit `.env`, secret, token, mật khẩu, OAuth secret, API key, URL backend riêng tư hoặc dữ liệu thật của người dùng.

## Nhánh và commit

- Tạo nhánh từ `main` mới nhất, trừ khi maintainer yêu cầu base khác.
- Dùng Conventional Commits, ví dụ:
  - `fix(auth): handle expired login session`
  - `feat(ui): add payment result retry state`
  - `docs(config): document required environment variables`
- Giữ commit ngắn gọn, đúng phạm vi và mô tả rõ mục đích.

## Quy tắc code

- Theo cấu trúc React/Vite hiện có.
- Đặt API call trong domain service và khai báo endpoint tập trung ở `src/services/endpoints.js`.
- Không hard-code secret, token, mật khẩu, API key, URL private hoặc cấu hình production nhạy cảm.
- Không đổi route, access control, validation hoặc API contract nếu issue không yêu cầu.
- Xem dữ liệu sức khỏe, dữ liệu cá nhân, xác thực và thanh toán là dữ liệu nhạy cảm.
- Không log triệu chứng, câu trả lời lâm sàng, kết quả AI, payment payload, token, cookie hoặc invitation link.

## UI và accessibility

- Giữ responsive behavior cho mobile và desktop.
- Form cần có label, hint/error, loading, empty, disabled và retry state phù hợp.
- Các nút, link, dialog, menu, bảng, form và map interaction phải dùng được bằng bàn phím.
- Không viết UI copy khiến kết quả AI bị hiểu là chẩn đoán y khoa chắc chắn.

## Kiểm thử

Chạy các kiểm tra liên quan trước khi mở pull request:

```bash
npm run lint
npm run build
npm run test:e2e:routes
```

Chạy thêm khi thay đổi chạm tới luồng tương ứng:

- `npm run test:e2e:a11y` cho thay đổi accessibility hoặc cấu trúc UI.
- `npm run test:e2e:visual` cho thay đổi layout/giao diện.
- `npm run test:e2e` cho thay đổi rộng ở route, auth, payment, admin, map hoặc luồng lâm sàng.

Nếu command fail, ghi rõ lỗi trong pull request và nêu lỗi phát sinh từ thay đổi của bạn hay là lỗi đã biết.

## Checklist pull request

Trước khi request review, kiểm tra:

- PR có title và description rõ.
- Scope đủ nhỏ để review.
- Summary nêu rõ thay đổi gì và vì sao.
- Testing notes liệt kê đúng command đã chạy.
- Biến môi trường mới hoặc thay đổi cấu hình đã được tài liệu hóa.
- Rủi ro security, privacy, payment và dữ liệu y tế đã được nêu nếu có.
- Có ảnh hoặc video cho thay đổi UI đáng kể.
- Không commit report test, log local, `.env` hoặc artifact sinh ra từ máy cá nhân.

## Code review

Reviewer nên ưu tiên bug, regression, thiếu test, accessibility, privacy và security. Comment chỉ về style nên giới hạn ở những điểm ảnh hưởng maintainability hoặc consistency.

Contributor cần phản hồi lịch sự, làm rõ giả định và cập nhật PR khi feedback chỉ ra vấn đề thật.

## Báo cáo bảo mật

Không báo cáo lỗ hổng trong issue hoặc pull request công khai. Làm theo [SECURITY.md](SECURITY.md) để gửi báo cáo riêng tư.

## Quy tắc ứng xử

Mọi contributor phải tuân thủ [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
