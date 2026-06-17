# Rủi ro kỹ thuật, tác động và đề xuất ưu tiên - Bản nâng cấp

> Phiên bản nâng cấp: 2026-06-17  
> Phạm vi: frontend React/Vite MediMate AI.  
> Mục tiêu: dùng làm **risk register**, **release gate**, **incident playbook** và **roadmap ưu tiên kỹ thuật** cho team frontend.  
> Nguyên tắc: tài liệu này hỗ trợ ra quyết định, không thay thế lint, build, test, review, kiểm thử runtime hoặc đánh giá bảo mật chính thức.

---

## 1. Mục tiêu của tài liệu

Tài liệu này giúp team trả lời các câu hỏi quan trọng trước khi refactor, merge hoặc release:

- Rủi ro nào đang ảnh hưởng trực tiếp tới production trust?
- Rủi ro nào phải xử lý trước khi tách folder, tối ưu CSS hoặc thêm feature?
- Ai là owner của từng nhóm rủi ro?
- Điều kiện nào chặn release?
- Khi incident xảy ra thì xử lý theo thứ tự nào?
- Một rủi ro được xem là “đã giảm” hay “đã đóng” khi nào?
- Reviewer cần yêu cầu evidence gì trước khi approve?

Tài liệu này không chỉ dành cho developer. Tech lead, reviewer, PM, founder và QA đều có thể dùng để thống nhất ưu tiên.

---

## 2. Cách dùng tài liệu này trong công ty

### 2.1. Khi planning sprint

Sử dụng bảng risk register để chọn task theo thứ tự:

1. **Critical/P0:** secret, env, demo y tế, access bypass, payment sai trạng thái.
2. **High/P1:** page lớn, CSS global lớn, API error, role/premium gate, symptom empty/error.
3. **Medium/P2:** testing pyramid, map fallback, profile partial failure, import boundary.
4. **Low/P3:** docs/process nâng cao, cleanup định kỳ.

Không nên dùng toàn bộ sprint để “làm đẹp cấu trúc” nếu các rủi ro Critical vẫn mở.

### 2.2. Khi review PR

Reviewer kiểm tra:

- PR có đụng rủi ro nào trong register không?
- Nếu có, owner đúng người chưa?
- Evidence đủ chưa?
- Có cần chặn merge không?
- Có cần cập nhật risk status không?

### 2.3. Khi chuẩn bị release

Dùng phần **Release gate** và **Pre-release checklist**. Nếu có bất kỳ gate Critical nào fail, không release trừ khi tech lead và PM có risk acceptance rõ. Với domain sức khỏe, risk acceptance không được dùng để bỏ qua secret, demo y tế không nhãn, auth bypass hoặc payment sai trạng thái.

### 2.4. Khi onboarding nhân viên mới

Nhân viên mới nên đọc tài liệu này sau khi đọc tổng quan kiến trúc. Mục tiêu là hiểu vùng nào không được sửa cảm tính:

- auth/session;
- AI/symptom/medical safety;
- payment/subscription;
- route/access/premium;
- env/deploy;
- admin CRUD lớn;
- CSS global.

---

## 3. Thang đánh giá rủi ro

### 3.1. Mức độ tác động

| Mức | Ý nghĩa | Ví dụ | Quyết định release |
| --- | --- | --- | --- |
| Critical | Có thể gây lộ secret, sai môi trường production, hiểu nhầm y tế nghiêm trọng, bypass quyền, sai trạng thái tiền | Provider key trong bundle, demo medication như thật, admin route bypass | Chặn release |
| High | Gây lỗi chức năng chính, regression lớn, khó bảo trì nghiêm trọng, ảnh hưởng nhiều developer | Admin page quá lớn, API error inconsistent, CSS global lớn | Ưu tiên sprint gần nhất |
| Medium | Gây UX/dev friction, có workaround nhưng làm giảm chất lượng dài hạn | Thiếu unit test, map fallback chưa cứng, docs stale | Lên kế hoạch xử lý |
| Low | Cải thiện quy trình hoặc chất lượng dài hạn | Chuẩn hóa comment, docs audit định kỳ | Làm khi có bandwidth |

### 3.2. Scoring đề xuất

Ngoài nhãn Critical/High/Medium/Low, team có thể tính điểm để so sánh backlog:

```txt
Risk Score = Impact x Likelihood x Detectability
```

Trong đó:

| Điểm | Impact | Likelihood | Detectability |
| ---: | --- | --- | --- |
| 1 | Ít ảnh hưởng | Rất hiếm | Dễ phát hiện trước merge |
| 2 | Ảnh hưởng nhỏ | Thỉnh thoảng | Có test/manual phát hiện |
| 3 | Ảnh hưởng module | Có thể xảy ra | Phát hiện khi QA sâu |
| 4 | Ảnh hưởng flow chính | Dễ xảy ra khi dev mới sửa | Dễ lọt nếu review không kỹ |
| 5 | Bảo mật/sức khỏe/tiền/quyền | Rất dễ xảy ra hoặc đã có dấu hiệu | Khó phát hiện nếu không scan/test |

Quy tắc:

- Score từ 60 trở lên: xem như P0/P1 tùy loại.
- Bất kỳ risk nào liên quan secret/demo y tế/access/payment có thể chặn release dù score chưa cao.
- Detectability càng cao nghĩa là càng khó phát hiện, càng cần guardrail tự động.

---

## 4. Executive summary cho quản lý

Rủi ro quan trọng nhất của repo frontend MediMate AI không nằm ở việc thiếu tính năng, mà nằm ở **niềm tin production**:

1. Không được để secret/provider key trong browser.
2. Không được deploy frontend trỏ sai backend hoặc dùng production API không kiểm soát.
3. Không được để demo/mock y tế bị hiểu như capability thật.
4. Không được để route admin/premium bị bypass.
5. Không được để payment status sai hoặc mơ hồ.
6. Không được để symptom/AI output gây hiểu nhầm là chẩn đoán chắc chắn.
7. Không được để page/CSS lớn tiếp tục phình mà không có kế hoạch tách.

Sau khi khóa các risk trên, team mới nên tập trung mạnh vào migration feature-first, tách AdminWorkspacePage, tách CSS, tăng unit/integration test và chuẩn hóa quy trình review.

---

## 5. Risk register tổng hợp

