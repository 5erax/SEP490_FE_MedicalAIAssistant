# Screen flow, workflow and business rule checklist

Ngay cap nhat: **2026-06-29**.

Tai lieu nay chuyen cac phat hien audit screen flow, workflow va business rule thanh
checklist uu tien de thuc hien. Khi cap nhat tien do, chi doi trang thai checkbox va
bo sung dong trong muc "Nhat ky tien do".

## Quy uoc

- `[ ]` Chua bat dau.
- `[-]` Dang thuc hien hoac dang bi chan.
- `[x]` Hoan thanh.
- **P0**: anh huong truc tiep den nghiep vu, bao mat, thanh toan, an toan y te hoac entitlement.
- **P1**: sai luong chinh, lam sai du lieu van hanh, hoac de nguoi dung hieu nham.
- **P2**: han che scale, UX, test, cau hinh hoac can backend/product chot them.

## Tong quan tien do

| Muc | Tong | Chua bat dau | Dang thuc hien/bi chan | Hoan thanh |
| --- | ---: | ---: | ---: | ---: |
| P0 | 5 | 0 | 0 | 5 |
| P1 | 5 | 4 | 0 | 1 |
| P2 | 6 | 3 | 2 | 1 |

## P0 - Can xu ly truoc

### BR-P0-001: Bat buoc onboarding Patient dung business rule

- [x] Sua `getPostLoginPath()` de Patient first-login va chua hoan tat profile di den `/patient/profile/setup`.
- [x] Sua login, signup va Google login de ton trong onboarding truoc khi vao dashboard hoac return intent.
- [x] Sua route guard `route.profileSetup` hoac thay bang metadata ro rang tren route can bi chan.
- [x] Bao dam Doctor/Staff/Admin khong bi dua vao onboarding Patient.
- [x] Them test login/signup cho Patient moi, Patient da co profile, Doctor first-login va return intent sau onboarding.

Acceptance:

- Patient moi khong vao dashboard/intake khi chua hoan tat profile.
- Patient da hoan tat profile khong bi mo lai onboarding.
- Doctor/Staff/Admin van vao workspace dung role.

Trang thai: `[x]`

### BR-P0-002: Khong cho bypass safety gate trong luong danh gia trieu chung

- [x] Yeu cau di qua `/medical-assistant/safety` truoc khi submit intake hoac co state xac nhan an toan.
- [x] Neu nguoi dung vao thang `/symptom` hoac `/medical-assistant/intake`, hien safety interstitial truoc khi cho submit.
- [x] Khong dat canh bao khan cap sau login, premium hoac profile setup.
- [x] Them test direct URL `/symptom`, alias `/medical-assistant/intake`, red flag va non-red-flag.

Acceptance:

- Khong co request `suggest-clinical-questions` neu safety step chua duoc xac nhan.
- Red flag dung flow AI va dua nguoi dung den huong dan cap cuu/map.

Trang thai: `[x]`

### BR-P0-003: Tach Premium entitlement khoi role he thong

- [x] Sua `hasPremiumAccess()` de khong mac dinh cho `admin`/`staff` la Premium.
- [x] Tach route entitlement Patient voi route role Admin/Staff.
- [x] Xac dinh rule cho Admin/Staff test tinh nang Premium: dung account Patient Premium rieng hoac backend capability rieng.
- [x] Them permission matrix test cho Patient free, Patient premium, Staff, Doctor va Admin.

Acceptance:

- Staff/Admin khong vao route Patient premium chi vi co role cao hon.
- Premium duoc quyet dinh boi entitlement/subscription/capability, khong phai role.

Trang thai: `[x]`

### BR-P0-004: Payment cancel phai xac minh trang thai backend

- [x] Goi `payos-status` cho `/payment/cancel` khi co `orderCode`, toi thieu mot lan.
- [x] Hien dung cac state `pending`, `success`, `cancelled`, `failed`, `expired`.
- [x] Neu PayOS cancel nhung backend bao paid/active, uu tien ket qua backend da xac minh.
- [x] Cap nhat test hien tai dang assert `statusRequests === 0`.

Acceptance:

- Frontend khong tu ket luan "chua bi tinh phi" chi tu URL cancel.
- Entitlement chi refresh khi backend bao paid/active.

Trang thai: `[x]`

### BR-P0-005: Bao toan return intent day du

- [x] Sua `sanitizeReturnTo()` de giu query va hash noi bo an toan.
- [x] Bao toan `/profile?tab=subscription`, `/map?search=...`, `/map?departmentId=...&sessionId=...`.
- [x] Khong cho external origin, auth pages hoac payment return loop lam return target.
- [x] Them test login, signup, pricing, payment success voi query/hash.

