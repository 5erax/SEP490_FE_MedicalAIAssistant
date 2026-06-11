# Roadmap nang cap UI/UX

## Thu tu phase

| Phase | Ket qua | Exit criteria |
| --- | --- | --- |
| 0. Baseline | Anh chup, flow map, accessibility/performance baseline | Co baseline cho route va admin section quan trong |
| 1. Foundation | Token, primitive, state va shell pattern chuan | Story/demo matrix va component tests dat |
| 2. Public/Auth | Landing, static, auth, pricing, staff registration | Public funnel responsive va keyboard-complete |
| 3. Patient/AI | Patient shell, intake, map, profile, records, medication, chat | Core patient tasks dat acceptance va safety review |
| 4. Staff/Admin | CRUD, table, filter, dialog, section navigation | Operator workflows dat density va permission tests |
| 5. Hardening | Cross-browser, a11y, visual regression, analytics | Khong con P0; P1 duoc dong hoac chap nhan co chu dich |

Khong bat dau phase 2-4 truoc khi cac primitive lien quan cua phase 1 san sang. Co the
chay song song public va operator sau khi foundation dat exit criteria.

## P0 - Bat buoc truoc redesign theo page

| ID | Van de | Giai phap | Man hinh | Tieu chi nghiem thu | Phu thuoc |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Token CSS/JS va workspace mau thuan | Chot semantic CSS token, map alias cu, them kiem tra drift | Toan bo | Mau, spacing, radius, motion khong con gia tri trung lap ngoai allowlist | Khong |
| P0-02 | Primitive thieu va API khong nhat quan | Mo rong Button, Field, Alert, Dialog, Tabs, Pagination, DataState | Toan bo | Keyboard, ref, native props, busy/disabled va a11y tests dat | P0-01 |
| P0-03 | Dialog/notice chua quan ly focus | Dung mot Dialog/Drawer foundation cho confirm, premium gate, modal | Patient, Admin, Staff | Trap focus, Escape, backdrop policy, restore focus dat | P0-02 |
| P0-04 | Loading/empty/error phan tan | Tao state matrix va component Loading/Empty/Error/Permission/Retry | Tat ca data surface | Moi surface co state fixture va khong blank khi request loi | P0-02 |
| P0-05 | Route/navigation khong co metadata chung | Tao route registry cho label, shell, access, premium, title va alias | Moi route trong audit | Route compatibility test bao phu tat ca path/redirect hien tai | P0-02 |
| P0-06 | Form semantics co ID/error lien ket yeu | Chuan hoa Field va validation summary | Auth, profile, setup, staff/admin forms | Label/hint/error duoc announce; focus den field dau loi | P0-02 |
| P0-07 | Luong medical AI thieu pattern safety chung | Tao SafetyNotice, urgency va provenance pattern khong tu che data | Intake, symptom, chat, records, medication | Disclaimer va next step nhat quan; clinical owner duyet copy | P0-02 |
| P0-08 | Khong co regression baseline | Them route smoke, axe, screenshot viewport va critical-flow checklist | Toan bo | CI fail khi route vo, a11y critical hoac visual diff chua duyet | Phase 0 |

Tien do dot foundation 1:

- P0-01: da them semantic token va compatibility alias cho component moi.
- P0-02: da nang Button, Field, Alert, ErrorState, LoadingState va table semantics.
- P0-04: da co state primitive chung; can tiep tuc migrate cac data surface.
- P0-06: Field da lien ket label, hint va error bang ID on dinh; `/dashboard` la vertical slice dau tien.

## P1 - Trải nghiệm cốt lõi

