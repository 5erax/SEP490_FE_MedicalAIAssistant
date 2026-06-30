## Tóm tắt

-
-

## Loại thay đổi

Chọn các mục phù hợp:

- [ ] Sửa lỗi
- [ ] Tính năng mới
- [ ] Cập nhật UI/UX
- [ ] Refactor không đổi hành vi
- [ ] Cập nhật tài liệu
- [ ] Cấu hình, build hoặc CI/CD
- [ ] Bảo mật, xác thực hoặc phân quyền

## Phạm vi ảnh hưởng

Mô tả ngắn các khu vực bị ảnh hưởng, ví dụ: route, component, service API, auth, payment, admin, doctor, chat, map hoặc tài liệu.

## Kiểm thử

Liệt kê các lệnh đã chạy và kết quả:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e:routes`
- [ ] `npm run test:e2e:a11y`
- [ ] `npm run test:e2e:visual`
- [ ] Chưa chạy test vì:

## UI/UX checklist

Hoàn thành nếu PR có thay đổi giao diện hoặc trải nghiệm người dùng:

- [ ] Đã kiểm tra desktop.
- [ ] Đã kiểm tra mobile/responsive.
- [ ] Trạng thái loading, empty, error, disabled và retry đã được xử lý nếu cần.
- [ ] Form có label, validation message và feedback rõ ràng.
- [ ] Tương tác chính dùng được bằng bàn phím.
- [ ] Có ảnh chụp hoặc video minh họa thay đổi UI.

## Bảo mật và dữ liệu nhạy cảm

- [ ] Không commit `.env`, secret, token, cookie, mật khẩu, API key hoặc URL private.
- [ ] Không log hoặc hiển thị dữ liệu sức khỏe, dữ liệu cá nhân, dữ liệu thanh toán hoặc payload nhạy cảm.
- [ ] Không thay đổi logic xác thực, phân quyền, thanh toán hoặc dữ liệu y tế ngoài phạm vi PR.
- [ ] Biến môi trường mới đã được cập nhật trong `.env.example` hoặc tài liệu liên quan.

## Checklist trước khi request review

- [ ] PR có title rõ ràng theo Conventional Commits khi phù hợp.
- [ ] Description giải thích thay đổi gì và vì sao.
- [ ] Scope đủ nhỏ để reviewer kiểm tra hiệu quả.
- [ ] Không có thay đổi ngoài phạm vi.
- [ ] Không có file build, report, log local hoặc artifact không cần thiết.
- [ ] Breaking changes, migration hoặc tác động deployment đã được nêu rõ nếu có.

## Ghi chú thêm

Thêm context, rủi ro còn lại, quyết định kỹ thuật hoặc link issue liên quan.
