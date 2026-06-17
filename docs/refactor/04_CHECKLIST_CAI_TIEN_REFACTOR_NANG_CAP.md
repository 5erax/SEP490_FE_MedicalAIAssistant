# 04. Checklist cải tiến và refactor MediMate AI Frontend — Bản nâng cấp triển khai thực tế

> Phiên bản tài liệu: 2026-06-17  
> Phạm vi: frontend React/Vite MediMate AI.  
> Đối tượng sử dụng: Frontend Developer, Senior Frontend Engineer, Reviewer, Tech Lead, PM/Founder.  
> Mục tiêu: biến checklist refactor thành backlog kỹ thuật có thể triển khai thật, có tiêu chí hoàn thành, bằng chứng kiểm tra, rủi ro và thứ tự ưu tiên rõ ràng.  
> Nguyên tắc bắt buộc: mọi thay đổi vẫn phải qua lint, build, test phù hợp và review. Tài liệu này không thay thế kiểm thử runtime.

---

## 1. Vai trò của tài liệu này

Tài liệu này là checklist refactor cấp công ty, không phải danh sách gợi ý chung chung. Mỗi mục trong tài liệu có thể được chuyển thành một issue, một PR nhỏ hoặc một hạng mục trong sprint planning. Khi team dùng tài liệu này đúng cách, mục tiêu là:

- developer biết nên sửa file nào, sửa theo thứ tự nào và không được sửa lan man;
- reviewer có tiêu chí cụ thể để duyệt hoặc từ chối PR;
- tech lead có thể chia việc theo P0/P1/P2/P3 thay vì xử lý cảm tính;
- PM/Founder hiểu rủi ro kỹ thuật nào đang chặn production readiness;
- nhân sự mới có thể follow checklist mà không phá route, auth, API, payment, admin workspace hoặc UI global.

Checklist này ưu tiên cách làm incremental. Không rewrite toàn bộ repo. Không refactor nhiều vùng nhạy cảm trong cùng một PR. Không đổi behavior ngầm nếu task chỉ là refactor.

---

## 2. Cách dùng checklist trong sprint

### 2.1. Quy trình 7 bước

```txt
1. Chọn nhóm checklist theo ưu tiên P0/P1/P2/P3.
2. Tạo issue theo mẫu task card.
3. Xác định owner, reviewer và phạm vi file.
4. Viết acceptance criteria trước khi code.
5. Refactor theo PR nhỏ, behavior-preserving nếu có thể.
6. Chạy lint/build/test/manual verification phù hợp.
7. Đính kèm evidence và cập nhật docs nếu thay đổi architecture/API/route/flow.
```

### 2.2. Quy tắc chia PR

Một PR tốt nên có phạm vi nhỏ và một mục tiêu rõ ràng.

| Loại thay đổi | Có nên gộp cùng PR không? | Quy tắc |
| --- | --- | --- |
| Refactor component + đổi UI lớn | Không nên | Tách PR refactor behavior-preserving và PR đổi UI |
| Tách service API + đổi contract backend | Không nên | Đổi contract cần docs/test riêng |
| Tách CSS global + sửa layout nhiều page | Không nên | Mỗi cụm màn hình một PR, có visual evidence |
| Thêm route + thêm page + thêm test | Có thể | Nếu route/page cùng một capability và PR không quá lớn |
| Sửa security/env | Nên riêng | Reviewer phải tập trung vào rủi ro deploy/security |
| Tách admin section | Nên mỗi section một PR | Users, doctors, AI configs, subscriptions tách riêng |

### 2.3. Definition of Ready cho task checklist

Một task chỉ nên bắt đầu khi có đủ:

| Điều kiện | Bắt buộc | Ghi chú |
| --- | --- | --- |
| Mục tiêu cụ thể | Có | Ví dụ: “Tách Admin Users section khỏi AdminWorkspacePage” |
| Phạm vi file dự kiến | Có | Ghi rõ file chính và file test liên quan |
| Không làm trong task này | Có | Giúp tránh scope creep |
| Rủi ro đã biết | Có | Đặc biệt auth, payment, route, API, y tế |
| Cách kiểm tra | Có | Lint/build/test/manual steps |
| Reviewer phù hợp | Có với P0/P1 | Auth/API/deploy cần reviewer senior |
| Rollback plan | Có với P0 | Env/security/payment/auth cần rollback rõ |

### 2.4. Definition of Done cho task checklist

Một task được xem là hoàn thành khi:

- code đúng scope và không đổi behavior ngoài ý muốn;
- không còn lỗi lint/build;
- test liên quan pass hoặc có manual evidence rõ ràng;
- không thêm secret, token, PII, medical data vào log hoặc bundle;
- không thêm mock/demo production không gắn nhãn;
- UI có loading/error/empty state nếu gọi API;
- docs được cập nhật nếu thay đổi route/API/auth/flow/architecture;
- reviewer có thể hiểu thay đổi từ PR description mà không phải hỏi lại nhiều.

---

## 3. Thang ưu tiên

| Mức | Ý nghĩa | Ví dụ trong repo frontend | Quy tắc xử lý |
| --- | --- | --- | --- |
| P0 | Rủi ro bảo mật, safety, deploy, production trust | Secret AI provider ở client, hard-code production API, mock y tế không nhãn | Làm trước, có thể chặn release |
| P1 | Rủi ro maintainability/chất lượng cao | Page lớn, CSS global lớn, route/access thiếu test | Làm trong sprint gần nhất |
| P2 | Cải thiện độ bền, test, performance | Unit test, code splitting, debounce, error boundary | Làm sau khi P0/P1 ổn định |
| P3 | Quy trình/team/docs nâng cao | ADR, CODEOWNERS, onboarding, release checklist | Làm định kỳ, không bỏ quên |

---

## 4. Ma trận ưu tiên tổng hợp

| Nhóm | Mục tiêu | Ưu tiên mặc định | Vì sao quan trọng |
| --- | --- | --- | --- |
| Security, secret, env | Không expose secret, không deploy sai backend | P0 | Ảnh hưởng trực tiếp tới bảo mật và production trust |
| Demo/mock/safety | Không để người dùng hiểu nhầm dữ liệu demo là thật | P0 | Domain y tế có rủi ro cao nếu copy/UX gây hiểu nhầm |
| API layer | Chuẩn hóa service, endpoint, error, contract | P1 | Giảm lỗi integration và duplicate API code |
| Route/auth/role/premium | Không bypass private/admin/premium route | P1 | Bảo vệ quyền truy cập và business logic |
| Page lớn/state phức tạp | Tách god component thành module dễ test | P1 | Giảm merge conflict và regression |
| CSS/design system | Giảm global CSS, chuẩn hóa UI primitive | P1 | Giảm visual regression và duplicate UI |
| Testing | Tăng coverage đúng vùng rủi ro | P2 | Refactor an toàn hơn |
| Performance | Lazy load, giảm render thừa, bundle tối ưu | P2 | Cải thiện UX và production readiness |
| Documentation/process | PR template, CODEOWNERS, ADR, onboarding | P3 | Giúp team scale và giảm lỗi lặp lại |

---

## 5. Checklist nhanh trước khi tạo PR

Developer phải tự trả lời trước khi mở PR:

```txt
[ ] Tôi biết task này thuộc nhóm P0/P1/P2/P3 nào.
[ ] Tôi đã ghi rõ mục tiêu và phạm vi file.
[ ] Tôi không đổi behavior ngoài phạm vi.
[ ] Tôi không gọi fetch trực tiếp trong page/component.
[ ] Tôi không thêm CSS feature vào global.css nếu không có lý do.
[ ] Tôi không thêm mock/demo production không có nhãn.
[ ] Tôi không thêm secret/token/key vào source, log, screenshot hoặc bundle.
[ ] Tôi đã xử lý loading/error/empty state nếu có API.
[ ] Tôi đã chạy lint/build/test phù hợp.
[ ] Tôi đã cập nhật docs nếu route/API/auth/flow/architecture thay đổi.
```

---

## 6. Checklist review bắt buộc cho mọi PR

| Câu hỏi review | Kết luận mong muốn | Nếu không đạt |
| --- | --- | --- |
| PR có một mục tiêu rõ không? | Có thể mô tả trong một câu | Yêu cầu chia nhỏ PR |
| Scope có quá rộng không? | Chỉ chạm vùng liên quan trực tiếp | Yêu cầu tách PR |
| Có thay đổi auth/API/route/env/payment không? | Có reviewer phù hợp | Chưa merge |
| Có gọi API đúng service layer không? | Page/component không gọi fetch trực tiếp | Refactor sang service |
| Có loading/error/empty state không? | Có pattern rõ | Bổ sung trước merge |
| Có test/evidence không? | Có command output hoặc manual steps | Chưa merge P0/P1 |
| Có ảnh hưởng CSS global không? | Có lý do và visual evidence | Yêu cầu tách CSS hoặc test visual |
| Có mock/demo không? | Có nhãn, owner, policy | Chưa merge nếu gây hiểu nhầm |
| Có expose secret/PII không? | Không | Chặn merge |
| Docs có cần cập nhật không? | Đã cập nhật hoặc ghi rõ không cần | Yêu cầu cập nhật docs |

---

## 7. Checklist release production

Trước mỗi release production, tối thiểu chạy:

```bash
npm run lint
npm run build
npm run test:e2e:routes
npm run test:e2e:a11y
npm run test:e2e:performance
```

Nếu có thay đổi UI/layout:

```bash
npm run test:e2e:visual
```

Nếu có thay đổi admin:

```bash
npm run test:e2e -- tests/e2e/admin-users.spec.js
npm run test:e2e -- tests/e2e/admin-doctors.spec.js
npm run test:e2e -- tests/e2e/admin-facilities.spec.js
npm run test:e2e -- tests/e2e/admin-ai-configs.spec.js
```

Nếu có thay đổi payment:

```bash
npm run test:e2e -- tests/e2e/payments.spec.js
npm run test:e2e -- tests/e2e/payment-results.spec.js
```

Nếu có thay đổi symptom/map:

```bash
npm run test:e2e -- tests/e2e/symptom-diagnosis.spec.js
npm run test:e2e -- tests/e2e/map-ux.spec.js
```

---

## 8. Điều kiện chặn merge

Không merge nếu có một trong các vấn đề sau:

- secret/API key/token thật xuất hiện trong frontend source, bundle, log hoặc screenshot;
- production API hard-code sai môi trường hoặc dùng IP/http không kiểm soát;
- private/admin/staff/premium route bị bypass;
- mock/demo y tế hiển thị như dữ liệu thật;
- lint/build fail;
- test liên quan fail mà không có quyết định chấp nhận rủi ro của tech lead;
- API contract đổi nhưng service/docs/test không cập nhật;
- thay đổi auth/payment không có test hoặc evidence rõ;
- thêm CSS global lớn không có lý do và visual check;
- PR quá lớn khiến reviewer không thể đánh giá an toàn.