Acceptance:

- Sau login/payment, nguoi dung quay lai dung task va dung context ban dau.
- Return intent van chan open redirect.

Trang thai: `[x]`

## P1 - Can lam sau P0

### BR-P1-006: Giam luu tru du lieu suc khoe trong sessionStorage

- [ ] Loai hoac rut gon `medimate.assessment.draft` va `medimate.assessment.session.*`.
- [ ] Neu can draft, chi luu sessionId va metadata toi thieu, khong luu raw symptom, answers, diagnosis/result.
- [ ] Xoa draft sau khi submit thanh cong, het han hoac logout.
- [ ] Them privacy regression test cho storage keys.

Acceptance:

- Khong co trieu chung, cau tra loi lam sang, ket qua AI hoac ho so y te raw trong storage sau flow chinh.

Trang thai: `[ ]`

### BR-P1-007: Them review moderation queue cho Admin/Staff

- [ ] Tao view quan ly review dung `feedbackReviewsApi.list`.
- [ ] Ho tro filter facility, rating va status neu backend ho tro.
- [ ] Dung `setStatus`, `update`, `remove` theo policy backend.
- [ ] Public map chi hien review backend tra ve la cong khai/approved.
- [ ] Them test approve/reject/hide/delete va public visibility.

Acceptance:

- Review moi khong mac dinh tro thanh public neu policy la Pending.
- Admin/Staff co hang doi xu ly review ro rang.

Trang thai: `[ ]`

### BR-P1-008: Mo rong Staff/Doctor workspace theo scope thuc

- [ ] Tach Staff workspace khoi form CRUD chuyen khoa global.
- [ ] Xac dinh Staff duoc giao facility/department nao va chi hien tac vu trong scope do.
- [ ] Them Doctor workspace/toi thieu profile professional neu Doctor la bien the cua Staff.
- [ ] Khong cho Staff sua du lieu ngoai scope neu backend khong xac nhan ownership.
- [ ] Them test Staff, Doctor, Admin va account khong co scope.

Acceptance:

- Staff/Doctor khong chi thay mot form "Quan ly chuyen khoa" chung chung.
- UI khop rule "Staff chi sua du lieu thuoc pham vi duoc giao".

Trang thai: `[ ]`

### BR-P1-009: Kiem soat records va medication demo tren production surface

- [ ] Chot product decision: an khoi navigation production hay giu voi nhan "Demo".
- [ ] Neu giu, doi label route/nav/CTA de khong goi la capability production.
- [ ] Khong de mock lab result, prescription, drug interaction duoc hieu la phan tich that.
- [ ] Them regression guard cho production navigation va demo labels.

Acceptance:

- User khong hieu nham `/records` va `/medication` la du lieu y te that duoc luu/phan tich.

Trang thai: `[ ]`

### BR-P1-010: Loai mock hospital recommendation con lai

- [x] Kiem tra tat ca import `hospitalRecommendations.js`.
- [x] Xoa service mock neu khong con duoc dung.
- [x] Neu can giu cho dev/test, chuyen vao fixture/test-only va dat ten ro rang.
- [x] Them guard khong import mock recommendation vao production bundle.

Acceptance:

- Production flow khong con phu thuoc `MOCK_HOSPITALS` hoac TODO thay API.

Trang thai: `[x]`

## P2 - Cai thien scale, cau hinh va do on dinh

### BR-P2-011: Sua profile lookup theo userId de khong scan page dau

- [ ] Can backend endpoint `/api/patient-profiles/me` hoac filter theo userId.
- [x] Neu backend chua co, ghi ro backlog va tam thoi fetch co pagination den khi tim thay hoac het trang.
- [x] Sua `findPatientProfileByUserId()` va `patientProfilesApi.findByUserId()`.
- [x] Them test user profile nam ngoai page dau.

Acceptance:

- User da co profile khong bi coi la chua tao chi vi profile khong nam trong 100 ban ghi dau.

Trang thai: `[-]` - frontend da co pagination fallback; van can backend/filter tot hon de xu ly sach.

### BR-P2-012: Chuyen Admin pending/search sang server-side filter

- [ ] Bo client-side search/pending count tren page hien tai hoac doi copy de noi ro "trang hien tai".
- [ ] Neu backend ho tro, them query filter status/search cho `usersApi.list`.
- [ ] Tong pending trong overview phai la tong dataset, khong phai so dong page dang tai.
- [ ] Them test pagination + search cross-page.