| ID | Rủi ro | Mức | Khu vực | Release gate | Owner chính |
| --- | --- | --- | --- | --- | --- |
| R01 | Secret/API provider key ở frontend | Critical | AI, chatbot, env, bundle | Chặn release nếu còn secret hoặc direct provider call bằng secret ở client. | Tech Lead + Backend AI owner + Senior FE |
| R02 | Hard-code backend IP trong config/deploy | Critical | Env, Vite, Vercel, deploy | Chặn release nếu production trỏ HTTP/IP không kiểm soát hoặc sai môi trường. | Tech Lead + DevOps/Deployment owner |
| R03 | Demo/mock y tế hiển thị như capability thật | Critical | Records, medication, fallback recommendation, static/demo pages | Chặn release nếu demo y tế có thể bị hiểu là dữ liệu/chẩn đoán thật. | Product owner + Senior FE + Tech Lead |
| R04 | Auth token lưu trong localStorage | High | Auth/session/security | Không nhất thiết chặn release nếu đã có mitigation, nhưng chặn nếu logout/401 giữ token sai. | Senior FE + Backend Auth owner |
| R05 | AdminWorkspacePage quá lớn | High | Admin CRUD, maintainability | Không chặn release hiện tại nếu app ổn, nhưng chặn PR admin lớn không thể review. | FE Admin owner + Senior FE reviewer |
| R06 | CSS global quá lớn | High | CSS/design system/UI regression | Chặn PR nếu thêm CSS global lớn không có lý do/evidence. | UI owner + Senior FE |
| R07 | API error handling inconsistent | High | API layer, UX reliability | Chặn PR API mới nếu thiếu loading/error/empty hoặc tự parse lỗi trong UI. | FE API owner + Tech Lead |
| R08 | Premium/role gate thiếu test edge cases | High | Routing/access/auth | Chặn release nếu có admin/premium bypass hoặc redirect loop. | Routing owner + Senior FE |
| R09 | Payment status edge cases | High | Pricing/payment/subscription | Chặn release nếu release đụng payment và chưa test các trạng thái tiền. | Payment FE owner + Backend Payment owner |
| R10 | Symptom analysis empty questions/error | High | Symptom analysis/medical safety | Chặn release nếu flow có thể gây hiểu nhầm y tế nghiêm trọng. | Symptom FE owner + Product/clinical reviewer nếu có |
| R11 | Map/location fallback chưa đủ cứng | Medium-High | Map, facility, location permission | Chặn nếu map crash toàn app; không chặn nếu fallback rõ và feature không critical. | Map FE owner |
| R12 | Static content stale/overclaim | Medium | StaticPage/content/product copy | Chặn nếu copy y tế/pháp lý gây hiểu nhầm lớn. | Product owner + FE content owner |
| R13 | Thiếu unit/integration test | Medium | Testing pyramid | Không chặn release chung, nhưng chặn PR đổi logic quan trọng không có test/evidence. | QA/FE testing owner |
| R14 | React canary dependency | Medium | Dependencies/runtime | Chặn PR dependency lớn nếu không có test/evidence. | Tech Lead |
| R15 | Không có import boundary enforcement | Medium | Architecture/process | Chặn PR nếu import sai layer ở vùng đã có quy ước rõ. | Tech Lead + Architecture owner |
| R16 | Docs có thể stale | Medium | Documentation/governance | Chặn nếu docs sai có thể dẫn tới deploy/auth/API sai. | Tech Lead + Docs owner |
| R17 | PII/medical data logging | High nếu xảy ra | Privacy/security/observability | Chặn PR nếu log chứa token/PII/medical data. | Security-aware reviewer + Senior FE |
| R18 | Facility coordinates/data shape không ổn | Medium | Facility/admin/map/data contract | Chặn nếu map/facility release mới hiển thị dữ liệu sai nghiêm trọng. | Facility FE owner + Backend facility owner |
| R19 | Profile update partial failure | Medium | Profile setup/user data | Không chặn release nếu có message/retry rõ; chặn nếu gây mất dữ liệu hoặc loop. | Profile FE owner + Backend user/profile owner |
| R20 | Large PR refactor | High process risk | Team process/review quality | Chặn PR nếu reviewer không thể đánh giá an toàn. | All developers + reviewers + Tech Lead |

---

## 6. Nhóm rủi ro theo release gate

### 6.1. Chặn release tuyệt đối nếu chưa xử lý

| ID | Rủi ro | Lý do |
| --- | --- | --- |
| R01 | Secret/API provider key ở frontend | Có thể bị lấy từ bundle/network |
| R02 | Hard-code backend IP hoặc production API không kiểm soát | Dễ deploy sai môi trường, sai dữ liệu |
| R03 | Demo/mock y tế như capability thật | Rủi ro hiểu nhầm sức khỏe |
| R08 | Admin/premium/access bypass | Rủi ro quyền truy cập |
| R09 | Payment status sai nếu release đụng payment | Rủi ro tiền/quyền premium |
| R17 | Log PII/medical/token | Rủi ro dữ liệu nhạy cảm |

### 6.2. Chặn PR nếu thiếu evidence

| ID | Rủi ro | Evidence bắt buộc |
| --- | --- | --- |
| R05 | AdminWorkspacePage quá lớn | Test section liên quan, scope nhỏ, không đổi behavior |
| R06 | CSS global quá lớn | Screenshot/visual/manual responsive evidence |
| R07 | API error inconsistent | Mock lỗi hoặc manual API error evidence |
| R10 | Symptom empty/error | Test empty questions/error + medical safety copy |
| R20 | Large PR refactor | Tách PR hoặc có justification rõ |

---

## 7. Ma trận ưu tiên triển khai

### 7.1. P0 - Làm trước hoặc chặn release

- R01 Secret/API provider key ở frontend.
- R02 Hard-code backend IP trong config/deploy.
- R03 Demo/mock y tế hiển thị như thật.
- R08 Premium/role gate nếu có dấu hiệu bypass.
- R09 Payment status nếu release ảnh hưởng payment.
- R17 PII/medical data logging nếu phát hiện.

### 7.2. P1 - Sprint gần nhất

- R04 Auth token localStorage hardening.
- R05 AdminWorkspacePage quá lớn.
- R06 CSS global quá lớn.
- R07 API error handling inconsistent.
- R10 Symptom empty questions/error.
- R20 Large PR refactor policy.

### 7.3. P2 - Lên kế hoạch theo module

- R11 Map/location fallback.
- R12 Static content stale/overclaim.
- R13 Thiếu unit/integration test.
- R18 Facility coordinates/data shape.
- R19 Profile partial failure.