---

## 9. Mẫu issue chuẩn cho checklist

```md
## Mục tiêu
Tách Admin Users section khỏi AdminWorkspacePage mà không đổi behavior.

## Lý do
AdminWorkspacePage đang quá lớn, khó review và dễ regression khi sửa users/doctors/subscriptions cùng lúc.

## Phạm vi
- src/pages/AdminWorkspacePage.jsx
- src/features/admin/users/*
- tests/e2e/admin-users.spec.js nếu cần

## Không làm trong task này
- Không đổi API contract
- Không đổi role/access
- Không đổi UI visual lớn
- Không refactor doctors/subscriptions trong cùng PR

## Cách thực hiện
1. Chụp lại behavior hiện tại bằng manual test hoặc E2E.
2. Tạo component AdminUsersSection.
3. Tạo hook useAdminUsers cho list/create/update/delete/loading/error.
4. Di chuyển table/form/modal liên quan users vào module mới.
5. Giữ props/API tương thích với AdminWorkspacePage.
6. Chạy lint/build/admin users test.
7. Đính kèm evidence.

## Acceptance criteria
- Users list/create/update/delete vẫn hoạt động.
- Loading/error/empty state không mất.
- Không thay đổi route/access.
- Không tăng CSS global.
- Lint/build pass.
- Test admin users pass hoặc có manual evidence rõ.

## Evidence
- Command output.
- Screenshot/video nếu UI ảnh hưởng.
- Ghi chú manual test.
```

---

## 10. Mẫu PR description chuẩn

```md
## Summary
- Tách Admin Users section ra khỏi AdminWorkspacePage.
- Không đổi behavior/API contract.

## Scope
- src/features/admin/users/*
- src/pages/AdminWorkspacePage.jsx

## Out of scope
- Doctors section
- Subscriptions section
- Route/access changes

## Test evidence
- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e -- tests/e2e/admin-users.spec.js
- [ ] Manual: list/create/update/delete users

## Risk
- Có thể regression modal/form users.
- Không ảnh hưởng route/admin access.

## Rollback
- Revert PR nếu admin users regression.
```

---

# 11. Task cards chi tiết theo nhóm

Mỗi task card dưới đây có thể copy trực tiếp thành issue. Với task lớn, chia nhỏ tiếp theo section, route hoặc file.

---

## P0-A. Bảo mật, secret và môi trường
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P0-A01 | Không để AI provider secret trong frontend | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A02 | Tách dev/staging/prod API URL | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A03 | Không commit token/password/real secret | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A04 | HTTPS cho production API | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A05 | Auth logout clear session nhất quán | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A06 | Không log PII/medical data | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A07 | CSP/security headers được xác định | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-A08 | 401/403 xử lý tập trung | P0 | Issue/PR có pass criteria và evidence rõ |


### P0-A01. Không để AI provider secret trong frontend

#### Mục tiêu

Đảm bảo frontend không chứa API key/provider secret và không gọi trực tiếp AI provider bằng secret từ browser.

#### Vấn đề thường gặp

Trong Vite, biến môi trường bắt đầu bằng `VITE_` sẽ được đưa vào client bundle. Nếu dùng `VITE_ANTHROPIC_KEY` hoặc key tương tự trong frontend, người dùng có thể xem được key qua DevTools hoặc bundle build.

#### Cách thực hiện

1. Grep toàn bộ source với các từ khóa `VITE_ANTHROPIC_KEY`, `ANTHROPIC`, `OPENAI`, `provider key`, `Authorization: Bearer`.
2. Xác định file nào đang gọi AI provider trực tiếp từ browser.
3. Thiết kế route backend AI gateway, ví dụ `/api/ai/chat` hoặc endpoint tương ứng backend đang có.
4. Frontend chỉ gửi prompt/context cần thiết tới backend service nội bộ, không gửi provider secret.
5. Xóa biến secret khỏi `.env.example`, `.env.production`, tài liệu setup frontend và Vercel frontend env nếu có.
6. Thêm kiểm tra build output không chứa key hoặc pattern provider secret.

#### Ví dụ trước khi sửa

```js
// Không an toàn trong frontend
const key = import.meta.env.VITE_ANTHROPIC_KEY;
fetch("https://api.anthropic.com/v1/messages", {
  headers: { Authorization: `Bearer ${key}` },
});
```

#### Ví dụ sau khi sửa

```js
// Frontend chỉ gọi backend nội bộ
export function sendChatMessage(payload) {
  return apiRequest(ENDPOINTS.WEB_CHATBOT.SEND, {
    method: "POST",
    body: payload,
    auth: true,
  });
}
```

#### File/thư mục liên quan

- `src/services/anthropicService.js`
- `src/pages/ChatbotPage.jsx`
- `src/services/chatbotService.js`
- `src/services/endpoints.js`
- `.env.*`
- `vite.config.js`
- `vercel.json`

#### Rủi ro

- Nếu đổi endpoint đột ngột có thể làm chat AI ngừng hoạt động.
- Nếu backend gateway chưa có, cần feature flag hoặc fallback an toàn.
- Nếu xóa env sai môi trường có thể làm dev local lỗi.

#### Cách kiểm tra

- Chạy grep không còn provider secret trong `src/`, `dist/`, `.env.example`.
- Build production và kiểm tra bundle không chứa key.
- Test chat AI happy path và API error path.
- Kiểm tra Network tab: browser chỉ gọi backend domain, không gọi thẳng AI provider.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A02. Tách dev/staging/prod API URL

#### Mục tiêu

Mỗi môi trường dùng API base URL riêng, không để source frontend quyết định cứng production backend bằng IP hoặc HTTP.

#### Vấn đề thường gặp

Hard-code IP backend trong `.env.*`, `vite.config.js` hoặc `vercel.json` khiến deploy dễ sai môi trường, khó audit và khó chuyển staging/production.

#### Cách thực hiện

1. Liệt kê mọi nơi dùng `VITE_API_BASE_URL`, `/api` proxy, rewrite backend.
2. Tạo quy ước env: local, development, staging, production.
3. Không commit URL production nhạy cảm nếu tổ chức muốn quản lý qua Vercel/CI secrets.
4. Cập nhật docs setup để developer biết cần tạo `.env.local`.
5. Nếu Vercel rewrite cần dùng env/runtime config phù hợp hoặc rewrite tới domain production được quản lý chính thức.
6. Thêm checklist release xác nhận API URL hiện tại.

#### Ví dụ trước khi sửa

```js
// vite.config.js
const target = process.env.VITE_API_BASE_URL || "http://52.77.xx.xx:8080";
```

#### Ví dụ sau khi sửa

```env
# .env.example
VITE_API_BASE_URL=https://api.example.com

# .env.local không commit
VITE_API_BASE_URL=http://localhost:8080
```

#### File/thư mục liên quan

- `.env.example`
- `.env.development`
- `.env.production`
- `vite.config.js`
- `vercel.json`
- `README.md`
- `docs/deploy/*`

#### Rủi ro

- Sai env có thể làm frontend gọi nhầm backend thật khi dev.
- Nếu bỏ fallback mà CI chưa cấu hình env, build có thể fail.
- Nếu rewrite production chưa sẵn sàng có thể gây downtime.

#### Cách kiểm tra

- Chạy build với từng env mẫu.
- Kiểm tra Network tab ở local/staging/prod.
- Grep không còn IP production hard-code trong source.
- Docs setup có hướng dẫn env rõ.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A03. Không commit token/password/real secret

#### Mục tiêu

Không để credential thật xuất hiện trong git history, source, docs, screenshot test hoặc log.

#### Vấn đề thường gặp

Developer có thể vô tình commit token test, mật khẩu demo, provider key hoặc ảnh chụp màn hình chứa thông tin nhạy cảm.

#### Cách thực hiện

1. Chạy secret scan hoặc grep thủ công với pattern key/token/password.
2. Kiểm tra `.env*`, docs, test fixtures, screenshots.
3. Thay secret thật bằng placeholder rõ: `<YOUR_API_KEY>`, `<BACKEND_URL>`.
4. Nếu đã lộ secret, rotate key ngay, không chỉ xóa khỏi commit mới.
5. Thêm pre-commit/CI secret scan nếu có thể.

#### Ví dụ trước khi sửa

```env
VITE_API_KEY=sk-live-real-secret
ADMIN_PASSWORD=RealPassword123
```

#### Ví dụ sau khi sửa

```env
VITE_PUBLIC_CLIENT_ID=<YOUR_PUBLIC_CLIENT_ID>
VITE_API_BASE_URL=<YOUR_BACKEND_URL>
```

#### File/thư mục liên quan

- `.env*`
- `README.md`
- `docs/**/*.md`
- `tests/**/*`
- `playwright-report/**`
- `test-results/**`

#### Rủi ro

- Xóa file chứa secret không đủ nếu secret đã vào git history.
- Test fixture dùng credential thật có thể bị lộ qua CI artifacts.

#### Cách kiểm tra

- Grep không còn pattern secret.
- CI secret scan pass.
- Nếu từng lộ key, xác nhận đã rotate.
- Không có screenshot/log chứa token/user data.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A04. HTTPS cho production API

#### Mục tiêu

Production frontend chỉ gọi backend qua HTTPS domain được quản lý, không gọi IP thô hoặc HTTP không mã hóa.

#### Vấn đề thường gặp

Gọi API production qua `http://` hoặc IP trực tiếp gây rủi ro bảo mật, lỗi mixed content, khó quản lý chứng chỉ và khó audit.

#### Cách thực hiện

1. Kiểm tra production env và Vercel rewrite.
2. Đảm bảo API production có domain HTTPS.
3. Không để fallback production trỏ HTTP/IP.
4. Cập nhật docs deploy.
5. Nếu backend chưa có HTTPS, chặn production release hoặc đánh dấu rủi ro P0.

#### Ví dụ trước khi sửa

```env
VITE_API_BASE_URL=http://52.77.xx.xx:8080
```

#### Ví dụ sau khi sửa

```env
VITE_API_BASE_URL=https://api.medimate.example
```

#### File/thư mục liên quan

- `.env.production`
- `vercel.json`
- `vite.config.js`
- `docs/deploy/*`

#### Rủi ro

- Đổi domain có thể lỗi CORS.
- Nếu chứng chỉ backend sai, production API fail.

#### Cách kiểm tra

- Production Network tab chỉ có HTTPS.
- Không có mixed content warning.
- CORS pass.
- Health check API production pass.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A05. Auth logout clear session nhất quán

#### Mục tiêu

Logout luôn xóa dữ liệu auth/session phía client kể cả khi API logout lỗi.

