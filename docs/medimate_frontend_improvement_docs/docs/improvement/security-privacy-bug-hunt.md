# Security & privacy bug hunt

Ngày cập nhật: **2026-06-26**.

MediMate AI xử lý ngữ cảnh y tế, tài khoản, subscription/payment và workspace quản trị. Vì vậy security/privacy issue có thể là P0 dù UI vẫn chạy.

## 1. Dữ liệu nhạy cảm

Xem là nhạy cảm:

- Access token.
- Refresh token.
- Email.
- Số điện thoại.
- Địa chỉ.
- Hồ sơ cá nhân/patient profile.
- Triệu chứng.
- Câu trả lời lâm sàng.
- Kết quả AI.
- Payment/order/subscription detail.
- Admin/user data.
- Invitation token.

## 2. Storage checklist

- [ ] `localStorage` chỉ chứa auth whitelist kỹ thuật.
- [ ] Không lưu refresh token.
- [ ] Không lưu email/số điện thoại/địa chỉ.
- [ ] Không lưu symptom/AI result.
- [ ] Logout clear auth state.
- [ ] Token hết hạn được clear.
- [ ] Legacy auth storage có PII được cleanup.

## 3. Logging checklist

Không được log:

- Token.
- PII.
- Medical content.
- Payment/order detail.
- Backend full payload chứa dữ liệu nhạy cảm.
- Invitation token.

Kiểm tra:

- [ ] `console.log`
- [ ] `console.error`
- [ ] test output
- [ ] screenshot/video artifact
- [ ] analytics event
- [ ] error message hiển thị user

## 4. Route/access checklist

- [ ] Admin route yêu cầu admin.
- [ ] Staff route yêu cầu staff/admin hoặc role hợp lệ.
- [ ] Patient profile yêu cầu đúng user.
- [ ] Premium route không expose data nhạy cảm khi chưa đủ quyền.
- [ ] Public route không fetch admin/user list.
- [ ] Route protected direct URL không render shell/data trước redirect.
- [ ] Forbidden state không reveal data.

## 5. API request checklist

- [ ] Request cần auth có `{ auth: true }`.
- [ ] Không gọi backend admin API từ public page.
- [ ] Không hard-code backend host trong component.
- [ ] Dynamic URL segment encode khi cần.
- [ ] Không gửi field dư trong payload.
- [ ] Không gửi client-only role/permission như nguồn sự thật.
- [ ] Không gọi webhook/payment provider trực tiếp.

## 6. Payment checklist

- [ ] Success xác minh bằng backend.
- [ ] Cancel không bị coi là success.
- [ ] Pending rõ.
- [ ] User không truy vấn order của user khác chỉ bằng orderCode đoán được.
- [ ] Không hiển thị raw payment error nhạy cảm.
- [ ] Không log payment response full nếu có sensitive field.

## 7. Medical/AI checklist

- [ ] Không gửi triệu chứng vào analytics.
- [ ] Không lưu triệu chứng vào localStorage nếu không cần.
- [ ] Không log AI prompt/result.
- [ ] AI result có disclaimer.
- [ ] Emergency path không bị chặn bởi premium.
- [ ] Không tự thêm clinical advice ngoài product/domain approved copy.
- [ ] Không dùng mock diagnosis như thật.

## 8. DOM/XSS checklist

- [ ] Không dùng `dangerouslySetInnerHTML` với content không tin cậy.
- [ ] URL từ backend được validate trước khi đặt vào `href/src`.
- [ ] File upload validate type/size.
- [ ] Không render raw HTML từ backend.
- [ ] External link dùng policy phù hợp nếu mở tab mới.
- [ ] Error message không inject HTML.

## 9. Environment checklist

- [ ] `.env.local` không commit.
- [ ] Secret không có prefix `VITE_` nếu không cần public.
- [ ] AI provider key không nằm trong client.
- [ ] Backend URL production không hard-code lâu dài nếu có nhiều env.
- [ ] OAuth client ID đúng domain; không lẫn secret.

## 10. Security issue severity

| Severity | Ví dụ |
| --- | --- |
| P0 | Lộ token/PII/medical content, admin route public, payment success giả |
| P1 | Error reveal sensitive detail, role guard inconsistent |
| P2 | Privacy copy thiếu rõ ràng, local artifact chứa data giả nhạy cảm |
| P3 | Security docs thiếu cập nhật |

## 11. Security bug report template

```md
# Security/privacy issue

## Summary

...

## Severity

P0/P1/P2/P3

## Data involved

- Token:
- PII:
- Medical:
- Payment:
- Admin:

## Reproduction

...

## Impact

...

## Root cause

...

## Proposed fix

...

## Verification

- [ ] Storage checked
- [ ] Logs checked
- [ ] Route guard checked
- [ ] API checked
- [ ] Tests added/updated
```

## 12. Không được làm

- Public issue chứa token/PII/medical data.
- Screenshot chứa thông tin user thật.
- Commit dữ liệu thật để reproduce.
- Gửi full payload lỗi vào PR comment.
- Fix bằng cách chỉ ẩn UI trong khi API vẫn leak data.
