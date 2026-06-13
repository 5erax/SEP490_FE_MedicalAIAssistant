# Frontend task checklist

Tài liệu này theo dõi các nhiệm vụ frontend được thực hiện trên nhánh
`codex/frontend-docs-task-checklist`. Mỗi thay đổi phải được cập nhật tại đây
trước khi commit để phạm vi, trạng thái và kết quả kiểm tra có thể được rà soát.

## Quy ước trạng thái

- `[ ]` Chưa bắt đầu.
- `[-]` Đang thực hiện hoặc đang bị chặn.
- `[x]` Đã hoàn thành và đã cập nhật nhật ký thay đổi.

## Checklist chung cho mỗi nhiệm vụ

- [ ] Xác định mục tiêu, phạm vi và tiêu chí hoàn thành.
- [ ] Kiểm tra component, route, service, API contract và biến môi trường liên quan.
- [ ] Triển khai thay đổi nhỏ, đúng kiến trúc và không sửa file ngoài phạm vi.
- [ ] Kiểm tra responsive, accessibility và trạng thái lỗi nếu có thay đổi UI.
- [ ] Chạy các lệnh kiểm tra phù hợp và ghi kết quả bên dưới.
- [ ] Cập nhật tài liệu kiến trúc hoặc tích hợp khi hành vi hệ thống thay đổi.
- [ ] Ghi đầy đủ file đã đổi, tác động và giới hạn trong nhật ký thay đổi.
- [ ] Dùng Conventional Commit và phản ánh checklist trong PR description.

## Nhiệm vụ

### FE-DOC-001: Thiết lập cơ chế theo dõi nhiệm vụ frontend

- [x] Tạo nhánh riêng cho các nhiệm vụ frontend trong tài liệu.
- [x] Tạo checklist chung cho quá trình phân tích, triển khai và kiểm tra.
- [x] Thêm nhật ký thay đổi để commit và PR có thể đối chiếu.
- [x] Liên kết checklist từ mục lục tài liệu frontend.

### FE-ROUTE-001: Chuẩn hóa route và luồng quay lại tác vụ

- [x] Xác nhận phạm vi và tiêu chí hoàn thành từ navigation roadmap.
- [x] Kiểm tra `App.jsx`, navigation, auth/signup, pricing và admin workspace.
- [x] Tạo route registry cho title, access, alias và admin section.
- [x] Chuẩn hóa `returnTo` nội bộ cho login, signup, profile setup và premium gate.
- [x] Thêm URL riêng cho admin section và hỗ trợ refresh, Back/Forward.
- [x] Bổ sung route, auth redirect và admin deep-link tests.
- [x] Chạy lint, build, route tests và accessibility smoke tests.
- [x] Cập nhật nhật ký thay đổi với file, tác động và kết quả kiểm tra.

## Nhật ký thay đổi

| Ngày | Mã nhiệm vụ | Trạng thái | Thay đổi | Kiểm tra |
| --- | --- | --- | --- | --- |
| 2026-06-13 | FE-DOC-001 | Hoàn thành | Thêm checklist nhiệm vụ frontend và liên kết từ mục lục tài liệu | Kiểm tra Markdown, link tương đối và `git diff --check` |
| 2026-06-13 | FE-ROUTE-001 | Hoàn thành | Thêm route registry; bảo vệ `returnTo`; giữ tác vụ qua signup/profile/PayOS; canonical alias; thêm URL cho 8 admin section | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 10 passed; accessibility 14 passed; browser kiểm tra admin alias và premium gate |

## Mẫu cập nhật

Sao chép khối sau khi bắt đầu nhiệm vụ mới:

```md
### FE-XXX: Tên nhiệm vụ

- [ ] Xác nhận phạm vi và tiêu chí hoàn thành.
- [ ] Kiểm tra code và API contract liên quan.
- [ ] Hoàn thành triển khai.
- [ ] Hoàn thành kiểm tra phù hợp.
- [ ] Cập nhật tài liệu và nhật ký thay đổi.
```

Thêm một dòng vào bảng nhật ký với ngày cập nhật, mã nhiệm vụ, trạng thái, mô tả
file hoặc hành vi đã thay đổi và các lệnh kiểm tra thực tế đã chạy.