#### Vấn đề thường gặp

Nếu logout phụ thuộc API success, token có thể còn trong localStorage/sessionStorage khi backend timeout hoặc trả lỗi.

#### Cách thực hiện

1. Kiểm tra `logoutService` và mọi nơi gọi logout.
2. Đảm bảo clear auth nằm trong `finally`.
3. Liệt kê mọi key `medimate.*` trong localStorage/sessionStorage.
4. Clear session cache liên quan auth/profile/premium.
5. Test logout khi API logout 500/network fail.

#### Ví dụ trước khi sửa

```js
await authApi.logout();
clearStoredAuth();
navigate("/login");
```

#### Ví dụ sau khi sửa

```js
try {
  await authApi.logout();
} finally {
  clearStoredAuth();
  clearSessionCache();
  navigate("/login", { replace: true });
}
```

#### File/thư mục liên quan

- `src/services/logoutService.js`
- `src/services/apiClient.js`
- `src/services/api.js`
- `src/router/access.js`

#### Rủi ro

- Clear quá rộng có thể mất preference không liên quan.
- Redirect sai có thể gây loop sau logout.

#### Cách kiểm tra

- Mock API logout fail, token vẫn bị xóa.
- Refresh sau logout không vào được private route.
- localStorage/sessionStorage không còn auth token.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A06. Không log PII/medical data

#### Mục tiêu

Không ghi log token, hồ sơ bệnh nhân, triệu chứng, kết quả phân tích hoặc dữ liệu y tế nhạy cảm.

#### Vấn đề thường gặp

Console log trong quá trình debug có thể lọt vào production bundle hoặc error tracking, làm lộ dữ liệu người dùng.

#### Cách thực hiện

1. Grep `console.log`, `console.warn`, `console.error` trong `src/`.
2. Phân loại log: debug tạm, error kỹ thuật, dữ liệu người dùng.
3. Xóa log debug hoặc bọc bằng logger chỉ log metadata an toàn.
4. Không log request body chứa triệu chứng/hồ sơ.
5. Tạo quy ước redaction cho logger nếu có error tracking.

#### Ví dụ trước khi sửa

```js
console.log("symptom payload", payload);
console.log("auth", storedAuth);
```

#### Ví dụ sau khi sửa

```js
logger.warn("symptom_submit_failed", {
  status: error.status,
  requestId: error.requestId,
});
```

#### File/thư mục liên quan

- `src/**/*.js`
- `src/**/*.jsx`
- `src/services/apiClient.js`
- `src/pages/SymptomAnalysisPage.jsx`
- `src/pages/PersonalPatientProfilePage.jsx`

#### Rủi ro

- Xóa toàn bộ log có thể làm khó debug nếu chưa có logger thay thế.
- Logger sai vẫn có thể gửi PII lên monitoring.

#### Cách kiểm tra

- Grep không còn log dữ liệu nhạy cảm.
- Simulate lỗi API, log chỉ chứa status/requestId.
- Build production không chứa log debug không cần thiết.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A07. CSP/security headers được xác định

#### Mục tiêu

Có chính sách security headers tối thiểu cho production frontend.

#### Vấn đề thường gặp

SPA production thiếu CSP, frame protection, content type options hoặc referrer policy sẽ tăng rủi ro XSS/clickjacking và khó kiểm soát nguồn script/connect.

#### Cách thực hiện

1. Xác định deploy platform đang dùng headers ở đâu.
2. Thiết kế CSP cho script/connect/img/font/map provider.
3. Đưa AI/backend/map domains vào whitelist cần thiết.
4. Không dùng `unsafe-inline` nếu chưa có lý do và plan giảm dần.
5. Document cách cập nhật header khi thêm provider mới.

#### Ví dụ trước khi sửa

```json
// Không có headers hoặc headers trống
{}
```

#### Ví dụ sau khi sửa