### 7.4. P3 - Governance dài hạn

- R14 React canary dependency.
- R15 Import boundary enforcement.
- R16 Docs stale governance.

---

## 8. Risk cards chi tiết


### R01. Secret/API provider key ở frontend

#### Mức độ

**Critical**

#### Khu vực ảnh hưởng

AI, chatbot, env, bundle

#### Mô tả rủi ro

Lộ khóa provider, phát sinh chi phí không kiểm soát, mất uy tín bảo mật và khó audit request.

#### File/thư mục cần kiểm tra

`src/pages/ChatbotPage.jsx`, `src/services/anthropicService.js`, `.env*`, `vite.config.js`, bundle build.

#### Dấu hiệu nhận biết

- Có biến `VITE_ANTHROPIC_KEY` hoặc key provider tương tự trong frontend.
- Browser gọi trực tiếp endpoint của AI provider.
- Build output chứa chuỗi key/domain provider không mong muốn.
- Developer cần key provider để chạy frontend local.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Chặn direct provider call ở production.
2. Chuyển luồng AI sang backend gateway.
3. Xóa env secret khỏi frontend và `.env.example`.
4. Rotate key nếu key thật từng xuất hiện trong repo/build.
5. Thêm secret scanning trước PR/release.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- `rg -n "VITE_.*KEY|ANTHROPIC|OPENAI|apiKey|x-api-key" src .env* dist vite.config.js vercel.json`
- Build production rồi grep bundle.
- Test chatbot/symptom vẫn hoạt động qua backend endpoint nội bộ.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Tech Lead + Backend AI owner + Senior FE
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu còn secret hoặc direct provider call bằng secret ở client.

#### Độ ưu tiên xử lý

P0 - xử lý trước hoặc chặn release.

### R02. Hard-code backend IP trong config/deploy

#### Mức độ

**Critical**

#### Khu vực ảnh hưởng

Env, Vite, Vercel, deploy

#### Mô tả rủi ro

Frontend có thể trỏ nhầm backend dev/staging/prod, dùng HTTP/IP thô, hoặc downtime khi IP thay đổi.

#### File/thư mục cần kiểm tra

`.env.example`, `.env.development`, `.env.production`, `vite.config.js`, `vercel.json`, deploy platform env.

#### Dấu hiệu nhận biết

- IP backend xuất hiện trực tiếp trong source.
- Production API dùng `http://` hoặc IP thô.
- Preview deploy không có env riêng.
- Fallback config tự quyết định backend production trong repo.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Đổi `.env.example` thành placeholder.
2. Tách dev/staging/prod env trên platform.
3. Dùng HTTPS domain backend cho production.
4. Xóa fallback IP production khỏi source.
5. Tạo env matrix trong docs release.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- `rg -n "http://|\b\d{1,3}(\.\d{1,3}){3}\b" .env* vite.config.js vercel.json src`
- Kiểm tra network tab của preview/prod.
- Chạy build với env production giả để kiểm tra endpoint.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Tech Lead + DevOps/Deployment owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu production trỏ HTTP/IP không kiểm soát hoặc sai môi trường.

#### Độ ưu tiên xử lý

P0 - xử lý trước hoặc chặn release.

### R03. Demo/mock y tế hiển thị như capability thật

#### Mức độ

**Critical**

#### Khu vực ảnh hưởng

Records, medication, fallback recommendation, static/demo pages

#### Mô tả rủi ro

Người dùng có thể hiểu nhầm dữ liệu giả là dữ liệu y tế thật hoặc tin kết quả demo để ra quyết định sức khỏe.

#### File/thư mục cần kiểm tra

`MedicalRecordPage.jsx`, `MedicationScanPage.jsx`, `hospitalRecommendations.js`, `StaticPage.jsx`, landing demo components.

#### Dấu hiệu nhận biết

- Có `MOCK_`, `mock`, `demo`, `placeholder` trong feature production.
- Route demo xuất hiện trong nav chính mà không có banner.
- API lỗi nhưng UI trả dữ liệu giả không nói rõ.
- Copy dùng ngôn ngữ như capability đã hoàn thiện.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Lập inventory mock/demo có owner.
2. Ẩn nav production hoặc gắn banner demo rõ.
3. Không dùng mock làm fallback im lặng sau lỗi production.
4. Review copy bởi Product/Tech Lead.
5. Thêm test/grep để phát hiện mock không nhãn.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- `rg -n "MOCK_|mock|demo|placeholder|TODO" src docs`
- Test `/records`, `/medication`, fallback hospital khi API lỗi.
- Review screenshot production copy.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Product owner + Senior FE + Tech Lead
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu demo y tế có thể bị hiểu là dữ liệu/chẩn đoán thật.

#### Độ ưu tiên xử lý

P0 - xử lý trước hoặc chặn release.

### R04. Auth token lưu trong localStorage

#### Mức độ

**High**

#### Khu vực ảnh hưởng

Auth/session/security

#### Mô tả rủi ro

Nếu có XSS, token trong localStorage có thể bị lấy. Logout/401 không nhất quán có thể giữ phiên cũ.

#### File/thư mục cần kiểm tra

`src/services/apiClient.js`, `logoutService.js`, auth service, access router, storage helpers.

#### Dấu hiệu nhận biết

- `medimate.auth` chứa token trong localStorage.
- 401 không clear session hoặc UI silent fail.
- Logout phụ thuộc API success mới clear local state.
- SessionStorage còn dữ liệu flow nhạy cảm sau logout.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Centralize clear auth/session.
2. Clear token khi expired/401/logout.
3. Không log token/auth object.
4. CSP và sanitize input.
5. Đánh giá chuyển sang httpOnly secure cookie nếu backend hỗ trợ.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Test logout khi API logout fail.
- Test token expired local.
- Test 401 từ API private.
- Inspect localStorage/sessionStorage sau logout.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Senior FE + Backend Auth owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Không nhất thiết chặn release nếu đã có mitigation, nhưng chặn nếu logout/401 giữ token sai.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R05. AdminWorkspacePage quá lớn

#### Mức độ

**High**

#### Khu vực ảnh hưởng

Admin CRUD, maintainability

#### Mô tả rủi ro

Một thay đổi nhỏ dễ gây regression nhiều section, reviewer khó kiểm soát, onboarding chậm, merge conflict cao.

#### File/thư mục cần kiểm tra

