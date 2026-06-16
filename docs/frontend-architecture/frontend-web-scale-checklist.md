# Frontend feature-first checklist

Ngay quet: **2026-06-17**

Nguon quet:

- Swagger live: `http://52.77.210.243:8080/swagger/v1/swagger.json`
- `src/services/endpoints.js`
- `src/services/*Service.js`
- `src/pages/*`, `src/components/*`, `tests/e2e/*`
- Tai lieu backend: `docs/backend/backlog.md`, `docs/backend/contract-status.md`

Ket qua quet API moi nhat:

- Swagger live hien co **62 path**.
- Frontend da khai bao phan lon API san pham trong `ENDPOINTS`.
- Frontend chua co nhom `icd-chapters` trong `ENDPOINTS` va service rieng.
- Frontend da co `ENDPOINTS.CLINICAL_QUESTIONS.BULK`, nhung `clinicalQuestionsApi` chua expose ham `bulk`.
- Frontend con `ENDPOINTS.SYMPTOM_ANALYSIS.ANALYZE = /api/symptom-analysis/analyze`, nhung Swagger live khong con path nay.
- PayOS `return`, `cancel`, `webhook` la backend/callback surface. Frontend chi duoc doc ket qua qua API status da xac minh.

## Thu tu uu tien thuc thi

Team frontend lam theo thu tu nay:

1. **Phat trien tinh nang truoc:** hoan thien cac luong nguoi dung/Admin dang can de san pham chay duoc bang API that.
2. **Fix bug tiep theo:** sua cac loi contract, du lieu map, endpoint cu, state sai va case production co the gay hong luong.
3. **Cai thien va toi uu cuoi cung:** tach kien truc, cache, hieu nang, accessibility va test coverage rong hon.

Nguyen tac quan trong: truoc khi yeu cau backend them API, frontend phai kiem tra API hien co trong Swagger va service hien tai. Neu backend thieu field hoac endpoint that su, ghi ro vao `docs/backend/backlog.md` hoac `docs/backend/contract-status.md`.

## Quy uoc trang thai

- `[ ]` Chua bat dau.
- `[-]` Dang lam hoac bi chan mot phan.
- `[x]` Da hoan thanh va co test/tai lieu kem theo.
- `[BE]` Phu thuoc backend; phai co note trong `docs/backend`.

## API coverage matrix

| Nhom API | Swagger live | Frontend hien tai | Huong xu ly |
|---|---|---|---|
| Authentication | register, login, Google, refresh, logout, forgot/change password, register staff, approve staff | Da co service va UI auth/admin | Giu; bo sung error mapping khi backend co error envelope |
| Users | list, me, update, delete | Da co `usersApi`, profile/admin dung | Giu; khong luu PII vao storage |
| Patient profiles | list, get, create, update, delete | Da co service; dung profile/setup | Hoan thien test update/delete neu Product cho phep |
| Medical departments | list, get, create, update, delete | Da dung o Admin/Staff/Dashboard | Hoan thien edit/delete/status conflict UI |
| ICD chapters | list, get, create, update, delete, bulk | Chua co endpoint/service FE | Tao service va UI neu Product can quan tri ICD |
| Clinical questions | list, get, create, update, delete, bulk | Co list/get; chua expose bulk | Them service bulk va UI import neu Admin can |
| Medical facilities | list, active, get, create, update, status, delete | Service du; Admin da gui toa do khi tao; map dung active | Hoan thien edit/status/delete va map readiness |
| Facility departments | active | Dung cho Doctor/invitation | [BE] Thieu CRUD/status; FE chi dung active list hop le |
| Doctors | list, active, get, create, update, status, delete | Service va Admin Doctors da dung | Hoan thien public directory/Doctor workspace khi co scope |
| Doctor invitations | create, revoke, validate, register | Da dung | [BE] Thieu list/filter/resend |
| Feedback reviews | list, by facility, create, update, status, delete | Map dung by facility/create; service du | Tao moderation queue |
| Subscription plans | list, active, get, create, update, status, delete | Pricing/Admin da dung | Chuan hoa plan form va entitlement display |
| User subscriptions | checkout, me, get, cancel | Pricing/payment/profile dung mot phan | Hoan thien lich su goi va huy goi |
| Payments | get, payos-status, return/cancel/webhook | FE dung status/get; callback backend-only | Khong goi webhook tu FE |
| AI configs | list, active, by task type, get, create, update, status, delete | Admin CRUD da co | Them active/by-task-type visibility |
| Web chatbot | message | Landing/symptom chat dung | Giu backend la AI gateway duy nhat |
| Symptom analysis | suggest questions, submit answers, my sessions, get by session | Service da co; UI dung suggest/submit | Them history/detail va don endpoint legacy |

