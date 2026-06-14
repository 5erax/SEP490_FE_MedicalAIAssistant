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

### FE-STATE-008: Chuẩn hóa trạng thái dữ liệu Admin Facilities

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải cơ sở, liên kết chuyên khoa, thông báo submit và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo tạo cơ sở và bổ sung retry tại chỗ.
- [x] Chuẩn hóa loading, error và empty state bằng primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-AUTH-009: Ổn định onboarding hồ sơ và validation

- [x] Đối chiếu route guard, auth response, `/api/users/me` và patient profile contract.
- [x] Hợp nhất `firstLogin` với `isProfileCompleted` và chỉ áp dụng onboarding cho Patient.
- [x] Chuẩn hóa validation thông tin cá nhân và sức khỏe ở màn hình tạo/chỉnh sửa hồ sơ.
- [x] Bổ sung test đăng nhập lại sau khi hoàn tất hồ sơ và test role Doctor.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-PAY-010: Kết thúc ngay luồng PayOS cancel

- [x] Audit callback `/payment/cancel`, status polling và contract `payos-status`.
- [x] Hiển thị trạng thái đã hủy ngay, không poll kéo dài hoặc suy diễn quyền lợi thanh toán.
- [x] Bổ sung test đảm bảo cancel không gọi status API tự động.
- [x] Chạy kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-SEC-011: Khắc phục cảnh báo CodeQL frontend và workflow

- [x] Xác minh đường truyền file upload tới DOM và quyền `GITHUB_TOKEN` hiện tại.
- [x] Loại bỏ URL file không tin cậy khỏi thuộc tính DOM, đồng thời validate loại/kích thước ảnh.
- [x] Khai báo quyền đọc tối thiểu ở cấp workflow và giữ quyền ghi package riêng cho publish job.
- [x] Bổ sung kiểm thử upload ảnh không hợp lệ/hợp lệ.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-SEC-012: Loại PII khỏi auth storage

- [x] Xác minh đường truyền `phoneNumber` từ auth/profile response tới localStorage.
- [x] Chỉ lưu token, role, ID kỹ thuật, onboarding và entitlement bằng whitelist rõ ràng.
- [x] Loại email, tên, địa chỉ, số điện thoại và refresh token khỏi auth storage.
- [x] Tự làm sạch auth storage cũ khi phiên được đọc.
- [x] Bổ sung test cho login response và phiên cũ có chứa PII.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-DOC-013: Chuẩn hóa backend backlog để giao việc

- [x] Xác minh lại Swagger và dữ liệu deploy ngày 2026-06-14.
- [x] Loại các blocker đã lỗi thời về facility, symptom history và Bearer security.
- [x] Thêm bảng ưu tiên, trạng thái đề xuất, phụ thuộc, Definition of Ready và Definition of Done.
- [x] Chi tiết hóa contract, error, kiểm thử và tiêu chí nghiệm thu cho các ticket backend trọng yếu.
- [x] Đồng bộ contract status và ghi chú Doctor invitation.
- [x] Kiểm tra mã ticket, code fence, link Markdown và `git diff --check`.

### FE-MAP-014: Khôi phục và ổn định bản đồ cơ sở y tế

- [x] Kiểm tra route, component, service, API live, local và production.
- [x] Xác định rủi ro loading/error không hiển thị, style ngoài và tọa độ fallback giả.
- [x] Tạo kế hoạch triển khai theo giai đoạn và tiêu chí đóng task.
- [x] Thêm quan sát runtime và trạng thái map loading/ready/error.
- [x] Loại tọa độ giả và chuẩn hóa facility thiếu tọa độ.
- [x] Thêm fallback/retry khi style hoặc WebGL lỗi.
- [x] Hoàn thiện keyboard, skip link, reduced motion và responsive.
- [x] Bổ sung test hồi quy map, contract và accessibility.
- [x] Chạy lint, build, test và cập nhật nhật ký sau triển khai.

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
| 2026-06-14 | FE-STATE-008 | Hoàn thành | Tách lỗi tải cơ sở/liên kết chuyên khoa khỏi thông báo submit; migrate loading/error/empty state và thêm retry an toàn | `npm.cmd run lint`; `npm.cmd run build`; Admin state 8 passed; Facilities 2 passed, gồm viewport 390x844; accessibility 14 passed; CTA retry 44 px và không tràn ngang |
| 2026-06-14 | FE-AUTH-009 | Hoàn thành | Hợp nhất `firstLogin`/`isProfileCompleted`; giới hạn onboarding cho Patient; không dùng auth storage cho phone; dùng validation chung và lỗi field có liên kết ARIA | `npm.cmd run lint`; `npm.cmd run build`; auth/profile/payment/upload 19 passed; accessibility 14 passed |
| 2026-06-14 | FE-PAY-010 | Hoàn thành | `/payment/cancel` kết thúc ngay ở trạng thái đã hủy, không poll status API và không thay đổi entitlement | Payment result 2 passed; browser xác nhận trạng thái `Đã hủy` hiển thị ngay |
| 2026-06-14 | FE-SEC-011 | Hoàn thành | Decode ảnh hợp lệ vào canvas thay vì gắn file URL vào DOM; giới hạn JPG/PNG/WEBP 10 MB; thêm quyền workflow tối thiểu | Medication upload 1 passed; không còn `createObjectURL`/`img src={preview}`; `git diff --check` passed |
| 2026-06-14 | FE-SEC-012 | Hoàn thành | Whitelist auth storage và tự làm sạch phiên cũ; loại email, tên, địa chỉ, số điện thoại và refresh token khỏi localStorage | `npm.cmd run lint`; `npm.cmd run build`; auth/profile/backend contract 22 passed; payment/upload 3 passed; accessibility 14 passed; không còn đường `phoneNumber` tới `setStoredAuth` |
| 2026-06-14 | FE-DOC-013 | Hoàn thành | Chuẩn hóa backend backlog; cập nhật contract live; thêm delivery status, phụ thuộc, contract, test và bằng chứng nghiệm thu | 18 ticket hợp lệ; code fence/link Markdown hợp lệ; `git diff --check` passed |
| 2026-06-14 | FE-MAP-014 | Hoàn thành | Thêm map loading/error/retry; loại tọa độ giả; giữ list fallback; thêm keyboard, skip link, reduced motion và responsive | `npm.cmd run lint`; `npm.cmd run build`; map 4 passed; backend contract 5 passed; accessibility 14 passed; browser desktop/mobile không tràn ngang và không console error |

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