`src/pages/AdminWorkspacePage.jsx`, `components/admin*`, `services/*admin/domain*`, admin E2E specs.

#### Dấu hiệu nhận biết

- File > 2.000 dòng.
- Nhiều domain CRUD trong một component.
- Nhiều state/modal/table/form/handler không liên quan cùng file.
- PR admin thường rất lớn.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Tách từng section theo thứ tự rủi ro thấp đến cao.
2. Tạo hook riêng cho state/API từng section.
3. Giữ selector và behavior khi move.
4. Không đổi API/UI copy trong PR tách file.
5. Chạy admin spec theo section.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Admin overview smoke.
- `admin-ai-configs.spec.js`, `admin-doctors.spec.js`, `admin-users.spec.js`, `admin-facilities.spec.js` tùy section.
- Lint/build và manual CRUD.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: FE Admin owner + Senior FE reviewer
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Không chặn release hiện tại nếu app ổn, nhưng chặn PR admin lớn không thể review.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R06. CSS global quá lớn

#### Mức độ

**High**

#### Khu vực ảnh hưởng

CSS/design system/UI regression

#### Mô tả rủi ro

Sửa một selector có thể phá nhiều route. Global tiếp tục phình khiến UI khó kiểm soát.

#### File/thư mục cần kiểm tra

`src/styles/global.css`, `operator-workspace.css`, `user-workspace.css`, `components/ui/ui.css`, feature CSS.

#### Dấu hiệu nhận biết

- Global CSS tăng sau mỗi PR.
- Class quá chung như `.card`, `.title`, `.section`.
- Dùng `!important` để chữa nhanh.
- Visual regression không có evidence.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Freeze thêm CSS feature-specific vào global.
2. Tách tokens/base/layout/utilities/feature CSS.
3. Move selector theo cụm, không đổi class cùng lúc nếu không cần.
4. Thiết lập visual/a11y evidence cho PR UI lớn.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Visual smoke các route chính.
- Manual desktop/mobile.
- Keyboard focus check.
- `rg` selector trước khi xóa.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: UI owner + Senior FE
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR nếu thêm CSS global lớn không có lý do/evidence.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R07. API error handling inconsistent

#### Mức độ

**High**

#### Khu vực ảnh hưởng

API layer, UX reliability

#### Mô tả rủi ro

Mỗi page hiển thị lỗi khác nhau, có thể crash hoặc hiện `[object Object]`, user không biết retry.

#### File/thư mục cần kiểm tra

`apiClient.js`, domain services, hooks/pages gọi API, shared UI state components.

#### Dấu hiệu nhận biết

- Page tự parse error response.
- Raw stack/object hiện trên UI.
- Không có empty/loading/error state.
- 401/403/network timeout không có xử lý chung.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Chuẩn hóa ApiError shape.
2. Tạo helper format error message.
3. Tạo reusable Loading/Error/Empty pattern.
4. Dịch normalize response vào service/model.
5. Test network/validation/unauthorized cases.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Mock API validation error object.
- Mock network fail/timeout.
- Mock 401/403.
- Manual retry trên flow quan trọng.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: FE API owner + Tech Lead
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR API mới nếu thiếu loading/error/empty hoặc tự parse lỗi trong UI.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R08. Premium/role gate thiếu test edge cases

#### Mức độ

**High**

#### Khu vực ảnh hưởng

Routing/access/auth

#### Mô tả rủi ro

Bypass admin/premium, redirect loop login/pricing, alias bỏ qua access, sai workspace theo role.

#### File/thư mục cần kiểm tra

`src/router/routes.js`, `src/router/access.js`, `utils/roles.js`, route/access tests.

#### Dấu hiệu nhận biết

- Route mới không có access rõ.
- Alias thêm nhưng không test.
- Premium route vào được khi non-premium.
- Staff/patient thấy admin route.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Lập access matrix public/auth/premium/role.
2. Test alias và returnTo.
3. Không thêm route ngoài metadata.
4. Review route changes bởi owner.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- E2E route matrix.
- Unit test role helper.
- Manual unknown route/private route chưa login.
- Test `/admin` alias.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Routing owner + Senior FE
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu có admin/premium bypass hoặc redirect loop.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R09. Payment status edge cases

#### Mức độ

**High**

#### Khu vực ảnh hưởng

Pricing/payment/subscription

#### Mô tả rủi ro

User thanh toán nhưng không nhận quyền, cancel nhưng UI báo thành công, pending bị hiểu nhầm, support khó xử lý.

#### File/thư mục cần kiểm tra

`PricingPage.jsx`, `PaymentResultPage.jsx`, subscription/payment services, payment E2E specs.

#### Dấu hiệu nhận biết

- Chỉ test happy path.
- Missing orderCode không có UI rõ.
- Pending/fail/cancel dùng cùng message.
- Premium state không refresh sau return.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Tạo status resolver rõ.
2. Fixture success/pending/cancel/fail/missing orderCode.
3. Retry/polling có giới hạn nếu cần.
4. Sync subscription sau return.
5. Support copy rõ next step.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- `payments.spec.js`, `payment-results.spec.js`.
- Mock provider statuses.
- Manual refresh trang return/cancel.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Payment FE owner + Backend Payment owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu release đụng payment và chưa test các trạng thái tiền.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R10. Symptom analysis empty questions/error

#### Mức độ

**High**

#### Khu vực ảnh hưởng

Symptom analysis/medical safety

#### Mô tả rủi ro

Flow kẹt hoặc user hiểu nhầm không có rủi ro khi backend trả `questions: []` hoặc lỗi.

#### File/thư mục cần kiểm tra

`SymptomAnalysisPage.jsx`, `symptomAnalysisService.js`, clinical question components/hooks.

#### Dấu hiệu nhận biết

- Không có state riêng cho questions rỗng.
- Copy kết luận quá chắc chắn.
- API fail dẫn đến blank/error kỹ thuật.
- Không có emergency copy.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Thêm empty state an toàn.
2. Không kết luận y tế khi thiếu dữ liệu.
3. Emergency guidance cho triệu chứng nặng.
4. Tách flow thành hook để test.
5. Không log raw symptoms không cần thiết.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Mock `questions: []`.
- Mock timeout/error.
- Test input quá ngắn.
- Manual severe symptoms copy.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Symptom FE owner + Product/clinical reviewer nếu có
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn release nếu flow có thể gây hiểu nhầm y tế nghiêm trọng.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R11. Map/location fallback chưa đủ cứng

#### Mức độ

**Medium-High**