## P0 - Phat trien tinh nang

### FE-FEATURE-001 - Hoan thien quan tri co so y te va du lieu ban do

Muc tieu: Admin co the nhap, sua, bat/tat va quan ly co so y te mien Nam bang API hien co. Map co du du lieu de hien marker khi backend tra toa do hop le.

API phai dung:

- `GET /api/medical-facilities`
- `GET /api/medical-facilities/active`
- `GET /api/medical-facilities/{id}`
- `POST /api/medical-facilities`
- `PUT /api/medical-facilities/{id}`
- `PATCH /api/medical-facilities/{id}/status`
- `DELETE /api/medical-facilities/{id}`
- `GET /api/medical-departments`
- `GET /api/facility-departments/active`

Checklist:

- [x] Admin tao facility co gui `latitude` va `longitude`.
- [x] Hien thi toa do trong danh sach facility Admin.
- [x] Hien badge ro rang: `Du du lieu ban do` khi co toa do hop le, `Thieu toa do` khi `latitude`/`longitude` null hoac ngoai bien.
- [x] Them edit facility dung `PUT /api/medical-facilities/{id}`.
- [x] Form tao/sua gom day du field backend dang co: `facilityName`, `address`, `latitude`, `longitude`, `phone`, `website`, `openingHours`, `facilityType`, `isActive`, `departmentIds`.
- [x] Them bat/tat facility dung `PATCH /api/medical-facilities/{id}/status`.
- [x] Them delete/inactive action dung `DELETE /api/medical-facilities/{id}` voi confirm va error conflict ro.
- [x] Sau moi mutation, refetch management list va neu dang o map thi refetch public active data.
- [ ] Khong yeu cau backend nhap tay toan bo database truoc MVP. Admin UI phai cho phep nhap tung facility va thong tin chi tiet.

Test:

- [x] E2E tao facility co toa do va assert payload.
- [x] E2E sua facility va assert `PUT` payload.
- [x] E2E bat/tat facility va assert `PATCH` payload.
- [x] E2E xoa facility va assert `DELETE` request.
- [ ] E2E map chi hien marker khi facility active co toa do hop le.

Backend note neu thieu:

- [BE] `POST/PUT /api/medical-facilities` phai luu va tra lai dung `latitude`/`longitude`.
- [BE] `/api/medical-facilities/active` phai tra facility active co toa do de map co marker.
- [BE] Neu `departmentIds` khong duoc luu, backend can sua mapper/entity hoac cung cap facility-department management API.

### FE-FEATURE-002 - Hoan thien map discovery MVP bang API that

Muc tieu: `/map` la man hinh tim co so y te that, khong phu thuoc mock khi backend da co facility active va review API.

API phai dung:

- `GET /api/medical-facilities/active`
- `GET /api/feedback-reviews/facility/{facilityId}`
- `POST /api/feedback-reviews`
- `GET /api/medical-departments`
- `GET /api/facility-departments/active`

Checklist:

