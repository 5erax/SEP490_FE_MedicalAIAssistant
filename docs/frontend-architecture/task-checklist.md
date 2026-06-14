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

### FE-ROUTE-002: Hợp nhất guard pipeline và navigation model

- [x] Xác nhận hai hạng mục P0 còn lại trong navigation roadmap.
- [x] Kiểm tra role/profile guard và navigation đang khai báo trong page/component.
- [x] Thực thi auth, role, first-login và premium guard từ route metadata.
- [x] Tạo navigation model dùng chung cho Patient, Staff và Admin.
- [x] Chuyển sidebar Patient/Admin sang dữ liệu từ registry, không đổi giao diện.
- [x] Bổ sung permission matrix và first-login route tests.
- [x] Chạy lint, build, route, navigation và accessibility tests.
- [x] Cập nhật nhật ký thay đổi với file, tác động và kết quả kiểm tra.

### FE-UI-003: Chuẩn hóa Dialog và Drawer focus foundation

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-03.
- [x] Audit premium notice, patient drawer và các admin modal hiện tại.
- [x] Tạo foundation dùng chung cho focus trap, Escape, backdrop và restore focus.
- [x] Chuyển premium notice và admin modal sang Dialog foundation.
- [x] Chuyển patient mobile drawer sang cùng focus-management contract.
- [x] Bổ sung keyboard tests cho Tab cycle, inert background và restore focus.
- [x] Chạy lint, build, route, navigation và accessibility tests.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-004: Chuẩn hóa trạng thái dữ liệu Admin Doctors

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải danh sách, phân trang, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-005: Chuẩn hóa trạng thái dữ liệu Admin AI Configs

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, lọc, phân trang, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-006: Chuẩn hóa trạng thái dữ liệu Admin Subscription Plans

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, đồng bộ, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-007: Chuẩn hóa trạng thái dữ liệu Admin Users

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, tìm kiếm, phân trang, thông báo thao tác và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuẩn hóa loading, error và empty state bằng primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

## Nhật ký thay đổi

| Ngày | Mã nhiệm vụ | Trạng thái | Thay đổi | Kiểm tra |
| --- | --- | --- | --- | --- |
| 2026-06-13 | FE-DOC-001 | Hoàn thành | Thêm checklist nhiệm vụ frontend và liên kết từ mục lục tài liệu | Kiểm tra Markdown, link tương đối và `git diff --check` |
| 2026-06-13 | FE-ROUTE-001 | Hoàn thành | Thêm route registry; bảo vệ `returnTo`; giữ tác vụ qua signup/profile/PayOS; canonical alias; thêm URL cho 8 admin section | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 10 passed; accessibility 14 passed; browser kiểm tra admin alias và premium gate |
| 2026-06-13 | FE-ROUTE-002 | Hoàn thành | Hợp nhất auth/role/first-login/premium guard; tạo navigation model Patient/Staff/Admin; chuyển sidebar Patient/Admin sang route registry; bổ sung permission matrix | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 12 passed; accessibility 14 passed; browser kiểm tra admin guard và return intent |
| 2026-06-13 | FE-UI-003 | Hoàn thành | Thêm Dialog/focus foundation; migrate premium notice, 4 admin modal và patient drawer; chuẩn hóa inert, Tab cycle, Escape, backdrop và restore focus | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 13 passed; accessibility 14 passed; browser kiểm tra premium dialog và inert background |
| 2026-06-13 | FE-STATE-004 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin Doctors | `npm.cmd run lint`; `npm.cmd run build`; Admin Doctors 2 passed; accessibility 14 passed; browser kiểm tra mobile 390x844 không tràn ngang |
| 2026-06-14 | FE-STATE-005 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin AI Configs | `npm.cmd run lint`; `npm.cmd run build`; Admin state 3 passed; accessibility 14 passed; browser kiểm tra mobile 390x844 không tràn ngang |
| 2026-06-14 | FE-STATE-006 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin Subscription Plans | `npm.cmd run lint`; `npm.cmd run build`; Admin state 5 passed; Subscription Plans 2 passed ở 390x844; accessibility 14 passed; browser kiểm tra bảng mobile không tràn trang |
| 2026-06-14 | FE-STATE-007 | Hoàn thành | Tách lỗi tải khỏi thông báo approve/delete; thêm retry an toàn, ẩn phân trang khi lỗi và ổn định assertion retry cho bộ Admin state | `npm.cmd run lint`; `npm.cmd run build`; Admin state 6 passed; Admin Users 1 passed ở 390x844; accessibility 14 passed; CTA retry 44 px và không tràn ngang |

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