#### Khu vực ảnh hưởng

Map, facility, location permission

#### Mô tả rủi ro

Map crash/chậm, không có fallback khi permission denied, facility thiếu tọa độ làm UI lỗi.

#### File/thư mục cần kiểm tra

`NearbyClinicPage.jsx`, map components, facility services, facility DTO/model.

#### Dấu hiệu nhận biết

- Page map chứa quá nhiều state.
- Không handle permission denied.
- Facility thiếu lat/lng vẫn render marker.
- Map library vào bundle route không dùng.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Tách map/list/review state.
2. Validate coordinates trước render.
3. Fallback list khi map lỗi.
4. Lazy load map libs.
5. Empty/loading/error rõ.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Deny geolocation.
- Facility thiếu tọa độ.
- Slow map/network.
- Bundle inspection map lib.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Map FE owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn nếu map crash toàn app; không chặn nếu fallback rõ và feature không critical.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R12. Static content stale/overclaim

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

StaticPage/content/product copy

#### Mô tả rủi ro

Trang tĩnh cam kết vượt capability thật, roadmap/status không đúng, gây hiểu nhầm cho user/PM/sales.

#### File/thư mục cần kiểm tra

`StaticPage.jsx`, landing copy, product docs.

#### Dấu hiệu nhận biết

- Nhiều content dài trong JSX.
- Không có owner nội dung.
- Copy nói đã có capability chưa hoàn thiện.
- Legal/privacy/support copy chưa review.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Tách content data khỏi JSX.
2. Gán owner cho từng nhóm content.
3. Review copy trước release.
4. Đánh dấu beta/demo/coming soon rõ.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Content review checklist.
- Smoke các static routes.
- Search từ khóa overclaim.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Product owner + FE content owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn nếu copy y tế/pháp lý gây hiểu nhầm lớn.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R13. Thiếu unit/integration test

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Testing pyramid

#### Mô tả rủi ro

E2E chậm và khó pinpoint lỗi; logic normalize/role/payment/symptom có thể sai mà khó phát hiện sớm.

#### File/thư mục cần kiểm tra

`utils/*`, `services/*`, hooks feature, model normalizers.

#### Dấu hiệu nhận biết

- Test chủ yếu là E2E.
- Helper quan trọng không có unit test.
- Service error/pagination/auth header không được mock test.
- Regression nhỏ chỉ phát hiện bằng manual.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Thêm unit test cho role/premium/profile/payment status.
2. Integration test service với mock fetch.
3. Không cố test mọi thứ bằng E2E.
4. Đưa test vào PR mapping.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Unit test helpers.
- Mock fetch service tests.
- E2E smoke cho flow chính.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: QA/FE testing owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Không chặn release chung, nhưng chặn PR đổi logic quan trọng không có test/evidence.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R14. React canary dependency

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Dependencies/runtime

#### Mô tả rủi ro

Phiên bản canary có thể thay đổi behavior, plugin/lib chưa tương thích, upgrade regression khó đoán.

#### File/thư mục cần kiểm tra

`package.json`, lockfile, React entry, test pipeline.

#### Dấu hiệu nhận biết

- Dùng React canary trong product app.
- Upgrade dependency không có regression test.
- Package lock thay đổi lớn trong PR không liên quan.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Lock version rõ.
2. Chỉ upgrade trong PR riêng.
3. Chạy full route/a11y/visual/performance khi upgrade.
4. ADR hoặc note lý do dùng canary.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Full build/lint.
- Route/a11y/visual smoke.
- Manual critical flow.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Tech Lead
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR dependency lớn nếu không có test/evidence.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R15. Không có import boundary enforcement

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Architecture/process

#### Mô tả rủi ro

Feature-first migration dễ bị phá; shared import ngược feature; UI primitive biết domain/API.

#### File/thư mục cần kiểm tra

ESLint config, aliases, `src/features`, `src/shared`, `src/app`, old `src/components/services/pages`.

#### Dấu hiệu nhận biết

- Shared/ui import service.
- Feature A import sâu internal của Feature B.
- Services import React component.
- Relative import `../../../` phức tạp.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Định nghĩa boundary rules trong docs.
2. Thêm path alias `@`.
3. Thêm ESLint import/no-restricted-paths khi folder ổn.
4. Public API qua `index.js` feature.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Lint boundary rule.
- Code review import changes.
- Grep import ngược layer.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Tech Lead + Architecture owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR nếu import sai layer ở vùng đã có quy ước rõ.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R16. Docs có thể stale

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Documentation/governance

#### Mô tả rủi ro

Nhân viên mới follow docs sai, reviewer tiêu chuẩn không nhất quán, kiến thức chỉ nằm trong đầu senior.

#### File/thư mục cần kiểm tra

`docs/*`, README, checklist, PR template, ADR.

#### Dấu hiệu nhận biết

- Docs mô tả route/API cũ.
- PR đổi route/API không update docs.
- Developer hỏi cùng câu nhiều lần.
- Checklist không còn khớp code.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Docs update rule khi đổi route/API/auth/env/architecture.
2. Owner review docs.
3. Sprint docs audit định kỳ.
4. Docs version và affected docs trong PR.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Docs review checklist.
- Compare route/API source với docs.
- Onboarding dry-run.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Tech Lead + Docs owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn nếu docs sai có thể dẫn tới deploy/auth/API sai.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R17. PII/medical data logging

#### Mức độ

**High nếu xảy ra**

#### Khu vực ảnh hưởng

Privacy/security/observability

#### Mô tả rủi ro

Lộ dữ liệu triệu chứng/hồ sơ/token qua console, error tracking, screenshot hoặc logs.

#### File/thư mục cần kiểm tra

Toàn app, đặc biệt symptom/profile/auth/API error handling.

#### Dấu hiệu nhận biết

- `console.log` response auth/symptom/profile.
- Error tracking gửi payload raw.
- PR evidence screenshot chứa data thật.
- Log token/header/user profile.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. No-log policy.
2. Sanitize error logs.
3. Grep console trước PR.
4. Dùng fake/test data trong evidence.
5. Không log raw symptoms trừ khi backend có policy rõ.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- `rg -n "console\.(log|debug|info|warn|error)" src`
- Review error tracking config.
- Inspect PR screenshots/evidence.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Security-aware reviewer + Senior FE
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR nếu log chứa token/PII/medical data.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.

### R18. Facility coordinates/data shape không ổn

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Facility/admin/map/data contract