- [x] Xoa phu thuoc production vao `hospitalRecommendations.js` cho danh sach benh vien neu backend active data da co.
- [x] Map doc facility active tu backend va normalize tai service/boundary.
- [x] Marker chi render khi `latitude` va `longitude` la so hop le.
- [x] List ben canh map van hien facility thieu toa do, nhung gan nhan `Chua co toa do`.
- [x] Search theo ten/dia chi/chuyen khoa tren tap du lieu active hien co trong FE cho MVP.
- [x] Detail panel hien `facilityName`, `address`, `phone`, `website`, `openingHours`, `facilityType`, departments va review.
- [x] Review form dung `POST /api/feedback-reviews`, co loading, disabled double submit va error state.
- [x] Khi backend khong tra facility nao co toa do, UI hien thong bao van hanh: can Admin cap nhat toa do, khong noi map bi loi frontend.
- [x] Khong hard-code danh sach benh vien mien Nam trong component/page.

Test:

- [x] E2E mock active facilities co/khong co toa do.
- [x] E2E search map theo ten facility va chuyen khoa.
- [ ] E2E review create thanh cong/that bai.
- [ ] Accessibility: co danh sach text thay the cho thong tin ban do.

Backend note neu thieu:

- [BE] Can endpoint search/pagination theo `keyword`, `departmentId`, `facilityType`, `latitude`, `longitude`, `radiusKm`, `sort=distance` cho ban map ban day du.
- [BE] Can aggregate `averageRating`, `reviewCount` de FE khong tinh tu tung trang review.

### FE-FEATURE-003 - Hoan thien luong phan tich trieu chung va lich su

Muc tieu: User nhap trieu chung, tra loi cau hoi lam sang, xem ket qua, xem lai lich su va chuyen sang map bang API symptom-analysis that.

API phai dung:

- `POST /api/symptom-analysis/suggest-clinical-questions`
- `POST /api/symptom-analysis/submit-clinical-question-answers`
- `GET /api/symptom-analysis/my-sessions`
- `GET /api/symptom-analysis/{sessionId}`
- `GET /api/medical-facilities/active`

Checklist:

- [ ] UI buoc 1 dung `suggest-clinical-questions`.
- [ ] UI buoc 2 dung `submit-clinical-question-answers`.
- [ ] Dashboard hien lich su gan day bang `my-sessions`.
- [ ] Man hinh detail mo lai ket qua bang `GET /api/symptom-analysis/{sessionId}`.
- [ ] Handoff sang `/map` dung department/facility duoc backend goi y neu co.
- [ ] Neu backend chi tra department, map search theo `departmentName` va hien ro day la goi y dinh huong.
- [ ] Khong hien chan doan nhu ket luan y khoa chac chan.
- [ ] Khong log noi dung trieu chung, cau tra loi lam sang hoac ket qua AI trong console/test output.

Test:

- [ ] E2E full flow suggest -> submit -> result.
- [ ] E2E empty questions va AI timeout.
- [ ] E2E history list va detail.

Backend note neu thieu:

- [BE] `my-sessions` nen tra `inputPreview` thay vi raw `inputText` day du.
- [BE] Can error code rieng cho quota, AI timeout va session khong thuoc user.
- [BE] Facility recommendation can `facilityId`, `facilityName`, `latitude`, `longitude` neu muon handoff sang map.

### FE-FEATURE-004 - Hoan thien subscription, checkout va payment result

Muc tieu: User xem goi, checkout, xem ket qua thanh toan da xac minh, xem goi hien tai va huy goi.

API phai dung:

- `GET /api/subscription-plans/active`
- `POST /api/user-subscriptions/checkout`
- `GET /api/user-subscriptions/me`
- `GET /api/user-subscriptions/{id}`
- `POST /api/user-subscriptions/{id}/cancel`
- `GET /api/payments/payos-status/{orderCode}`
- `GET /api/payments/{id}`

Checklist:

- [ ] Pricing chi hien goi active tu backend.
- [ ] Checkout chi dung `checkout`; khong tu tinh amount/price o frontend.
- [ ] Payment result khong hien thanh cong chi vi URL return co query param.
- [ ] Payment result goi status API va hien state: pending, success, failed, cancelled, expired.
- [ ] Profile/account co danh sach subscription tu `me`.
- [ ] Huy goi dung `cancel`, co confirm va refetch subscription.
- [ ] Khong goi `payos-webhook`, `payos-return`, `payos-cancel` tu frontend nhu API san pham.

Test:

- [ ] E2E pricing active plans.
- [ ] E2E checkout payload.
- [ ] E2E payment result success/pending/failed.
- [ ] E2E cancel subscription.

Backend note neu thieu:

- [BE] Can capability/entitlement endpoint de FE khong tu suy luan Premium.
- [BE] Payment status can ownership/opaque reference de tranh doan order cua user khac.

### FE-FEATURE-005 - Them moderation queue cho feedback reviews

Muc tieu: Admin/Staff duyet, an, sua hoac xoa review theo policy backend.

API phai dung:

- `GET /api/feedback-reviews`
- `GET /api/feedback-reviews/facility/{facilityId}`
- `PUT /api/feedback-reviews/{id}`
- `PATCH /api/feedback-reviews/{id}/status`
- `DELETE /api/feedback-reviews/{id}`

Checklist:

- [ ] Tao view Admin/Staff `Reviews`.
- [ ] Table co filter facility, rating va status neu backend ho tro query.
- [ ] Action approve/reject/hide dung status API.
- [ ] Edit review chi bat neu Product cho phep va backend cho phep.
- [ ] Delete/hide co confirm va success/error state.
- [ ] Public map chi render review backend tra ve tu by-facility endpoint.
- [ ] UI khong tu quyet dinh moderation policy ngoai status backend.

Test:

- [ ] E2E list reviews.
- [ ] E2E change status.
- [ ] E2E delete/hide review.

Backend note neu thieu:

- [BE] Can chot review moi la `Pending` hay `Approved`.
- [BE] Can `reason` khi doi status neu can audit.
- [BE] Can scope Staff theo facility neu Staff duoc moderation.

### FE-FEATURE-006 - Quan tri ICD chapters va clinical questions

Muc tieu: Neu Product can van hanh du lieu lam sang, Admin co UI de xem, them, sua, xoa va import ICD/questions bang API hien co.

API phai dung:

- `GET /api/icd-chapters`
- `POST /api/icd-chapters`
- `GET /api/icd-chapters/{id}`
- `PUT /api/icd-chapters/{id}`
- `DELETE /api/icd-chapters/{id}`
- `POST /api/icd-chapters/bulk`
- `GET /api/clinical-questions`
- `POST /api/clinical-questions`
- `GET /api/clinical-questions/{id}`
- `PUT /api/clinical-questions/{id}`
- `DELETE /api/clinical-questions/{id}`
- `POST /api/clinical-questions/bulk`

Checklist:

- [ ] Them `ICD_CHAPTERS` vao `ENDPOINTS`.
- [ ] Tao `icdChapterService`.
- [ ] Bo sung `clinicalQuestionsApi.create/update/delete/bulk`.
- [ ] Tao Admin tab `Clinical data` neu Product xac nhan can van hanh tren UI.
- [ ] Bulk import co preview, validate row loi va confirm truoc khi submit.
- [ ] UI khong hien ICD nhu ket luan benh chac chan; chi la ma/phan loai tham khao.

Test:

- [ ] Service contract test cho ICD.
- [ ] Service contract test cho clinical questions bulk.
- [ ] E2E import happy path va row invalid.

Backend note neu thieu:

- [BE] Bulk response can tra so dong thanh cong, so dong loi va loi theo row.
- [BE] Can conflict code khi chapter/question trung ma hoac trung noi dung.

### FE-FEATURE-007 - Hoan thien Doctor va Staff operations

Muc tieu: Admin/Staff quan ly doctor, invitation va scope van hanh ro rang; Doctor workspace khong doc du lieu vuot quyen.

API phai dung:

- `GET /api/doctors`
- `GET /api/doctors/active`
- `POST /api/doctors`
- `PUT /api/doctors/{id}`
- `PATCH /api/doctors/{id}/status`
- `DELETE /api/doctors/{id}`
- `POST /api/admin/doctor-invitations`
- `POST /api/admin/doctor-invitations/{id}/revoke`
- `GET /api/doctor-invitations/validate`
- `POST /api/doctor-invitations/register`
- `GET /api/facility-departments/active`

Checklist:

- [ ] Giu Admin Doctors CRUD dang co va bo sung empty/error/loading ro cho tung action.
- [ ] Doctor create/edit chi cho chon `facilityDepartmentId` tu active list.
- [ ] Invitation create/revoke khong render raw token trong UI.
- [ ] Public register doctor validate token truoc khi submit.
- [ ] Doctor workspace chi hien du lieu account hien tai; khong quet `/api/doctors` de tu do profile.
- [ ] Khi backend co `GET /api/doctors/me`, dung endpoint nay cho Doctor workspace.

Test:

- [ ] E2E doctor create/edit/status/delete.
- [ ] E2E invitation validate/register.
- [ ] E2E Doctor role khong thay Admin CRUD.

Backend note neu thieu:

- [BE] Can `GET /api/doctors/me`.
- [BE] Can `GET /api/admin/doctor-invitations` va resend endpoint.
- [BE] Can resource scope cho Staff/Doctor.

### FE-FEATURE-008 - Hoan thien AI configuration visibility

Muc tieu: Admin khong chi CRUD AI config ma con biet config nao dang active cho task nao.

API phai dung:

- `GET /api/ai-configs`
- `GET /api/ai-configs/active`
- `GET /api/ai-configs/by-task-type/{taskType}`
- `POST /api/ai-configs`
- `PUT /api/ai-configs/{id}`
- `PATCH /api/ai-configs/{id}/status`
- `DELETE /api/ai-configs/{id}`

Checklist:

- [ ] Them panel `Active configs` dung `/active`.
- [ ] Them badge/check theo `by-task-type/{taskType}` trong detail hoac toolbar.
- [ ] Khi set active/inactive, refetch list, active list va task-type detail lien quan.
- [ ] Khong luu provider key, token hay secret AI trong frontend.
- [ ] Error AI config hien message an toan tu backend, khong lo noi dung secret.

Test:

- [ ] E2E list/create/edit/status/delete config.
- [ ] E2E active config panel.
- [ ] E2E by-task-type empty/not found.

## P1 - Fix bug va rui ro contract

### FE-BUG-001 - Don endpoint symptom legacy

- [ ] Xoa `ENDPOINTS.SYMPTOM_ANALYSIS.ANALYZE` neu khong con component nao dung.
- [ ] Neu can giu tuong thich tam thoi, them comment `legacy compatibility` va khong goi path `/analyze`.
- [ ] Doi moi call `analyze()` sang `suggestClinicalQuestions()` hoac flow 2 buoc that.
- [ ] Cap nhat test de fail khi service goi `/api/symptom-analysis/analyze`.

### FE-BUG-002 - Xu ly dung case backend tra toa do null

- [ ] Map khong crash khi `latitude` hoac `longitude` null/string/ngoai bien.
- [ ] Admin list hien ro facility thieu toa do.
- [ ] Khi live API tra `null`, UI ghi la du lieu chua du, khong ket luan frontend khong lam duoc map.
- [ ] Them test fixture facility co `latitude: null`, `longitude: null`.

### FE-BUG-003 - Loai mock production cho hospital recommendations

- [ ] Kiem tra tat ca import `hospitalRecommendations.js`.
- [ ] Neu con dung tren production route, chuyen sang backend active facilities.
- [ ] Chi giu mock trong test/dev voi ten ro rang.
- [ ] Them guard/test de production UI khong hien danh sach hospital hard-code.

### FE-BUG-004 - Chuan hoa error/loading cho mutation quan trong

- [ ] Auth, profile, symptom, payment, Admin CRUD co disabled double-submit.
- [ ] Error backend co `message/errors` duoc map thanh copy ngan gon.
- [ ] 401/403 dieu huong hoac hien permission state dung, khong retry vo han.
- [ ] Timeout AI/payment co retry co gioi han.

### FE-BUG-005 - Kiem tra storage va log thong tin nhay cam

- [ ] Khong luu trieu chung, cau tra loi lam sang, payment payload, invitation token vao localStorage/sessionStorage.
- [ ] Khong log user data, PHI, token, payment order code trong console.
- [ ] Test security storage cho auth/profile/symptom/payment.