| ID | Van de | Giai phap | Man hinh | Tieu chi nghiem thu | Phu thuoc |
| --- | --- | --- | --- | --- | --- |
| P1-01 | Public IA va CTA chua co hierarchy chung | Chuan hoa Navbar, PageHeader, CTA va static template | `/`, static routes, 404 | Mobile menu keyboard-complete; moi page co heading va recovery action | P0-02, P0-05 |
| P1-02 | Auth state/validation chua nhat quan | Mot auth form pattern, password help, redirect context, success state | Auth routes | Moi loi co cach sua; submit busy; back/redirect dung | P0-04, P0-06 |
| P1-03 | Pricing/premium gate dung nhieu pattern | Chuan hoa plan comparison va LockedFeatureDialog | `/pricing`, patient nav | Nguoi dung biet tinh nang bi khoa, gia tri va duong lui | P0-03, P0-05 |
| P1-04 | Patient shell mobile menu/search chua hoan chinh | AppShell responsive, drawer, active state va search scope ro | Patient routes | Nav dung o 320-1440 px; focus/scroll duoc giu hop ly | P0-02, P0-05 |
| P1-05 | Intake -> map che giau fallback/API state | Lam ro progress, fallback, specialty result va handoff | `/dashboard`, `/map` | User biet ket qua la live/fallback; retry khong mat input | P0-04, P0-07 |
| P1-06 | Map phu thuoc pointer va permission happy path | List/map parity, location permission, search/filter, selected state | `/map`, medical assistant | Hoan thanh chon facility bang keyboard/list; co denied/error state | P0-04 |
| P1-07 | Symptom/chat co pattern hoi dap khac nhau | Dung chat primitive, composer, typing, retry va emergency escalation | `/symptom`, `/chat`, AI chat | Screen reader announce dung; draft duoc giu khi retry | P0-04, P0-07 |
| P1-08 | Profile/setup form dai va save state roi rac | Section/progress, validation summary, dirty state va success | `/profile`, profile setup | Khong mat thay doi vo tinh; loi dua focus dung; mobile hoan thanh duoc | P0-06 |
| P1-09 | Records master/detail va table kho dung tren mobile | Responsive record navigator, tabs, lab table/card, file states | `/records` | Chon record, doi tab, doc lab va upload o 320 px | P0-02, P0-04 |
| P1-10 | Medication upload/camera thieu permission/error design | FileUpload, camera permission, preview va confidence/safety result | `/medication` | Invalid file, denied camera, processing, retry va result deu co state | P0-04, P0-07 |
| P1-11 | Staff CRUD dung custom field/state | Dung operator shell, Field, Alert, Dialog va responsive records | `/app/staff` | Create/edit/delete keyboard-complete; delete confirm; error giu form | P0-02-06 |
| P1-12 | Admin page qua lon va navigation state cuc bo | Tach section container, route/deep-link section, shared toolbar/table | Admin aliases + 6 sections | Reload/back giu section; moi section co loading/empty/error | P0-02, P0-04, P0-05 |
| P1-13 | Data table/modal admin khong co pattern day du | ResponsiveDataTable, caption/scope, row action menu, form dialog | Users, doctors, AI configs, departments | Keyboard va screen reader thao tac duoc; mobile co fallback | P0-02, P0-03 |
| P1-14 | Copy tron ngon ngu va expose noi bo | Content pass theo audience va glossary | Toan bo | Patient UI khong lo endpoint/internal ID; CTA/loading/error nhat quan | Design principles |

## P2 - Toi uu va nang cao

| ID | Van de | Giai phap | Man hinh | Tieu chi nghiem thu | Phu thuoc |
| --- | --- | --- | --- | --- | --- |
| P2-01 | Chua co theme/contrast audit tu dong | Them contrast checks va high-contrast guardrail | Toan bo | Semantic color pair dat AA theo kich thuoc text | P0-01 |
| P2-02 | Static content kho quan ly va co route shadow | Tach content registry, loai key khong the truy cap | StaticPage | Khong duplicate login/signup/pricing; 404 dung status template | P1-01 |
| P2-03 | Admin overview co chart chi thi giac | Data alternative va meaningful metric definitions | Admin overview | Chart co bang/tom tat tuong duong; metric co nguon/thoi diem | P1-12 |
| P2-04 | Analytics chua do completion/failure co he thong | Event schema privacy-safe theo critical flow | Public, patient, operator | Khong gui PHI; dashboard do completion, error, retry, exit | P1 |
| P2-05 | CSS inline lam bundle va maintenance kho | Migrate page style sang layer/component styles theo vertical slice | 8 page co `<style>` | Khong con inline style page; visual diff da duoc duyet | P1 tung page |
| P2-06 | Performance map/chat/admin chua co budget | Lazy-load map/heavy section, skeleton phu hop va budget | Landing, map, assistant, admin | Dat budget LCP/INP/CLS duoc chot o baseline | Phase 0, P1 |
| P2-07 | Chua co user validation | Usability test voi patient va operator | Core flows | 5 task patient + 4 task operator co completion target | P1 |

## Ke hoach test

### Automated

- Unit/component: token mapping, variant, form linkage, dialog focus, tabs, pagination.
- Route: moi path/alias/redirect trong audit; auth, premium va role matrix.
- Accessibility: axe cho page template va component state; keyboard smoke cho critical flow.
- Visual: 320, 375, 768, 1024, 1440 px; default/loading/empty/error/dialog states.
- Integration: intake-to-map, auth redirect, profile save, record tabs, medication upload,
  staff department CRUD, admin user/doctor/AI config flows.

### Manual

- Chrome, Edge, Firefox va Safari/iOS viewport tuong duong.
- Keyboard-only, 200% zoom, reduced motion, high contrast va screen reader smoke.
- Slow 3G/offline/timeout, denied geolocation/camera, expired auth va permission denied.
- Vietnamese text wrapping, long names/emails, empty datasets va pagination boundaries.

## Acceptance theo phase

Moi phase chi duoc dong khi:

1. Tat ca backlog item trong phase dat acceptance criteria.
2. Khong thay API/schema/business behavior ngoai migration da phe duyet.
3. Build, lint, route smoke, a11y va visual regression dat.
4. Co before/after evidence va release note cho route bi anh huong.
5. P0 moi phat hien duoc sua truoc merge; P1 co owner va milestone ro rang.

## Gia dinh

- CSS van la styling solution chinh; khong them UI framework trong chuong trinh nay.
- Khong doi router trong cung PR voi visual redesign; neu them router, lam migration
  rieng va giu compatibility cho moi URL.
- Design system duoc migrate dan, cho phep alias cu tam thoi co deprecation note.
- Clinical copy, urgency va disclaimer can product/domain approval.
- Analytics chi ghi metadata UX khong nhay cam, tuyet doi khong ghi noi dung y te cua user.