#### Mô tả rủi ro

Map marker sai, form facility lưu lat/lng lỗi, gợi ý cơ sở y tế không chính xác hoặc UI crash.

#### File/thư mục cần kiểm tra

facility services, admin facilities section, `NearbyClinicPage.jsx`, DTO normalizers.

#### Dấu hiệu nhận biết

- Latitude/longitude có nhiều tên field khác nhau.
- Không validate number range.
- Facility active nhưng thiếu tọa độ.
- UI render khi object null.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Normalize facility DTO.
2. Validate lat/lng range.
3. Fallback list nếu tọa độ thiếu.
4. Admin form error rõ.
5. Contract docs với backend.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Unit normalize facility.
- Admin facility create/update invalid coordinates.
- Map with missing coordinates.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Facility FE owner + Backend facility owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn nếu map/facility release mới hiển thị dữ liệu sai nghiêm trọng.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R19. Profile update partial failure

#### Mức độ

**Medium**

#### Khu vực ảnh hưởng

Profile setup/user data

#### Mô tả rủi ro

Update user thành công nhưng patient profile lỗi hoặc ngược lại, user rơi vào state setup lặp lại.

#### File/thư mục cần kiểm tra

profile pages, patient profile service, authApi.me, profile setup flow.

#### Dấu hiệu nhận biết

- Flow gọi nhiều API liên tiếp không rollback/notify rõ.
- Sau lỗi UI vẫn báo thành công.
- Profile setup redirect loop.
- Không phân biệt user profile và patient profile.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. Tách state từng bước.
2. Message partial failure rõ.
3. Retry/save again không mất input.
4. Sync auth/profile sau save.
5. Backend transaction nếu có thể.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Mock update user success + profile fail.
- Mock profile success + auth refresh fail.
- Redirect after save.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: Profile FE owner + Backend user/profile owner
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Không chặn release nếu có message/retry rõ; chặn nếu gây mất dữ liệu hoặc loop.

#### Độ ưu tiên xử lý

P2/P3 - lên kế hoạch và xử lý theo roadmap.

### R20. Large PR refactor

#### Mức độ

**High process risk**

#### Khu vực ảnh hưởng

Team process/review quality

#### Mô tả rủi ro

Reviewer bỏ sót lỗi, conflict cao, rollback khó, behavior change lẫn refactor.

#### File/thư mục cần kiểm tra

Toàn repo, đặc biệt admin, CSS, route, API, auth.

#### Dấu hiệu nhận biết

- PR > 500 dòng logic hoặc > 12 file source.
- Một PR vừa move file, đổi UI, đổi API, đổi CSS.
- Commit message `update/fix all`.
- Không có out-of-scope.

#### Kịch bản lỗi thực tế

- Developer sửa nhanh hoặc thêm feature mới nhưng không kiểm tra boundary liên quan.
- PR được merge vì happy path chạy được, nhưng edge case production chưa được test.
- Khi release, lỗi không chỉ nằm ở UI mà lan sang bảo mật, dữ liệu, quyền truy cập hoặc niềm tin người dùng.
- Team phải hotfix trong áp lực cao vì không có owner, không có rollback note, không có evidence trước merge.

#### Phòng ngừa

1. PR size policy.
2. Tách behavior-preserving refactor và behavior change.
3. Template scope/out-of-scope/evidence.
4. Require owner review cho file nhạy cảm.

#### Cách xử lý khi đã phát hiện

1. Dừng merge/release nếu rủi ro đang ở mức chặn release.
2. Xác định commit hoặc PR tạo ra rủi ro.
3. Khoanh vùng file liên quan trong danh sách ở trên.
4. Ưu tiên mitigation ngắn hạn để bảo vệ user/production trước.
5. Tạo follow-up task cho giải pháp dài hạn nếu chưa thể xử lý hết trong một PR.
6. Ghi evidence vào PR hoặc incident note.

#### Acceptance criteria

- Rủi ro đã có owner rõ.
- Có bằng chứng kiểm tra trước/sau.
- Không còn dấu hiệu fail chính được liệt kê ở phần dấu hiệu nhận biết.
- Test hoặc manual evidence phù hợp với khu vực ảnh hưởng.
- Nếu chưa thể đóng hoàn toàn, phải có risk acceptance hợp lệ với deadline xử lý.

#### Cách kiểm tra

- Review PR diff size.
- Checklist PR.
- Require evidence.

#### Evidence cần đính kèm trong PR

- Command output hoặc screenshot terminal.
- Screenshot UI desktop/mobile nếu có thay đổi giao diện.
- Mô tả manual test cho edge case chưa có automation.
- Link test spec hoặc ticket follow-up.
- Ghi rõ môi trường kiểm tra: local, preview, staging hoặc production.

#### Owner và reviewer bắt buộc

- Owner chính: All developers + reviewers + Tech Lead
- Reviewer bắt buộc: người phụ trách module liên quan và tech lead nếu rủi ro thuộc auth, payment, env, AI, medical safety hoặc deploy.

#### Release gate

Chặn PR nếu reviewer không thể đánh giá an toàn.

#### Độ ưu tiên xử lý

P1 - xử lý trong sprint gần nhất nếu đang ảnh hưởng flow chính.


---

## 9. Roadmap xử lý rủi ro 4 tuần

### Tuần 1: Khóa rủi ro Critical

#### Mục tiêu

Đưa production surface về trạng thái không có rủi ro bảo mật/deploy/demo y tế nghiêm trọng.

#### Việc cần làm

| Task | Risk | Output |
| --- | --- | --- |
| Gỡ direct AI provider key/call khỏi frontend | R01 | Frontend chỉ gọi backend AI gateway |
| Tách env dev/staging/prod | R02 | Env matrix và không hard-code production IP |
| Inventory toàn bộ mock/demo | R03 | Bảng owner/action cho từng mock |
| Gắn nhãn hoặc ẩn records/medication | R03 | Không hiểu nhầm demo là thật |
| Grep console/token/PII | R17 | Không log dữ liệu nhạy cảm |

#### Test tối thiểu

```bash
npm run lint
npm run build
rg -n "VITE_.*KEY|ANTHROPIC|OPENAI|apiKey|x-api-key" src .env* dist vite.config.js vercel.json
rg -n "MOCK_|mock|demo|placeholder|TODO" src docs
rg -n "console\.(log|debug|info|warn|error)" src
```

### Tuần 2: Access, API, payment, symptom hardening