## P2 - Cai thien va toi uu

### FE-IMPROVE-001 - Tach AdminWorkspace thanh feature modules

- [ ] Tach users, doctors, facilities, subscriptions, AI configs, invitations thanh component/module rieng.
- [ ] Page chi compose section, khong chua form logic lon.
- [ ] Moi feature co service/query/mutation helper rieng.
- [ ] Khong refactor dong loat neu chua co test cho feature dang tach.

### FE-IMPROVE-002 - Chuan hoa server state va cache

- [ ] Moi list co state key theo filter/page.
- [ ] Mutation thanh cong refetch/invalidate dung list/detail lien quan.
- [ ] Khong refetch trung `/users/me`, facilities va subscriptions trong cung navigation.
- [ ] Empty state, error state va permission state tach rieng.
- [ ] Spinner co timeout/fallback, khong quay vo han.

### FE-IMPROVE-003 - Nang cap form enterprise

- [ ] Moi form co label visible, helper text, field error va error summary.
- [ ] Field so co min/max/step ro: toa do, gia, duration, temperature, maxTokens.
- [ ] Destructive action co confirm va neu co the thi undo/recovery.
- [ ] Edit form giu data nguoi dung da nhap khi backend tra loi co the sua.
- [ ] Focus quay ve field loi dau tien sau submit that bai.

### FE-IMPROVE-004 - Accessibility hardening

- [ ] Keyboard-only pass cho auth, dashboard diagnosis, map, payment va Admin CRUD.
- [ ] Dialog/menu/dropdown trap focus dung, Escape dong, restore focus.
- [ ] Table co caption/scope; mobile card van hien ten field.
- [ ] Live region cho async status, submit result va validation summary.
- [ ] Test 200% zoom, reduced motion, forced colors va contrast AA.
- [ ] Icon-only button co accessible name.

### FE-IMPROVE-005 - Performance va bundle governance

- [ ] Lazy-load routes nang: map, admin, medical assistant, visual-heavy pages.
- [ ] Khong tai MapLibre ngoai `/map`.
- [ ] Ghi bundle baseline sau moi refactor lon.
- [ ] Giam request ban dau cua landing/auth/dashboard.
- [ ] Dung pagination server-side khi backend co, khong tai list lon ve browser.
- [ ] Test slow network cho auth, symptom, map va payment.

### FE-IMPROVE-006 - Regression suite chuan

- [ ] Contract test cho domain service quan trong.
- [ ] E2E cho auth, profile, diagnosis, map, payment, Admin facilities/doctors/subscriptions/AI configs.
- [ ] Visual test cho landing, login, dashboard, map, admin tables tren mobile/tablet/desktop.
- [ ] Accessibility test cho route chinh bang axe.
- [ ] Test production mock guard.
- [ ] Test security storage.

## Backend notes phai dong bo

Khi gap cac case duoi day, frontend khong tu va bang mock. Cap nhat backend docs:

- Backend co schema nhung response thuc te thieu field, vi du facility co `latitude`/`longitude` trong schema nhung live data la `null`.
- Backend co CRUD nhung public endpoint khong tra du lieu vua luu.
- Backend thieu endpoint van hanh: facility-departments CRUD, invitation list/resend, doctors/me.
- Backend tra loi loi khong co `code`, `fieldErrors`, `traceId`.
- Backend de frontend suy luan entitlement/quota/payment state.
- Backend thieu authorization/resource scope, khien FE chi co the an UI nhung khong bao ve du lieu.

## Definition of Done cho checklist nay

- [ ] File nay duoc cap nhat moi khi Swagger thay doi.
- [ ] `contract-status.md` ghi ngay quet, so path va gap backend moi.
- [ ] `ENDPOINTS` khong chua path chet ngoai Swagger neu khong co comment legacy.
- [ ] Moi API backend co trang thai su dung ro: `used`, `backend-only`, `planned`, hoac `blocked`.
- [ ] Moi task frontend co test tuong ung hoac ly do chua test.
- [ ] Feature P0 hoan thanh truoc khi chuyen sang P1/P2, tru khi co bug chan release.