```txt
Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.example.com; img-src 'self' data: https:;
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

#### File/thư mục liên quan

- `vercel.json`
- `docs/deploy/*`
- `docs/security/*`

#### Rủi ro

- CSP quá chặt có thể làm map/OAuth/font lỗi.
- CSP quá lỏng không có giá trị bảo vệ.

#### Cách kiểm tra

- Kiểm tra response headers production.
- Test login Google, map, API calls, assets.
- Browser console không báo CSP violation ngoài dự kiến.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-A08. 401/403 xử lý tập trung

#### Mục tiêu

Unauthorized/forbidden được xử lý thống nhất để user không bị silent fail, crash hoặc xem nội dung sai quyền.

#### Vấn đề thường gặp

Nếu mỗi page tự parse 401/403, behavior sẽ không nhất quán: nơi redirect login, nơi hiện lỗi chung, nơi crash.

#### Cách thực hiện

1. Kiểm tra `apiClient.js` response handling.
2. Chuẩn hóa error object gồm status, code, message, details, requestId nếu có.
3. Định nghĩa behavior 401: clear auth hoặc redirect login tùy policy.
4. Định nghĩa behavior 403: redirect workspace phù hợp hoặc hiện forbidden UI.
5. Không để page tự xử lý token hết hạn bằng logic rải rác.

#### Ví dụ trước khi sửa

```js
catch (e) {
  setError(e.message || "Có lỗi xảy ra");
}
```

#### Ví dụ sau khi sửa

```js
catch (error) {
  if (isUnauthorizedError(error)) return handleUnauthorized();
  setError(getUserSafeErrorMessage(error));
}
```

#### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/router/access.js`
- `src/services/logoutService.js`
- `src/pages/**/*.jsx`

#### Rủi ro

- Redirect trong apiClient nếu làm không cẩn thận có thể gây loop.
- Clear auth quá mạnh khi 401 từ endpoint public có thể gây logout nhầm.

#### Cách kiểm tra

- Mock API trả 401/403 ở route private/admin.
- Không có blank page.
- ReturnTo hoạt động đúng sau login.
- Forbidden admin/staff không bypass.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P0-B. Demo, mock và safety sản phẩm y tế
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P0-B01 | Lập inventory tất cả mock/demo/TODO production-sensitive | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B02 | `/records` gắn nhãn demo hoặc ẩn production | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B03 | `/medication` gắn nhãn demo hoặc ẩn production | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B04 | Landing demo có disclaimer rõ | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B05 | Hospital/facility fallback không giả là live backend | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B06 | Static pages không chứa cam kết vượt capability | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B07 | Emergency guidance có copy an toàn | P0 | Issue/PR có pass criteria và evidence rõ |
| P0-B08 | Mock không được dùng làm fallback sau lỗi production nếu gây hiểu nhầm | P0 | Issue/PR có pass criteria và evidence rõ |


### P0-B01. Lập inventory tất cả mock/demo/TODO production-sensitive

#### Mục tiêu

Team biết chính xác mock/demo nằm ở đâu, dùng cho mục đích gì, ai sở hữu và có được xuất hiện production hay không.

#### Vấn đề thường gặp

Mock y tế như hồ sơ, thuốc, gợi ý bệnh viện nếu không có nhãn có thể khiến người dùng hoặc nhân viên hiểu nhầm là dữ liệu thật.

#### Cách thực hiện

1. Grep source với `MOCK_`, `mock`, `demo`, `TODO`, `fake`, `sample`, `placeholder`.
2. Tạo bảng inventory gồm file, route, loại mock, owner, production policy.
3. Phân loại: demo có chủ đích, fallback kỹ thuật, placeholder cần xóa, fixture test.
4. Với mock production-sensitive, thêm nhãn UI hoặc ẩn route.
5. Thêm scanner/checklist để mock mới phải khai báo.

#### Ví dụ trước khi sửa

```js
const MOCK_RECORDS = [...];
// Không có owner, không có nhãn production
```

#### Ví dụ sau khi sửa

```md
| File | Route | Loại mock | Owner | Production policy |
| --- | --- | --- | --- | --- |
| MedicalRecordPage.jsx | /records | Hồ sơ demo | FE Lead | Ẩn hoặc gắn demo banner |
```

#### File/thư mục liên quan

- `src/**/*.js`
- `src/**/*.jsx`
- `docs/product-definition/*`
- `docs/quality/*`

#### Rủi ro

- Xóa mock đột ngột có thể làm demo/sales flow hỏng.
- Gắn nhãn không đủ rõ vẫn gây hiểu nhầm.

#### Cách kiểm tra

- Có file inventory trong docs.
- Mỗi mock production-sensitive có owner/policy.
- Route demo hiển thị banner hoặc bị ẩn theo env.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B02. `/records` gắn nhãn demo hoặc ẩn production

#### Mục tiêu

Người dùng không hiểu nhầm hồ sơ demo là hồ sơ y tế thật.

#### Vấn đề thường gặp

Hồ sơ y tế là dữ liệu nhạy cảm. Nếu route `/records` dùng mock nhưng hiển thị như dữ liệu thật, sản phẩm mất độ tin cậy và có rủi ro pháp lý.

#### Cách thực hiện

1. Kiểm tra route `/records`, navigation và page records.
2. Xác định backend thật đã có hay chưa.
3. Nếu chưa production-ready, thêm demo banner rõ ở đầu page và trong empty/success state.
4. Cân nhắc ẩn route khỏi navigation production nếu capability chưa sẵn sàng.
5. Thêm test route/nav kiểm tra banner hoặc ẩn route.

#### Ví dụ trước khi sửa

```jsx
<MedicalRecordList records={MOCK_RECORDS} />
```

#### Ví dụ sau khi sửa

```jsx
<DemoCapabilityBanner
  title="Dữ liệu minh họa"
  message="Các hồ sơ bên dưới là dữ liệu demo, không phải hồ sơ y tế thật của bạn."
/>
<MedicalRecordList records={demoRecords} />
```

#### File/thư mục liên quan

- `src/pages/MedicalRecordPage.jsx`
- `src/router/routes.js`
- `src/components/workspace/*`
- `tests/e2e/routes.spec.js`

#### Rủi ro

- Ẩn route có thể làm premium navigation thay đổi.
- Banner quá nhỏ hoặc copy mơ hồ không đủ an toàn.

#### Cách kiểm tra

- Vào `/records` production thấy nhãn demo rõ hoặc bị chặn/ẩn.
- Non-premium vẫn qua premium gate nếu route còn tồn tại.
- Test route/nav pass.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B03. `/medication` gắn nhãn demo hoặc ẩn production

#### Mục tiêu

Không để người dùng tin rằng app đã phân tích tương tác thuốc thật nếu backend/clinical validation chưa sẵn sàng.

#### Vấn đề thường gặp

Tương tác thuốc là vùng rủi ro cao. Mock interaction hoặc scan result nếu trình bày như kết quả thật có thể gây quyết định sai.

#### Cách thực hiện

1. Kiểm tra `MedicationScanPage` và route `/medication`.
2. Xác định mọi mock result/interaction.
3. Thêm banner demo và disclaimer rõ: không thay thế tư vấn bác sĩ/dược sĩ.
4. Không dùng mock làm fallback sau lỗi API trừ khi label rõ.
5. Thêm severe warning cho tương tác thuốc nếu có copy demo.

#### Ví dụ trước khi sửa

```jsx
<ResultPanel interaction={mockInteraction} />
```

#### Ví dụ sau khi sửa

```jsx
<DemoCapabilityBanner message="Kết quả bên dưới chỉ là minh họa, không phải phân tích thuốc thật." />
<ResultPanel interaction={mockInteraction} aria-label="Kết quả minh họa" />
```

#### File/thư mục liên quan

- `src/pages/MedicationScanPage.jsx`
- `src/router/routes.js`
- `tests/e2e/routes.spec.js`
- `docs/product-definition/*`

#### Rủi ro

- Copy disclaimer yếu vẫn gây hiểu nhầm.
- Ẩn route có thể ảnh hưởng pricing/premium copy.

#### Cách kiểm tra

- Route `/medication` không hiển thị mock như dữ liệu thật.
- Error API không trả mock im lặng.
- Có test hoặc screenshot evidence.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B04. Landing demo có disclaimer rõ

#### Mục tiêu

Landing page demo phải mô tả đúng khả năng sản phẩm: hỗ trợ định hướng, không chẩn đoán chắc chắn.

#### Vấn đề thường gặp

Copy marketing có thể vô tình dùng từ khẳng định bệnh, chữa trị hoặc thay thế bác sĩ.

#### Cách thực hiện

1. Review toàn bộ landing sections, symptom demo, chatbot preview.
2. Tìm các từ/câu như “chẩn đoán chính xác”, “kết luận bệnh”, “điều trị”.
3. Thay bằng copy an toàn: “gợi ý”, “tham khảo”, “định hướng”, “khuyến nghị đi khám”.
4. Thêm disclaimer gần CTA demo, không chỉ ở footer.
5. Đảm bảo mobile vẫn nhìn thấy disclaimer.

#### Ví dụ trước khi sửa

```txt
AI chẩn đoán bệnh của bạn trong vài giây.
```

#### Ví dụ sau khi sửa

```txt
AI hỗ trợ định hướng thông tin ban đầu và gợi ý bước tiếp theo. Kết quả không thay thế tư vấn y tế chuyên môn.
```

#### File/thư mục liên quan

- `src/components/landing/*`
- `src/pages/LandingPage.jsx`
- `src/pages/StaticPage.jsx`

#### Rủi ro

- Copy quá dài làm giảm conversion; cần cân bằng nhưng không hy sinh safety.
- Disclaimer chỉ ở footer có thể không đủ.

#### Cách kiểm tra

- Review copy desktop/mobile.
- Không có wording chẩn đoán khẳng định.
- CTA demo có safety context.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B05. Hospital/facility fallback không giả là live backend

#### Mục tiêu

Nếu app dùng fallback facility/hospital recommendations, UI phải nói rõ đó là dữ liệu fallback/demo hoặc dữ liệu giới hạn.

#### Vấn đề thường gặp

Khi API facility lỗi mà UI trả danh sách giả, người dùng có thể tin đó là cơ sở y tế thật gần họ.

#### Cách thực hiện

1. Kiểm tra `hospitalRecommendations.js` và flow dashboard/map.
2. Phân biệt fallback để demo UI với fallback cache thật.
3. Nếu fallback không phải live data, thêm banner/copy rõ.
4. Khi API lỗi, ưu tiên error state hơn mock nếu mock gây hiểu nhầm.
5. Không dùng từ “gần bạn” nếu không có location/live data.

#### Ví dụ trước khi sửa

```js
catch {
  setHospitals(mockHospitals);
}
```

#### Ví dụ sau khi sửa

```js
catch (error) {
  setError("Không tải được danh sách cơ sở y tế. Vui lòng thử lại.");
  setHospitals([]);
}
```

#### File/thư mục liên quan

- `src/utils/hospitalRecommendations.js`
- `src/pages/DashboardPage.jsx`
- `src/pages/NearbyClinicPage.jsx`
- `src/services/facilityService.js`

#### Rủi ro

- Bỏ fallback có thể làm demo nghèo dữ liệu.
- Fallback thật cần cache metadata rõ.

#### Cách kiểm tra

- Simulate API fail: không hiển thị mock như live data.
- UI có error/fallback message rõ.
- Không có copy “gần bạn” khi không có location.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B06. Static pages không chứa cam kết vượt capability

#### Mục tiêu

Các page tĩnh như roadmap, demo, API, status, legal không hứa tính năng vượt quá trạng thái sản phẩm thật.

#### Vấn đề thường gặp

Static content thường ít được review, dễ chứa cam kết marketing hoặc technical promise chưa có backend/test.

#### Cách thực hiện

1. Review `StaticPage.jsx` và content routes.
2. Tách content ra data file để dễ review nếu chưa tách.
3. Phân loại nội dung: đã có, beta, demo, roadmap, planned.
4. Thêm owner cho legal/privacy/terms.
5. Không nói “đã hỗ trợ” nếu chỉ có mock/demo.

#### Ví dụ trước khi sửa

```txt
MediMate lưu trữ toàn bộ hồ sơ y tế của bạn an toàn.
```

#### Ví dụ sau khi sửa

```txt
Tính năng hồ sơ y tế đang trong giai đoạn thử nghiệm. Nội dung demo không đại diện cho dữ liệu thật.
```

#### File/thư mục liên quan

- `src/pages/StaticPage.jsx`
- `docs/product-definition/*`
- `docs/ui-ux/*`

#### Rủi ro

- Sửa copy có thể ảnh hưởng marketing/legal.
- Nếu không có owner, docs lại stale.

#### Cách kiểm tra

- Content phản ánh đúng capability matrix.
- Page legal/privacy được reviewer phù hợp duyệt.
- Không còn claim quá mức.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B07. Emergency guidance có copy an toàn

#### Mục tiêu

Triệu chứng nghiêm trọng phải có hướng dẫn an toàn, khuyến nghị liên hệ cấp cứu hoặc đến cơ sở y tế khi phù hợp.

#### Vấn đề thường gặp

AI/UI không được tự trấn an người dùng trong tình huống nguy hiểm như đau ngực dữ dội, khó thở, yếu liệt, mất ý thức, xuất huyết nặng.

#### Cách thực hiện

1. Xác định nơi hiển thị kết quả symptom/chat.
2. Tạo danh sách trigger emergency ở mức copy/UI nếu backend chưa xử lý.
3. Thêm banner safety với ngôn ngữ rõ ràng.
4. Không đưa chẩn đoán chắc chắn; ưu tiên hành động an toàn.
5. Test các input nghiêm trọng.

#### Ví dụ trước khi sửa

```txt
Triệu chứng của bạn có thể không nghiêm trọng, hãy nghỉ ngơi.
```

#### Ví dụ sau khi sửa

```txt
Nếu bạn đang đau ngực dữ dội, khó thở, yếu liệt, ngất hoặc chảy máu nặng, hãy gọi cấp cứu hoặc đến cơ sở y tế gần nhất ngay.
```

#### File/thư mục liên quan

- `src/pages/SymptomAnalysisPage.jsx`
- `src/pages/ChatbotPage.jsx`
- `src/components/landingChat/*`
- `src/services/symptomAnalysisService.js`

#### Rủi ro

- Trigger quá rộng có thể gây lo lắng; trigger quá hẹp có thể bỏ sót nguy hiểm.
- Cần thống nhất với product/medical advisor nếu có.

#### Cách kiểm tra

- Test severe symptom examples.
- Banner emergency hiển thị nổi bật.
- Không có copy tự trấn an nguy hiểm.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P0-B08. Mock không được dùng làm fallback sau lỗi production nếu gây hiểu nhầm

#### Mục tiêu

Khi API production lỗi, app không trả dữ liệu giả như thể request thành công.

#### Vấn đề thường gặp

Fallback mock sau lỗi API làm người dùng tin rằng dữ liệu thật đã tải thành công, đặc biệt nguy hiểm với y tế/payment/admin.

#### Cách thực hiện

1. Tìm mọi `catch` đang set mock/sample data.
2. Phân loại fallback có an toàn hay không.
3. Thay fallback nguy hiểm bằng error state rõ.
4. Nếu cần demo mode, bật bằng feature flag riêng.
5. Thêm test API fail cho symptom/map/records/medication/payment nếu liên quan.

#### Ví dụ trước khi sửa

```js
catch {
  setRecords(MOCK_RECORDS);
}
```

#### Ví dụ sau khi sửa

```js
catch (error) {
  setRecords([]);
  setError("Không tải được dữ liệu thật. Vui lòng thử lại sau.");
}
```

#### File/thư mục liên quan

- `src/pages/**/*.jsx`
- `src/utils/**/*.js`
- `src/services/**/*.js`

#### Rủi ro

- Một số demo page có thể cần mock; phải tách demo mode khỏi production mode.
- Không có empty/error state sẵn sẽ cần thêm UI.

#### Cách kiểm tra

- Simulate API fail không xuất hiện data giả.
- Demo mode nếu có phải có label rõ.
- Test/manual evidence cho route liên quan.

#### Độ ưu tiên

**P0**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P1-C. API layer và backend contract
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P1-C01 | Không có `fetch` trực tiếp trong page/component | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C02 | Endpoint mới luôn thêm vào `endpoints.js` | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C03 | Domain service có naming rõ | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C04 | Error format normalize thống nhất | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C05 | Pagination dùng helper hoặc chuẩn chung | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C06 | DTO normalize ở service/model, không trong render | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C07 | Backward compatibility facade mỏng | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-C08 | Contract change có docs/test | P1 | Issue/PR có pass criteria và evidence rõ |


### P1-C01. Không có `fetch` trực tiếp trong page/component

#### Mục tiêu

Tất cả API call đi qua domain service và `apiRequest`, giúp auth/error/loading/timeout được chuẩn hóa.

#### Vấn đề thường gặp

Fetch trực tiếp trong component làm duplicate headers, duplicate error parsing và khó đổi backend contract.

#### Cách thực hiện

1. Grep `fetch(`, `axios`, `/api/` trong `src/pages` và `src/components`.
2. Với mỗi call, tạo endpoint trong `endpoints.js` nếu chưa có.
3. Tạo hoặc bổ sung domain service tương ứng.
4. Component/page chỉ gọi service hoặc custom hook.
5. Thêm lint rule hoặc review rule chặn fetch trực tiếp.

#### Ví dụ trước khi sửa

```jsx
useEffect(() => {
  fetch("/api/users").then(r => r.json()).then(setUsers);
}, []);
```

#### Ví dụ sau khi sửa

```jsx
useEffect(() => {
  usersApi.list().then(setUsers).catch(setError);
}, []);
```

#### File/thư mục liên quan

- `src/pages/**/*.jsx`
- `src/components/**/*.jsx`
- `src/services/endpoints.js`
- `src/services/*Service.js`

#### Rủi ro

- Di chuyển API call có thể đổi error behavior.
- Service mới nếu đặt tên không nhất quán sẽ tạo thêm nợ kỹ thuật.

#### Cách kiểm tra

- Grep page/component không còn fetch API backend.
- Service tests hoặc manual API flow pass.
- Auth header vẫn được gửi đúng.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C02. Endpoint mới luôn thêm vào `endpoints.js`

#### Mục tiêu

URL backend được quản lý tập trung, dễ đổi version/path và dễ review contract.

#### Vấn đề thường gặp

Hard-code URL trong service/page khiến rename endpoint rất khó và dễ sai path.

#### Cách thực hiện

1. Khi thêm API mới, thêm group hoặc method vào `ENDPOINTS`.
2. Không nối string endpoint ở UI.
3. Với path dynamic, dùng function trong endpoint group.
4. Review naming group theo domain backend.
5. Cập nhật docs API nếu endpoint mới quan trọng.

#### Ví dụ trước khi sửa

```js
apiRequest(`/api/users/${id}/approve`, { method: "POST", auth: true });
```

#### Ví dụ sau khi sửa

```js
ENDPOINTS.USERS.APPROVE = (id) => `/api/users/${id}/approve`;
apiRequest(ENDPOINTS.USERS.APPROVE(id), { method: "POST", auth: true });
```

#### File/thư mục liên quan

- `src/services/endpoints.js`
- `src/services/*Service.js`
- `docs/backend/*`

#### Rủi ro

- Endpoint function sai encode id có thể lỗi với special chars.
- Đặt endpoint vào sai group làm khó tìm.

#### Cách kiểm tra

- Review diff không có hard-code `/api/...` ngoài endpoints.
- API call mới hoạt động.
- Docs contract cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C03. Domain service có naming rõ

#### Mục tiêu

Mỗi service đại diện cho một domain rõ ràng: users, doctors, facilities, subscriptions, symptom analysis, auth.

#### Vấn đề thường gặp

Service trộn nhiều domain khiến import khó hiểu và dễ tạo dependency sai.

#### Cách thực hiện

1. Audit `src/services`.
2. Đặt tên object export nhất quán: `usersApi`, `doctorsApi`, `facilityApi`.
3. Không thêm function unrelated vào service tiện tay.
4. Nếu service quá lớn, chia theo subdomain nhưng giữ public API rõ.
5. Compatibility re-export chỉ nên mỏng.

#### Ví dụ trước khi sửa

```js
export const appApi = { getUsers, createDoctor, checkout, submitSymptom };
```

#### Ví dụ sau khi sửa

```js
export const usersApi = { list, update, deactivate };
export const doctorsApi = { list, approve, update };
```

#### File/thư mục liên quan

- `src/services/*.js`

#### Rủi ro

- Rename service có thể phá nhiều import.
- Tách sai domain tạo vòng import.

#### Cách kiểm tra

- Import ở page/feature đọc dễ hiểu.
- Không có service tổng hợp quá nhiều domain.
- Lint/build pass sau rename.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C04. Error format normalize thống nhất

#### Mục tiêu

UI nhận error object chuẩn để hiển thị message an toàn, xử lý validation và status code nhất quán.

#### Vấn đề thường gặp

Mỗi page parse lỗi khác nhau làm message không đồng nhất, có thể lộ technical details hoặc mất validation details.

#### Cách thực hiện

1. Định nghĩa `ApiError` shape: status, code, message, details, fieldErrors, requestId.
2. Normalize response lỗi trong `apiClient.js`.
3. Tạo helper `getUserSafeErrorMessage`.
4. Form dùng `fieldErrors` nếu có.
5. Không hiển thị stack trace/raw JSON cho user.

#### Ví dụ trước khi sửa

```js
setError(error?.response?.data?.message || error.message || "Error");
```

#### Ví dụ sau khi sửa

```js
setError(getUserSafeErrorMessage(error));
setFieldErrors(error.fieldErrors ?? {});
```

#### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/utils/errors.js`
- `src/pages/**/*.jsx`
- `src/components/ui/Field.jsx`

#### Rủi ro

- Đổi error shape có thể phá page cũ.
- Ẩn quá nhiều chi tiết có thể khó debug nếu không log requestId.

#### Cách kiểm tra

- Mock 400 validation, 401, 403, 500, network timeout.
- UI message đúng và không lộ stack/raw payload.
- Field errors render đúng.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C05. Pagination dùng helper hoặc chuẩn chung

#### Mục tiêu

Tất cả list API dùng query params pagination thống nhất để tránh sai `PageNumber`, `PageSize`, `page`, `limit` giữa các service.

#### Vấn đề thường gặp

Pagination hard-code rải rác dễ gây mismatch backend, lỗi page size hoặc duplicate query builder.

#### Cách thực hiện

1. Audit các service có list/search.
2. Dùng helper `withPagination` hoặc tạo `buildPaginationQuery`.
3. Chuẩn hóa default pageNumber/pageSize.
4. Không build query bằng string nối tay trong component.
5. Test list API với page 1, page 2, search/filter.

#### Ví dụ trước khi sửa

```js
apiRequest(`/api/doctors?PageNumber=${page}&PageSize=${size}`);
```

#### Ví dụ sau khi sửa

```js
apiRequest(`${ENDPOINTS.DOCTORS.BASE}?${withPagination(page, size)}`);
```

#### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/services/*Service.js`

#### Rủi ro

- Backend mỗi endpoint có convention khác; cần map rõ thay vì ép sai.
- Default page size đổi có thể ảnh hưởng UI.

#### Cách kiểm tra

- Network query đúng.
- Pagination UI vẫn hoạt động.
- Không còn duplicate pagination builder.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C06. DTO normalize ở service/model, không trong render

#### Mục tiêu

JSX chỉ render data đã được chuẩn hóa, không chứa logic mapping/normalization phức tạp.

#### Vấn đề thường gặp

Normalize trong render làm component dài, khó test và dễ lỗi khi backend đổi field.

#### Cách thực hiện

1. Tìm các đoạn JSX có nhiều `?.`, fallback field, map backend shape.
2. Tạo `normalizeXDto` trong service/model.
3. Service trả về shape ổn định cho UI.
4. Unit test normalize với fixture backend.
5. Component chỉ render props đơn giản.

#### Ví dụ trước khi sửa

```jsx
<td>{user.fullName || user.name || `${user.firstName} ${user.lastName}`}</td>
```

#### Ví dụ sau khi sửa

```js
export function normalizeUserDto(dto) {
  return { id: dto.id, displayName: dto.fullName ?? dto.name ?? `${dto.firstName ?? ""} ${dto.lastName ?? ""}`.trim() };
}
```

#### File/thư mục liên quan

- `src/services/*Service.js`
- `src/features/*/model/*`
- `src/pages/**/*.jsx`

#### Rủi ro

- Normalize sai có thể mất field.
- Nếu UI còn phụ thuộc raw DTO, cần migrate từ từ.

#### Cách kiểm tra

- Unit test normalize.
- UI vẫn hiển thị dữ liệu cũ.
- JSX giảm logic fallback phức tạp.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C07. Backward compatibility facade mỏng

#### Mục tiêu

Các file re-export cũ chỉ giữ tương thích import, không chứa logic mới.

#### Vấn đề thường gặp

Compatibility file nếu chứa logic mới sẽ làm team không biết logic thật nằm ở service mới hay file cũ.

#### Cách thực hiện

1. Audit `api.js` và các re-export compatibility.
2. Di chuyển logic thật về domain service.
3. Compatibility file chỉ `export { ... } from ...`.
4. Đánh dấu deprecated nếu cần.
5. Tạo task migrate import cũ dần dần.

#### Ví dụ trước khi sửa

```js
// api.js vừa re-export vừa xử lý login/token/error
```

#### Ví dụ sau khi sửa

```js
export { authApi } from "./authService";
export { usersApi } from "./userService";
```

#### File/thư mục liên quan

- `src/services/api.js`
- `src/services/index.js`
- `src/services/*Service.js`

#### Rủi ro

- Xóa facade quá sớm làm vỡ import.
- Logic duplicate có thể gây behavior khác nhau.

#### Cách kiểm tra

- Facade không có business logic mới.
- Build pass.
- Import cũ vẫn hoạt động trong giai đoạn migration.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-C08. Contract change có docs/test

#### Mục tiêu

Mọi thay đổi API contract có tài liệu và test bảo vệ để frontend/backend không lệch nhau.

#### Vấn đề thường gặp

Backend đổi field/status mà frontend không cập nhật sẽ tạo lỗi runtime khó phát hiện nếu chỉ test happy path.

#### Cách thực hiện

1. Khi đổi endpoint/field/status, cập nhật docs backend contract.
2. Cập nhật endpoint/service/normalize tương ứng.
3. Thêm fixture cho response mới/cũ nếu cần backward compatibility.
4. Chạy E2E/integration flow liên quan.
5. PR description ghi rõ contract changed.

#### Ví dụ trước khi sửa

```txt
Backend đổi `fullName` thành `name`, frontend không biết.
```

#### Ví dụ sau khi sửa

```md
Contract change:
- users[].name replaces users[].fullName
- normalizeUserDto supports both during migration
```

#### File/thư mục liên quan

- `docs/backend/*`
- `src/services/*Service.js`
- `src/features/*/model/*`
- `tests/**/*`

#### Rủi ro

- Docs cập nhật nhưng code không cập nhật hoặc ngược lại.
- Backward compatibility giữ quá lâu làm model rối.

#### Cách kiểm tra

- Contract docs updated.
- Tests pass với fixture mới.
- UI không lỗi khi backend trả response mới.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P1-D. Route, auth, role và premium gate
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P1-D01 | Route mới khai báo trong `routes.js` | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D02 | Role admin/staff test đầy đủ | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D03 | Premium route redirect pricing đúng | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D04 | Auth route redirect login đúng | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D05 | Alias không bypass access | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D06 | Unknown route có fallback tốt | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D07 | Navigation model không trùng order/path | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-D08 | Document title đúng | P1 | Issue/PR có pass criteria và evidence rõ |


### P1-D01. Route mới khai báo trong `routes.js`

#### Mục tiêu

Mọi route mới phải có metadata tập trung gồm id, path, title, access, roles/navigation nếu cần.

#### Vấn đề thường gặp

Route hard-code ngoài metadata khiến access/title/navigation thiếu nhất quán.

#### Cách thực hiện

1. Thêm route vào `src/router/routes.js`
2. thêm case render trong `App.jsx`
3. cập nhật navigation nếu route xuất hiện menu
4. thêm test route manifest
5. cập nhật docs capability nếu route mới quan trọng.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/routes.js`
- `src/App.jsx`
- `tests/e2e/routes.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D02. Role admin/staff test đầy đủ

#### Mục tiêu

Đảm bảo admin/staff/patient không truy cập workspace sai quyền.

#### Vấn đề thường gặp

Thiếu test role dễ dẫn tới staff vào admin hoặc patient thấy màn hình nội bộ.

#### Cách thực hiện

1. Tạo fixture auth role
2. test `/app/admin`, `/app/staff`, alias `/admin`
3. kiểm tra redirect về workspace phù hợp
4. test unauthorized/forbidden copy.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/access.js`
- `src/utils/roles.js`
- `tests/e2e/admin-*.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D03. Premium route redirect pricing đúng

#### Mục tiêu

Non-premium user phải bị redirect tới pricing với returnTo đúng khi vào premium routes.

#### Vấn đề thường gặp

Premium gate sai gây thất thoát doanh thu hoặc user bị loop.

#### Cách thực hiện

1. Test `/chat`, `/records`, `/medication`
2. kiểm tra `hasPremiumAccess`
3. giữ returnTo
4. sau upgrade premium quay lại route gốc.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/access.js`
- `src/services/apiClient.js`
- `src/pages/PricingPage.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D04. Auth route redirect login đúng

#### Mục tiêu

Private route chưa login phải redirect login và giữ destination.

#### Vấn đề thường gặp

Mất returnTo làm UX kém; redirect loop làm app không dùng được.

#### Cách thực hiện

1. Test route auth khi chưa login
2. kiểm tra query returnTo
3. login xong chuyển về đúng route
4. không redirect public route.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/access.js`
- `src/router/returnIntent.js`
- `src/pages/AuthPages.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D05. Alias không bypass access

#### Mục tiêu

Alias như `/admin` hoặc `/account` phải đi qua access check giống canonical route.

#### Vấn đề thường gặp

Alias nếu resolve sai có thể bypass private/admin gate.

#### Cách thực hiện

1. Test từng alias
2. canonicalize path sau access hoặc đảm bảo access không bị bỏ qua
3. thêm route tests.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/routes.js`
- `src/router/access.js`
- `tests/e2e/routes.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D06. Unknown route có fallback tốt

#### Mục tiêu

Route không tồn tại phải hiển thị 404/recovery, không blank page.

#### Vấn đề thường gặp

Blank page làm user tưởng app lỗi; route sai có thể rơi về landing nhầm.

#### Cách thực hiện

1. Kiểm tra resolveRoute null
2. tạo NotFoundPage nếu chưa có
3. thêm CTA về dashboard/home
4. test path lạ.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/App.jsx`
- `src/pages/NotFoundPage.jsx`
- `tests/e2e/routes.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D07. Navigation model không trùng order/path

#### Mục tiêu

Menu theo shell/role phải ổn định, không trùng item và không hiện route sai quyền.

#### Vấn đề thường gặp

Navigation trùng làm user nhầm; item premium/admin hiện sai gây lỗi access.

#### Cách thực hiện

1. Audit `getNavigationModel`
2. sort by order
3. filter theo access/role
4. test desktop/mobile navigation.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/routes.js`
- `src/router/navigation.js`
- `src/components/workspace/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-D08. Document title đúng

#### Mục tiêu

Mỗi route có title đúng để tăng UX, accessibility và professionalism.

#### Vấn đề thường gặp

Title stale khiến tab browser khó nhận diện và test route thiếu chặt.

#### Cách thực hiện

1. Đảm bảo route metadata có title
2. App set title khi route đổi
3. test key routes.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/router/routes.js`
- `src/App.jsx`
- `tests/e2e/routes.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P1-E. Tách page lớn và state phức tạp
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P1-E01 | Tách Admin overview section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E02 | Tách Admin users section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E03 | Tách Admin doctors section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E04 | Tách Admin AI configs section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E05 | Tách Admin subscriptions section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E06 | Tách departments/facilities section | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E07 | Tách Dashboard symptom intake hook | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E08 | Tách NearbyClinic map/list/review | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E09 | Tách Auth forms | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-E10 | Tách StaticPage content data | P1 | Issue/PR có pass criteria và evidence rõ |


### P1-E01. Tách Admin overview section

#### Mục tiêu

Admin overview thành section riêng, AdminWorkspacePage chỉ điều phối layout.

#### Vấn đề thường gặp

Overview nằm chung page lớn làm khó sửa thống kê/card mà không đụng CRUD khác.

#### Cách thực hiện

1. Tạo `features/admin/overview/AdminOverviewSection.jsx`
2. truyền dữ liệu cần thiết qua props/hook
3. giữ route `/app/admin`
4. test overview render.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/AdminWorkspacePage.jsx`
- `src/features/admin/overview/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E02. Tách Admin users section

#### Mục tiêu

Users CRUD có hook/table/form riêng để dễ test và review.

#### Vấn đề thường gặp

CRUD user trong page lớn dễ regression modal/state/loading.

#### Cách thực hiện

1. Tạo `useAdminUsers`
2. tách table/filter/form dialog
3. service gọi `usersApi`
4. giữ behavior.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/AdminWorkspacePage.jsx`
- `src/features/admin/users/*`
- `tests/e2e/admin-users.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E03. Tách Admin doctors section

#### Mục tiêu

Doctors section độc lập với users/subscriptions/facilities.

#### Vấn đề thường gặp

Doctor approval/profile/modal nếu lẫn với admin page làm khó test edge cases.

#### Cách thực hiện

1. Tạo module `features/admin/doctors`
2. tách hook list/approve/update
3. giữ E2E admin doctors.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/features/admin/doctors/*`
- `src/services/doctorService.js`
- `tests/e2e/admin-doctors.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E04. Tách Admin AI configs section

#### Mục tiêu

AI configs có module riêng để kiểm soát prompt/config/risk.

#### Vấn đề thường gặp

AI config nằm trong page lớn dễ sửa nhầm prompt/provider settings.

#### Cách thực hiện

1. Tạo `features/admin/ai-configs`
2. tách form validation
3. không log prompt nhạy cảm
4. test CRUD.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/features/admin/ai-configs/*`
- `src/services/aiConfigService.js`
- `tests/e2e/admin-ai-configs.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E05. Tách Admin subscriptions section

#### Mục tiêu

Plan/subscription admin tách khỏi pricing public và admin page lớn.

#### Vấn đề thường gặp

Subscription ảnh hưởng payment/business, không nên lẫn với domain khác.

#### Cách thực hiện

1. Tạo `features/admin/subscriptions`
2. tách plan table/form
3. đảm bảo không đổi pricing route.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/features/admin/subscriptions/*`
- `src/services/subscriptionService.js`
- `tests/e2e/payments.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E06. Tách departments/facilities section

#### Mục tiêu

Departments/facilities có form validation và location handling riêng.

#### Vấn đề thường gặp

Facility/departments rải trong page gây lỗi map, lat/lng, relation department.

#### Cách thực hiện

1. Tạo module `features/admin/departments` và `features/admin/facilities`
2. tách validators
3. test admin facilities.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/features/admin/departments/*`
- `src/features/admin/facilities/*`
- `tests/e2e/admin-facilities.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E07. Tách Dashboard symptom intake hook

#### Mục tiêu

Dashboard page chỉ render, hook xử lý intake/loading/error/result.

#### Vấn đề thường gặp

Logic symptom/facility fallback trong render làm khó test và dễ duplicate với symptom page.

#### Cách thực hiện

1. Tạo `useSymptomIntake`
2. tách normalize result
3. giữ dashboard UI
4. thêm unit/manual test.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/DashboardPage.jsx`
- `src/features/dashboard/*`
- `src/services/symptomAnalysisService.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E08. Tách NearbyClinic map/list/review

#### Mục tiêu

Map, facility list và review form tách thành component/hook độc lập.

#### Vấn đề thường gặp

NearbyClinicPage chứa quá nhiều state: geolocation, map markers, filters, reviews, loading.

#### Cách thực hiện

1. Tạo `ClinicMap`, `ClinicList`, `ClinicReviewPanel`, `useNearbyClinics`
2. lazy load map.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/NearbyClinicPage.jsx`
- `src/features/map/*`
- `tests/e2e/map-ux.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E09. Tách Auth forms

#### Mục tiêu

Login/signup/forgot/change password có form component và validation riêng.

#### Vấn đề thường gặp

AuthPages lớn dễ lẫn Google login, email login, redirect, validation.

#### Cách thực hiện

1. Tạo `LoginForm`, `SignupForm`, `ForgotPasswordForm`
2. tách hook auth submit
3. giữ returnTo.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/AuthPages.jsx`
- `src/features/auth/*`
- `src/services/authService.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-E10. Tách StaticPage content data

#### Mục tiêu

Nội dung static nằm trong data/config để dễ review và tránh JSX quá dài.

#### Vấn đề thường gặp

StaticPage trộn nhiều content làm khó update legal/product copy.

#### Cách thực hiện

1. Tạo `staticPagesContent.js`
2. component chỉ render theo content model
3. thêm owner review copy.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/StaticPage.jsx`
- `src/content/staticPagesContent.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P1-F. CSS, design system và UI primitives
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P1-F01 | Không thêm CSS feature-specific vào `global.css` | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F02 | Tách tokens/base/layout/utilities | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F03 | Chuẩn hóa Button/Card/Dialog/Field/Table usage | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F04 | Focus-visible đầy đủ | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F05 | Dialog trap focus/restore focus | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F06 | Table có caption/scope/responsive fallback | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F07 | Loading/error/empty state thống nhất | P1 | Issue/PR có pass criteria và evidence rõ |
| P1-F08 | Visual regression cho thay đổi lớn | P1 | Issue/PR có pass criteria và evidence rõ |


### P1-F01. Không thêm CSS feature-specific vào `global.css`

#### Mục tiêu

Ngăn global CSS tiếp tục phình và gây regression toàn app.

#### Vấn đề thường gặp

Developer thường thêm class vào cuối global vì không biết đặt đâu.

#### Cách thực hiện

1. Nếu CSS thuộc feature, đặt cạnh feature hoặc file CSS module
2. global chỉ token/base/layout utility
3. review diff CSS.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/styles/global.css`
- `src/styles/*`
- `src/features/**/*.css`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F02. Tách tokens/base/layout/utilities

#### Mục tiêu

CSS foundation rõ ràng để team dùng token nhất quán.

#### Vấn đề thường gặp

Token, reset, layout, feature selector trộn lẫn làm khó maintain.

#### Cách thực hiện

1. Tách `tokens.css`, `base.css`, `layout.css`, `utilities.css`
2. import theo thứ tự
3. không đổi visual cùng lúc nếu không test.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/styles/global.css`
- `src/styles/tokens.css`
- `src/styles/base.css`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F03. Chuẩn hóa Button/Card/Dialog/Field/Table usage

#### Mục tiêu

Giảm duplicate UI và đảm bảo accessibility nhất quán.

#### Vấn đề thường gặp

Mỗi page tự style button/table/form làm UI không đồng nhất.

#### Cách thực hiện

1. Audit control tự viết
2. thay bằng primitive shared
3. thêm variant nếu thật sự cần
4. document usage.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/components/ui/*`
- `src/components/ui/ui.css`
- `src/pages/**/*.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F04. Focus-visible đầy đủ

#### Mục tiêu

Người dùng keyboard nhìn thấy vị trí focus rõ ràng.

#### Vấn đề thường gặp

CSS reset hoặc custom style có thể làm mất outline focus.

#### Cách thực hiện

1. Audit button/link/input/dialog
2. dùng `:focus-visible`
3. test Tab/Shift+Tab
4. không dùng `outline: none` nếu không thay thế.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/styles/*.css`
- `src/components/ui/*`
- `tests/e2e/accessibility.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F05. Dialog trap focus/restore focus

#### Mục tiêu

Dialog/modal phải giữ focus bên trong và trả focus về trigger khi đóng.

#### Vấn đề thường gặp

Modal không trap focus gây lỗi keyboard/screen reader.

#### Cách thực hiện

1. Kiểm tra Dialog primitive
2. thêm trap/escape/restore
3. đảm bảo body scroll
4. test admin forms.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/components/ui/Dialog.jsx`
- `src/pages/AdminWorkspacePage.jsx`
- `tests/e2e/accessibility.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F06. Table có caption/scope/responsive fallback

#### Mục tiêu

Table quan trọng phải đọc được bằng screen reader và dùng tốt trên mobile.

#### Vấn đề thường gặp

Table chỉ đẹp mắt nhưng thiếu semantics làm admin khó dùng bằng a11y tools.

#### Cách thực hiện

1. Thêm caption/aria-label/th scope
2. responsive card view nếu cần
3. test admin tables.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/components/ui/Table.jsx`
- `src/features/admin/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F07. Loading/error/empty state thống nhất

#### Mục tiêu

Mọi API UI có trạng thái đang tải, lỗi, không có dữ liệu theo pattern chung.

#### Vấn đề thường gặp

Mỗi page tự chế message gây UX không nhất quán.

#### Cách thực hiện

1. Tạo shared `StatusState` hoặc guideline
2. thay các page quan trọng
3. error message user-safe.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/components/ui/*`
- `src/pages/**/*.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P1-F08. Visual regression cho thay đổi lớn

#### Mục tiêu

Mọi thay đổi layout/global CSS có bằng chứng không phá màn hình chính.

#### Vấn đề thường gặp

CSS global thay đổi dễ phá page không liên quan.

#### Cách thực hiện

1. Chạy visual test hoặc chụp screenshot trước/sau
2. ghi rõ snapshot update nếu có chủ đích.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `tests/e2e/visual.spec.js`
- `src/styles/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P1**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P2-G. Testing strategy
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P2-G01 | Lint và build trong mọi PR | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G02 | Route tests cập nhật khi thêm route | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G03 | A11y test cho màn hình mới | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G04 | Unit test role/premium helpers | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G05 | Unit test profile validation | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G06 | Integration test API service bằng mock fetch | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G07 | Payment status fixture | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-G08 | Demo/mock scanner test | P2 | Issue/PR có pass criteria và evidence rõ |


### P2-G01. Lint và build trong mọi PR

#### Mục tiêu

Không merge code không qua lint/build cơ bản.

#### Vấn đề thường gặp

Không chạy lint/build làm lỗi cú pháp hoặc import lọt vào main.

#### Cách thực hiện

1. Bắt buộc command trong PR
2. CI gate nếu có
3. không chấp nhận “chưa chạy” cho P0/P1.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `package.json`
- `CI config`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G02. Route tests cập nhật khi thêm route

#### Mục tiêu

Route mới có coverage navigation/access/title cơ bản.

#### Vấn đề thường gặp

Thêm route không test dễ gây 404/redirect sai.

#### Cách thực hiện

1. Cập nhật route manifest
2. test public/auth/premium/role theo loại route
3. test alias nếu có.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `tests/e2e/routes.spec.js`
- `tests/e2e/route-manifest.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G03. A11y test cho màn hình mới

#### Mục tiêu

Màn hình mới không có lỗi accessibility nghiêm trọng.

#### Vấn đề thường gặp

Form/dialog/table mới thường thiếu label/focus/error.

#### Cách thực hiện

1. Chạy axe/manual keyboard
2. kiểm tra label, aria, focus, contrast cơ bản.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `tests/e2e/accessibility.spec.js`
- `src/components/ui/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G04. Unit test role/premium helpers

#### Mục tiêu

Logic role/premium/profile setup được test bằng unit thay vì chỉ manual.

#### Vấn đề thường gặp

Access helper lỗi có thể phá nhiều route cùng lúc.

#### Cách thực hiện

1. Tạo test cho admin/staff/patient/non-premium/expired token/profile setup.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/utils/roles.js`
- `src/services/apiClient.js`
- `tests/unit/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G05. Unit test profile validation

#### Mục tiêu

Validation profile không nằm rải trong UI và có test edge cases.

#### Vấn đề thường gặp

Validate chiều cao/cân nặng/blood type/date nếu sai có thể lưu dữ liệu bẩn.

#### Cách thực hiện

1. Tách validator
2. test valid/invalid/min/max/missing field
3. UI dùng validator.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/PersonalPatientProfilePage.jsx`
- `src/features/profile/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G06. Integration test API service bằng mock fetch

#### Mục tiêu

Service API được test với success/error/auth/pagination.

#### Vấn đề thường gặp

E2E khó phát hiện lỗi nhỏ ở service/headers.

#### Cách thực hiện

1. Mock fetch
2. test apiRequest headers/body/error parsing
3. test service domain quan trọng.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/services/*Service.js`
- `tests/integration/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G07. Payment status fixture

#### Mục tiêu

Payment return/cancel/pending/failed có fixture và test rõ.

#### Vấn đề thường gặp

Chỉ test happy path gây lỗi khi provider trả pending/cancel/invalid orderCode.

#### Cách thực hiện

1. Tạo fixtures
2. test return page với status success/pending/failed/cancel
3. test refresh page.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/PaymentResultPage.jsx`
- `tests/e2e/payment-results.spec.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-G08. Demo/mock scanner test

#### Mục tiêu

Production không chứa mock/demo y tế không nhãn.

#### Vấn đề thường gặp

Mock mới có thể lọt vào release nếu chỉ review thủ công.

#### Cách thực hiện

1. Tạo script grep hoặc test kiểm tra pattern mock/demo ở route production-sensitive
2. allowlist rõ.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `scripts/*`
- `tests/e2e/*`
- `docs/mock-inventory.md`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P2-H. Performance và production readiness
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P2-H01 | Lazy load page nặng | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H02 | Không import map vào route không dùng | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H03 | Memo hóa list/table lớn khi cần | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H04 | Debounce search/filter API | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H05 | Image/font loading hợp lý | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H06 | Error boundary cho vùng nặng | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H07 | Build output không chứa secret | P2 | Issue/PR có pass criteria và evidence rõ |
| P2-H08 | Vercel rewrite theo env | P2 | Issue/PR có pass criteria và evidence rõ |


### P2-H01. Lazy load page nặng

#### Mục tiêu

Page nặng như map/admin/chat không tăng initial bundle nếu không cần.

#### Vấn đề thường gặp

Import toàn bộ page nặng ở App làm landing load chậm.

#### Cách thực hiện

1. Dùng `React.lazy` cho page nặng
2. Suspense fallback tốt
3. test route lazy.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/App.jsx`
- `src/pages/NearbyClinicPage.jsx`
- `src/pages/AdminWorkspacePage.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H02. Không import map vào route không dùng

#### Mục tiêu

MapLibre/react-map-gl chỉ load khi vào map hoặc feature cần map.

#### Vấn đề thường gặp

Map lib lớn làm bundle đầu nặng nếu import ở shared hoặc landing.

#### Cách thực hiện

1. Kiểm tra bundle
2. move import vào map page/component lazy
3. không export map từ barrel shared chung.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/pages/NearbyClinicPage.jsx`
- `src/features/map/*`
- `vite build output`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H03. Memo hóa list/table lớn khi cần

#### Mục tiêu

Giảm render thừa ở admin list, facility list, filters.

#### Vấn đề thường gặp

Memoization thiếu làm typing/search lag; memoization thừa làm code phức tạp.

#### Cách thực hiện

1. Profile trước
2. dùng `useMemo` cho derived list
3. `React.memo` cho row/table nếu props ổn định
4. không memo mù quáng.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/features/admin/*`
- `src/pages/NearbyClinicPage.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H04. Debounce search/filter API

#### Mục tiêu

Không spam API mỗi phím gõ trong search/filter.

#### Vấn đề thường gặp

Search gọi API mỗi keypress gây tải backend và UX lag.

#### Cách thực hiện

1. Tạo `useDebouncedValue`
2. chỉ gọi API sau delay
3. cancel request cũ nếu có
4. test network.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/hooks/*`
- `src/features/admin/*`
- `src/features/map/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H05. Image/font loading hợp lý

#### Mục tiêu

Assets không làm chậm render chính.

#### Vấn đề thường gặp

Ảnh lớn/font external không tối ưu gây CLS/LCP kém.

#### Cách thực hiện

1. Audit image sizes
2. dùng lazy loading cho ảnh dưới fold
3. preload font quan trọng nếu cần
4. tránh import asset không dùng.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/assets/*`
- `public/*`
- `src/components/landing/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H06. Error boundary cho vùng nặng

#### Mục tiêu

Lỗi ở map/admin/chat không làm trắng toàn app.

#### Vấn đề thường gặp

Component crash nếu không có boundary có thể làm SPA unusable.

#### Cách thực hiện

1. Tạo ErrorBoundary shared
2. bọc page nặng
3. fallback UI có retry/home
4. log metadata an toàn.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `src/components/ErrorBoundary.jsx`
- `src/App.jsx`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H07. Build output không chứa secret

#### Mục tiêu

Bundle production không chứa key/token/IP nhạy cảm.

#### Vấn đề thường gặp

Secret có thể bị inject qua Vite env hoặc string hard-code.

#### Cách thực hiện

1. Sau build, grep `dist` với key patterns, provider domains, IP
2. CI check nếu có thể.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `dist/**`
- `scripts/check-build-secrets.js`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P2-H08. Vercel rewrite theo env

#### Mục tiêu

Deploy không phụ thuộc rewrite hard-code trong repo nếu môi trường thay đổi.

#### Vấn đề thường gặp

Rewrite cứng làm staging/prod gọi nhầm backend.

#### Cách thực hiện

1. Đưa API target vào env platform
2. document deployment
3. smoke test sau deploy.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `vercel.json`
- `docs/deploy/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P2**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

## P3-I. Documentation và team process
| ID | Checklist item | Ưu tiên | Output mong đợi |
| --- | --- | --- | --- |
| P3-I01 | PR template bắt buộc checklist | P3 | Issue/PR có pass criteria và evidence rõ |
| P3-I02 | CODEOWNERS cho file nhạy cảm | P3 | Issue/PR có pass criteria và evidence rõ |
| P3-I03 | ADR cho quyết định lớn | P3 | Issue/PR có pass criteria và evidence rõ |
| P3-I04 | Onboarding guide cho dev mới | P3 | Issue/PR có pass criteria và evidence rõ |
| P3-I05 | Release checklist | P3 | Issue/PR có pass criteria và evidence rõ |
| P3-I06 | Docs stale review định kỳ | P3 | Issue/PR có pass criteria và evidence rõ |


### P3-I01. PR template bắt buộc checklist

#### Mục tiêu

Mọi PR có test/docs/security checklist để reviewer không hỏi lại lặp lại.

#### Vấn đề thường gặp

Thiếu PR template làm quality phụ thuộc từng người.

#### Cách thực hiện

1. Tạo `.github/pull_request_template.md`
2. thêm mục risk/test/docs/security
3. yêu cầu evidence.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `.github/pull_request_template.md`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P3-I02. CODEOWNERS cho file nhạy cảm

#### Mục tiêu

Auth/API/deploy/security route cần owner review.

#### Vấn đề thường gặp

Ai cũng merge file nhạy cảm làm rủi ro production.

#### Cách thực hiện

1. Tạo CODEOWNERS cho `src/services`, `src/router`, `vercel.json`, `.env.example`, admin/payment/auth.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `.github/CODEOWNERS`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P3-I03. ADR cho quyết định lớn

#### Mục tiêu

Quyết định kiến trúc có context, decision, consequence rõ.

#### Vấn đề thường gặp

Quyết định truyền miệng khiến dev mới không hiểu vì sao làm vậy.

#### Cách thực hiện

1. Tạo `docs/architecture/adr`
2. viết ADR cho feature-first, API layer, auth/session, AI gateway, CSS strategy.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `docs/architecture/adr/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P3-I04. Onboarding guide cho dev mới

#### Mục tiêu

Dev mới có lộ trình đọc docs, chạy app, pick task nhỏ.

#### Vấn đề thường gặp

Không có onboarding làm dev mới hỏi nhiều và sửa sai tầng.

#### Cách thực hiện

1. Tạo guide ngày 1/2/3
2. checklist setup
3. task đầu tiên an toàn
4. glossary.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `docs/onboarding/*`
- `README.md`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P3-I05. Release checklist

#### Mục tiêu

Release production có gate rõ, không deploy theo cảm tính.

#### Vấn đề thường gặp

Thiếu release checklist dễ bỏ qua test payment/auth/env.

#### Cách thực hiện

1. Tạo release checklist theo type thay đổi
2. include rollback/smoke test/owner.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `docs/release/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.


### P3-I06. Docs stale review định kỳ

#### Mục tiêu

Docs được review định kỳ để không hướng dẫn sai source hiện tại.

#### Vấn đề thường gặp

Docs cũ nguy hiểm hơn không có docs vì nhân viên follow sai.

#### Cách thực hiện

1. Tạo lịch review docs
2. owner từng nhóm
3. rule cập nhật docs khi route/API/auth/architecture đổi.

#### Ví dụ trước khi sửa

```txt
Hiện trạng thường gặp: logic hoặc quy ước nằm rải rác, thiếu checklist, thiếu test/evidence, reviewer khó xác định thay đổi có an toàn hay không.
```

#### Ví dụ sau khi sửa

```txt
Trạng thái mục tiêu: trách nhiệm được đặt đúng layer, có test/evidence, có owner rõ và không làm thay đổi behavior ngoài scope.
```

#### File/thư mục liên quan

- `docs/**/*`

#### Rủi ro

- Refactor quá rộng có thể gây regression ngoài phạm vi.
- Nếu thiếu test hoặc manual evidence, reviewer khó xác nhận an toàn.
- Đổi cấu trúc file có thể làm import path hoặc route behavior lỗi.

#### Cách kiểm tra

- Chạy lint/build.
- Chạy test liên quan hoặc manual steps đã ghi trong PR.
- Review diff xác nhận không đổi behavior ngoài scope.
- Kiểm tra docs hoặc checklist liên quan đã cập nhật nếu cần.

#### Độ ưu tiên

**P3**

#### Acceptance criteria

- Mục tiêu của task được hoàn thành đúng phạm vi.
- Không phát sinh secret, mock không nhãn, API bypass hoặc route/access bypass.
- Lint/build pass.
- Test hoặc manual evidence phù hợp được đính kèm vào PR.
- Nếu thay đổi route/API/auth/flow/architecture, docs liên quan đã được cập nhật.

---

# 12. Kế hoạch triển khai theo sprint đề xuất

## Sprint 1 — P0 Security/Safety/Env

Mục tiêu: giảm rủi ro production lớn nhất trước khi refactor sâu.

| Task | Output |
| --- | --- |
| P0-A01 | Không còn AI provider secret ở frontend |
| P0-A02/P0-A04 | API URL/HTTPS production rõ ràng |
| P0-A03/P0-A06 | Không có secret/log PII/medical data |
| P0-B01 | Có mock/demo inventory |
| P0-B02/P0-B03 | Records/medication có nhãn demo hoặc ẩn production |
| P0-B07 | Emergency guidance rõ |

## Sprint 2 — P1 API/Route/Auth Guardrails

Mục tiêu: tạo guardrails trước khi tách page lớn.

| Task | Output |
| --- | --- |
| P1-C01/C02 | API call đi qua service/endpoints |
| P1-C04 | Error format thống nhất |
| P1-D01-D08 | Route/access/title/navigation có test và policy rõ |
| P2-G04 | Role/premium helper có unit test |

## Sprint 3 — P1 Admin/Page Split Phase 1

Mục tiêu: giảm god component lớn nhất.

| Task | Output |
| --- | --- |
| P1-E01 | Admin overview tách riêng |
| P1-E02 | Admin users tách riêng |
| P1-E03 | Admin doctors tách riêng |
| P1-F07 | Loading/error/empty state pattern dùng trong admin |

## Sprint 4 — P1 Admin/Page Split Phase 2 + CSS Freeze

| Task | Output |
| --- | --- |
| P1-E04/E05/E06 | AI configs/subscriptions/departments/facilities tách riêng |
| P1-F01/F02 | Global CSS không tăng, foundation tách rõ |
| P1-F08 | Visual evidence cho CSS/layout |

## Sprint 5 — P2 Testing/Performance

| Task | Output |
| --- | --- |
| P2-G05/G06/G07 | Unit/integration/payment tests tăng |
| P2-H01/H02 | Lazy load page nặng và map bundle |
| P2-H03/H04 | Render/search/filter tối ưu |
| P2-H06/H07 | Error boundary và build secret scan |

## Sprint 6 — P3 Process/Docs Governance

| Task | Output |
| --- | --- |
| P3-I01 | PR template |
| P3-I02 | CODEOWNERS |
| P3-I03 | ADR |
| P3-I04 | Onboarding guide |
| P3-I05 | Release checklist |
| P3-I06 | Docs stale review process |

---

# 13. Bảng tracking trạng thái triển khai

Dùng bảng này trong Notion/Jira/GitHub Projects.

| ID | Task | Owner | Status | PR | Evidence | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| P0-A01 | Không để AI provider secret trong frontend |  | Todo |  |  |  |
| P0-A02 | Tách dev/staging/prod API URL |  | Todo |  |  |  |
| P0-B01 | Lập inventory mock/demo |  | Todo |  |  |  |
| P1-C01 | Không fetch trực tiếp trong UI |  | Todo |  |  |  |
| P1-D02 | Role admin/staff test đầy đủ |  | Todo |  |  |  |
| P1-E02 | Tách Admin users section |  | Todo |  |  |  |
| P1-F01 | Không thêm CSS feature vào global |  | Todo |  |  |  |
| P2-G06 | Integration test API service |  | Todo |  |  |  |
| P3-I01 | PR template |  | Todo |  |  |  |

---

# 14. Hướng dẫn sử dụng cho từng vai trò

## Developer

- Chọn một task có ID rõ.
- Đọc phần file liên quan trước khi sửa.
- Viết PR description theo mẫu.
- Không mở rộng scope khi phát hiện vấn đề mới; tạo issue mới.
- Luôn đính kèm command/test evidence.

## Reviewer

- Đối chiếu PR với task ID.
- Kiểm tra scope có đúng không.
- Reject nếu có API bypass, secret, mock không nhãn, route bypass hoặc CSS global không kiểm soát.
- Yêu cầu evidence nếu task P0/P1.

## Tech Lead

- Dùng sprint plan để chia backlog.
- Gán owner cho vùng rủi ro cao.
- Thiết lập CODEOWNERS/CI/PR template để biến checklist thành guardrail.
- Review định kỳ task đã làm và task còn tồn đọng.

## PM/Founder

- Theo dõi P0/P1 như rủi ro release, không chỉ là “nợ kỹ thuật”.
- Không ép release nếu còn secret client, mock y tế không nhãn, payment/auth thiếu test.
- Ưu tiên refactor admin/page lớn để tăng tốc phát triển dài hạn.

---

# 15. Kết luận

Checklist này nên được xem là backlog refactor sống. Khi source thay đổi, checklist cũng phải cập nhật. Mục tiêu cuối cùng không phải là có thật nhiều tài liệu, mà là làm cho mọi developer trong team biết:

- code mới phải đặt ở đâu;
- API phải gọi qua tầng nào;
- route/access phải kiểm tra ra sao;
- mock/demo phải được quản trị thế nào;
- PR nào được merge và PR nào phải chặn;
- làm sao refactor từng phần mà không phá app.

Nếu team áp dụng checklist này nhất quán trong vài sprint, repo frontend sẽ dễ hiểu hơn, dễ bảo trì hơn, dễ test hơn, onboarding nhanh hơn và chuyên nghiệp hơn đáng kể.