#### Mục tiêu

Đảm bảo các flow auth/role/premium/payment/symptom không fail theo edge case chính.

#### Việc cần làm

| Task | Risk | Output |
| --- | --- | --- |
| Test route alias/access/premium | R08 | Access matrix pass |
| Chuẩn hóa 401/403 handling | R04/R07 | Redirect/message rõ |
| Payment status fixtures | R09 | success/pending/cancel/fail/missing orderCode |
| Symptom empty/error state | R10 | Flow không kẹt, copy an toàn |
| API error UI pattern | R07 | Không còn `[object Object]`/raw stack |

### Tuần 3: Admin refactor phase 1

#### Mục tiêu

Giảm rủi ro lớn nhất về maintainability mà không đổi behavior.

#### Việc cần làm

| Task | Risk | Output |
| --- | --- | --- |
| Tách Admin overview | R05 | Section riêng, smoke pass |
| Tách Admin AI configs | R05 | Hook/section riêng, spec pass |
| Tách Admin doctors hoặc subscriptions | R05 | Pattern migration lặp lại được |
| PR size policy | R20 | PR nhỏ, review được |

### Tuần 4: CSS, map, dashboard phase 1

#### Mục tiêu

Bắt đầu giảm UI regression và tách các page user-facing lớn.

#### Việc cần làm

| Task | Risk | Output |
| --- | --- | --- |
| Freeze global CSS feature-specific | R06 | Rule review rõ |
| Audit CSS selectors | R06 | Danh sách cụm cần move |
| Tách một cụm CSS ít rủi ro | R06 | Visual evidence |
| Tách map/list hoặc dashboard intake hook | R11/R10 | Page nhỏ hơn, state rõ hơn |
| Unit test normalize/role/payment status | R13 | Test pyramid bắt đầu tăng |

---

## 10. Roadmap 90 ngày

### 30 ngày đầu

- Đóng hoặc giảm toàn bộ Critical risks.
- Có route/access/payment/symptom edge tests.
- AdminWorkspacePage bắt đầu giảm complexity.
- CSS global không tăng thêm.
- PR template và risk checklist được dùng trong review.

### 60 ngày

- Admin workspace tách được phần lớn section.
- API error/loading/empty state có pattern chung.
- Map/profile/facility DTO được harden.
- Unit/integration test cho role, payment status, DTO normalize.
- Docs update rule được áp dụng thật trong PR.

### 90 ngày

- Feature-first migration đi vào ổn định.
- Shared UI/API rõ boundary.
- Import boundary có lint hoặc review guard.
- Global CSS giảm rõ hoặc không còn là bottleneck chính.
- Release checklist có gate tự động tối thiểu.

---

## 11. Release gate checklist

Trước mỗi release, owner release phải điền:

| Gate | Pass/Fail | Evidence |
| --- | --- | --- |
| Không có secret/provider key trong frontend bundle |  |  |
| Production API dùng HTTPS/domain đúng môi trường |  |  |
| Không có demo/mock y tế không nhãn trên production surface |  |  |
| Auth/logout/401 không giữ session sai |  |  |
| Admin/staff/premium route không bypass |  |  |
| Payment return/cancel/pending/fail đúng nếu release liên quan payment |  |  |
| Symptom empty/error/emergency copy an toàn |  |  |
| Lint pass |  |  |
| Build pass |  |  |
| E2E liên quan pass hoặc có risk acceptance |  |  |
| Docs liên quan route/API/env/release đã cập nhật |  |  |

Nếu bất kỳ gate Critical fail, release phải dừng hoặc rollback kế hoạch.

---

## 12. Risk acceptance policy

### 12.1. Khi nào được chấp nhận tạm thời

Chỉ chấp nhận tạm thời rủi ro Medium/Low hoặc High đã có mitigation rõ nếu:

- Có owner cụ thể.
- Có deadline xử lý.
- Có mitigation ngắn hạn.
- Có mô tả impact nếu không xử lý ngay.
- Tech lead và PM đồng ý.
- Không liên quan secret, demo y tế không nhãn, access bypass, payment sai trạng thái hoặc production API sai môi trường.

### 12.2. Khi nào không được chấp nhận

Không dùng risk acceptance để bỏ qua:

- Secret/API key ở client.
- Production API sai môi trường.
- Demo/mock y tế gây hiểu nhầm.
- Admin/premium route bypass.
- Payment status sai trong release liên quan payment.
- Log token/PII/medical data.
- Lỗi symptom/AI có thể gây hiểu nhầm nguy hiểm.

### 12.3. Mẫu risk acceptance

```md
## Risk acceptance

Risk ID: R__
Mức độ: Medium/High
Lý do chưa xử lý ngay:
Mitigation tạm thời:
Owner:
Deadline xử lý:
Evidence đã kiểm tra:
Người duyệt: Tech Lead / PM
Điều kiện phải rollback nếu:
```

---

## 13. Incident response playbook

### 13.1. Lộ secret hoặc nghi ngờ lộ secret

1. Revoke/rotate key ngay trên provider.
2. Kiểm tra key có trong git history, env frontend, bundle, screenshot/log không.
3. Remove key khỏi frontend source và deploy env.
4. Chuyển flow qua backend gateway.
5. Deploy hotfix.
6. Thêm secret scan/grep vào checklist.
7. Ghi incident note nội bộ: thời điểm phát hiện, phạm vi ảnh hưởng, hành động đã làm, follow-up.

### 13.2. Deploy sai backend

1. Dừng release hoặc rollback deployment.
2. Kiểm tra network của production/preview.
3. Xác định có user/data bị ảnh hưởng không.
4. Sửa env platform hoặc rewrite.
5. Xóa hard-code trong source nếu có.
6. Thêm env matrix vào release checklist.
7. Review lại Vercel/Vite config.

### 13.3. Demo y tế bị hiểu nhầm

1. Ẩn route/nav hoặc thêm banner warning ngay.
2. Review toàn bộ CTA dẫn vào capability.
3. Review copy của page và landing.
4. Kiểm tra screenshot production.
5. Tạo policy demo capability.
6. Thêm test/grep nếu có thể.

### 13.4. Auth/admin/premium bypass

1. Tắt route/nav nếu có feature flag hoặc rollback.
2. Xác định route metadata/access logic/alias gây lỗi.
3. Viết test tái hiện bypass.
4. Fix access logic.
5. Kiểm tra public/auth/premium/role matrix.
6. Deploy hotfix và ghi incident.