Acceptance:

- Admin khong bo sot user pending nam o page khac.

Trang thai: `[ ]`

### BR-P2-013: Loai hardcode backend HTTP IP khoi config production

- [x] Thay IP HTTP trong `vercel.json` bang environment variable hoac proxy HTTPS duoc quan ly.
- [x] Giu `VITE_API_BASE_URL` chi cho dev proxy va cap nhat `.env.example`.
- [x] Cap nhat docs deploy va security note.
- [x] Kiem tra mixed content, Vercel rewrite va local dev proxy.

Acceptance:

- Production khong hardcode `http://52.77.210.243:8080`.

Trang thai: `[x]`

### BR-P2-014: On dinh route smoke tests khi chay song song

- [ ] Dieu tra flake blank page cua `/login` va `/staff/register` khi chay `test:e2e:routes` voi nhieu workers.
- [ ] Ghi console/pageerror/network failure vao trace de xac dinh race.
- [ ] Neu do shared dev server/resource, cau hinh worker hoac route mock phu hop.
- [ ] Giu test rieng `--workers=1` lam baseline trong luc dieu tra.

Acceptance:

- `npm run test:e2e:routes` pass on dinh, khong can rerun rieng.

Trang thai: `[ ]`

### BR-P2-015: Giam bundle va tach code cho route lon

- [ ] Tach them admin/workspace route neu chunk index van lon.
- [ ] Kiem tra MapLibre chi nam trong lazy chunk.
- [ ] Dat performance budget va ghi so do truoc/sau.
- [ ] Them smoke performance sau khi tach chunk.

Acceptance:

- Build khong con warning chunk lon khong kiem soat hoac co budget chap nhan ro rang.

Trang thai: `[ ]`

### BR-P2-016: Cap nhat test theo business rule moi

- [x] Sua cac test dang co tinh co dinh hanh vi lech rule, vi du signup khong ep onboarding va payment cancel khong goi status.
- [-] Them regression cho P0/P1 truoc khi refactor code.
- [ ] Cap nhat route manifest neu route access thay doi.
- [ ] Ghi ro test nao la product decision va test nao la tam thoi.

Acceptance:

- Test suite bao ve business rule da chot, khong bao ve hanh vi sai cu.

Trang thai: `[-]` - da cap nhat regression cho P0; P1/P2 se tiep tuc khi xu ly cac hang muc con lai.

## Nhat ky tien do

| Ngay | Hang muc | Tien do | Ghi chu | Kiem tra |
| --- | --- | --- | --- | --- |
| 2026-06-29 | BR-P0-001..BR-P2-016 | Tao checklist | Chuyen audit screen flow/workflow/business rule thanh backlog uu tien. Chua sua code san pham. | `npm run lint` pass; `npm run build` pass; route smoke full 56 pass/2 flaky/1 skipped, rerun rieng 2 flaky pass voi `--workers=1` |
| 2026-06-29 | BR-P0-001..BR-P0-005, BR-P2-016 | Hoan thanh P0 | Ep Patient onboarding, chan bypass safety gate, tach Premium khoi role, xac minh payment cancel bang backend, giu return intent query/hash. Cap nhat test P0. | `npm run lint` pass; `npm run build` pass co warning chunk lon cu; `npx playwright test tests/e2e/payment-results.spec.js` pass; `npx playwright test tests/e2e/navigation-ux.spec.js` pass; `npm run test:e2e:routes` 58 pass/1 skipped |
| 2026-06-29 | BR-P1-010, BR-P2-011, BR-P2-013 | Hoan thanh/partial | Xoa `hospitalRecommendations.js`; them pagination fallback cho profile lookup; bo hardcoded backend IP khoi runtime/config va them Vercel `/api` proxy dung `API_BASE_URL`. | `rg` khong con mock/IP trong runtime/config; `npm run lint` pass; `npm run build` pass co warning chunk lon cu; `npx playwright test tests/e2e/navigation-ux.spec.js` 22 pass |

## Mau cap nhat

Khi bat dau mot hang muc:

```md
### BR-Px-000: Ten hang muc

- [-] Xac nhan pham vi va acceptance.
- [ ] Sua code hoac docs lien quan.
- [ ] Them/cap nhat test.
- [ ] Chay kiem tra va ghi ket qua.

Trang thai: `[-]`
```

Khi hoan thanh, doi cac checkbox sang `[x]`, cap nhat bang "Tong quan tien do" va them mot dong vao "Nhat ky tien do".