### 13.5. Payment sai trạng thái

1. Không tự chỉnh dữ liệu user nếu chưa đối soát backend/provider.
2. Thu thập orderCode, userId, provider status, frontend status.
3. Xác định lỗi mapping UI hay backend.
4. Sửa mapping/status resolver nếu lỗi frontend.
5. Thêm fixture regression.
6. Cập nhật support script cho user bị ảnh hưởng.

### 13.6. Log PII/medical data

1. Xóa hoặc sanitize log ngay.
2. Kiểm tra console, error tracking, screenshots, CI logs.
3. Nếu đã gửi tới bên thứ ba, đánh giá phạm vi và retention.
4. Thêm grep rule hoặc review checklist.
5. Cập nhật no-log policy.

---

## 14. Risk burn-down tracking

Mỗi sprint nên có bảng burn-down:

| Sprint | Risk ID | Trạng thái trước | Hành động | Trạng thái sau | Evidence | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Sprint N | R01 | Critical/Open | Remove client key, backend gateway | Closed | PR link, grep output | Tech Lead |
| Sprint N | R05 | High/Open | Extract AI configs section | Reduced | Spec pass, diff link | FE Admin owner |
| Sprint N | R06 | High/Open | CSS audit + freeze global | Reduced | Audit doc | UI owner |

### Quy tắc cập nhật trạng thái

| Status | Ý nghĩa |
| --- | --- |
| Open | Chưa xử lý hoặc chưa có owner |
| Mitigated | Có biện pháp tạm thời, risk vẫn còn |
| Reduced | Đã giảm mức độ hoặc phạm vi ảnh hưởng |
| Closed | Đã xử lý đủ acceptance criteria |
| Accepted | Được chấp nhận tạm thời theo policy |
| Reopened | Risk xuất hiện lại hoặc mitigation không đủ |

Không đánh dấu **Closed** nếu chỉ viết docs mà chưa sửa code/guardrail tương ứng, trừ khi risk đó là docs/process thuần túy.

---

## 15. PR review checklist theo rủi ro

Reviewer nên copy checklist này vào PR lớn:

```md
## Risk review

- [ ] PR không thêm secret/API key/token.
- [ ] PR không log PII/medical data.
- [ ] PR không thêm mock/demo không nhãn.
- [ ] PR không bypass API layer.
- [ ] PR không đổi route/access/premium ngoài scope.
- [ ] PR không đổi payment behavior nếu không có test.
- [ ] PR có loading/error/empty state nếu gọi API.
- [ ] PR không làm CSS global phình không kiểm soát.
- [ ] PR có test/evidence phù hợp.
- [ ] PR có docs update nếu đổi route/API/env/architecture.
```

---

## 16. Checklist theo vai trò

### 16.1. Developer

Trước khi mở PR:

- Xác định PR có đụng risk ID nào không.
- Ghi rõ scope/out-of-scope.
- Chạy lint/build.
- Chạy test liên quan.
- Đính kèm evidence.
- Không tự đánh dấu risk closed nếu chưa đủ acceptance criteria.

### 16.2. Reviewer

Khi review:

- Xác định rủi ro thuộc nhóm nào.
- Yêu cầu owner đúng nếu đụng vùng nhạy cảm.
- Không approve PR quá lớn hoặc thiếu evidence.
- Không cho bypass policy vì “chỉ sửa nhanh”.
- Ghi follow-up risk nếu phát hiện vấn đề ngoài scope.

### 16.3. Tech Lead

Mỗi sprint:

- Chọn risk P0/P1 vào backlog.
- Kiểm tra burn-down.
- Cập nhật release gate.
- Quyết định risk acceptance nếu thật sự cần.
- Đảm bảo docs/code/test cùng tiến.

### 16.4. PM/Founder

Khi hỏi tiến độ:

- Hỏi theo risk outcome, không chỉ hỏi “đã refactor xong chưa”.
- Ưu tiên production trust trước UI cleanup.
- Không ép release nếu Critical gate fail.
- Ghi nhận trade-off khi chấp nhận risk Medium/High.

---

## 17. Lệnh kiểm tra hữu ích

### 17.1. Secret/env scan

```bash
rg -n "VITE_.*KEY|ANTHROPIC|OPENAI|apiKey|x-api-key|Bearer\s+[A-Za-z0-9._-]+" src .env* vite.config.js vercel.json dist
```

### 17.2. Hard-code backend/IP/HTTP

```bash
rg -n "http://|\b\d{1,3}(\.\d{1,3}){3}\b" src .env* vite.config.js vercel.json docs
```

### 17.3. Mock/demo inventory

```bash
rg -n "MOCK_|mock|demo|placeholder|TODO|fake" src docs
```

### 17.4. Direct API call trong UI

```bash
rg -n "fetch\(|axios\.|XMLHttpRequest" src/pages src/components src/features
```

### 17.5. Console log audit

```bash
rg -n "console\.(log|debug|info|warn|error)" src
```

### 17.6. Route/access related files

```bash
rg -n "access:|roles:|premium|admin|staff|returnTo|alias" src/router src/utils src/App.jsx
```

---

## 18. Definition of Done cho việc đóng rủi ro

Một risk được xem là đóng khi:

1. Root cause đã được xử lý hoặc được loại khỏi production surface.
2. Có test hoặc evidence chứng minh.
3. Không còn dấu hiệu fail chính.
4. Owner và reviewer đồng ý.
5. Docs/checklist liên quan được cập nhật nếu risk ảnh hưởng quy trình.
6. Nếu là security/payment/access, có regression guard tối thiểu.
7. Nếu là demo/medical safety, copy production đã được review.

---

## 19. Kết luận

Thứ tự đúng cho MediMate AI frontend là:

```txt
Security / Env / Medical safety / Access / Payment
  -> API reliability
  -> Page and CSS maintainability
  -> Testing pyramid
  -> Feature-first migration and process maturity
```

Nếu team chỉ tập trung tách folder, đổi CSS hoặc “làm code đẹp hơn” trong khi secret, env, demo y tế, access và payment vẫn còn rủi ro, repo có thể nhìn chuyên nghiệp hơn nhưng chưa thật sự sẵn sàng vận hành chuyên nghiệp.

Tài liệu này nên được cập nhật mỗi khi:

- xuất hiện risk mới;
- risk được giảm/đóng;
- release gate thay đổi;
- route/API/auth/payment/env/AI capability thay đổi;
- có incident hoặc near-miss.
