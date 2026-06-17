# Hướng dẫn thực hiện checklist và quy trình refactor MediMate AI Frontend

> Phiên bản nâng cấp: 2026-06-17  
> Phạm vi: frontend React/Vite MediMate AI.  
> Đối tượng sử dụng: Frontend Developer, Senior Frontend Engineer, Reviewer, Tech Lead, QA, PM kỹ thuật.  
> Mục tiêu: biến checklist refactor thành quy trình thao tác có thể áp dụng trực tiếp trong công ty, giảm sai sót khi triển khai, review và release.  
> Nguyên tắc: tài liệu này không thay thế kiểm thử runtime; mọi thay đổi code vẫn phải qua lint, build, test, review và evidence rõ ràng.

---

## 0. Cách sử dụng tài liệu này trong team

Tài liệu này không phải tài liệu đọc một lần. Đây là SOP triển khai công việc refactor và nâng cấp repo frontend. Khi một developer nhận task, người đó phải dùng tài liệu này để biết phải chuẩn bị gì, sửa theo thứ tự nào, dừng ở đâu, test gì, ghi PR ra sao và khi nào cần báo tech lead.

### 0.1. Dùng trong những tình huống nào

| Tình huống | Cách dùng tài liệu |
| --- | --- |
| Developer nhận task refactor | Đọc mục 2 đến mục 7 để đi từ chọn task đến mở PR |
| Developer sửa API/service | Đọc mục 10 và mục 18 |
| Developer thêm route | Đọc mục 11 |
| Developer tách page lớn | Đọc mục 8, mục 9 và mục 16 |
| Developer sửa CSS/UI | Đọc mục 12 |
| Reviewer review PR | Đọc mục 14, 15, 22 |
| Tech lead chia sprint | Đọc mục 4, 5, 23, 24 |
| QA xác định test cần chạy | Đọc mục 13, 20 |
| Release production | Đọc mục 21 |
| Có lỗi production | Đọc mục 19 |

### 0.2. Quan hệ với các tài liệu khác

| Tài liệu | Vai trò |
| --- | --- |
| `00_INDEX.md` | Cách đọc bộ tài liệu, glossary, DoR/DoD chung |
| `01_TONG_QUAN_DU_AN.md` | Bức tranh tổng thể về sản phẩm, capability, hiện trạng kỹ thuật |
| `02_CAU_TRUC_CODE_VA_LUONG_HOAT_DONG.md` | App chạy như thế nào: entry point, route, access, API, state, flow |
| `03_DANH_GIA_KIEN_TRUC.md` | Đánh giá kiến trúc hiện tại và kiến trúc mục tiêu |
| `04_CHECKLIST_CAI_TIEN_REFACTOR.md` | Backlog checklist theo P0/P1/P2/P3 |
| `05_HUONG_DAN_THUC_HIEN_CHECKLIST.md` | SOP thực hiện checklist, chính là tài liệu này |
| `06_KE_HOACH_TO_CHUC_LAI_THU_MUC.md` | Kế hoạch migrate sang cấu trúc thư mục mới |
| `07_QUY_UOC_CODE_CHAT_LUONG.md` | Coding standards và quy ước chất lượng |
| `08_RUI_RO_VA_DE_XUAT_UU_TIEN.md` | Risk register và khuyến nghị ưu tiên |

### 0.3. Quy tắc bắt buộc khi áp dụng

1. Không tự ý refactor lớn nếu chưa có scope rõ.
2. Không trộn refactor, đổi behavior, đổi API contract và đổi UI lớn trong cùng một PR nếu không có lý do mạnh.
3. Không gọi API trực tiếp trong page/component.
4. Không thêm secret, token, API provider key hoặc production IP vào source.
5. Không để mock/demo y tế hiển thị như dữ liệu thật.
6. Không merge nếu lint/build/test chính thất bại, trừ khi tech lead chấp nhận rủi ro bằng văn bản trong PR.
7. Không nói “đã test” nếu không có evidence.
8. Không sửa vùng auth/payment/AI/symptom/deploy theo cảm tính.

---

## 1. Mục tiêu của hướng dẫn

Tài liệu này biến checklist thành quy trình thao tác cụ thể. Nhân viên không chỉ biết “cần làm gì”, mà biết chính xác:

- bắt đầu từ đâu;
- đọc tài liệu nào trước khi sửa;
- tạo branch như thế nào;
- chia scope ra sao;
- ghi baseline thế nào;
- sửa theo thứ tự nào để giảm rủi ro;
- test gì theo từng vùng code;
- viết PR description ra sao;
- reviewer cần kiểm gì;
- khi nào phải dừng lại;
- khi nào phải báo tech lead;
- rollback như thế nào nếu release lỗi.

### 1.1. Kết quả mong muốn sau khi áp dụng

Một task refactor được coi là chuyên nghiệp khi:

- có mục tiêu rõ;
- phạm vi nhỏ;
- không thay đổi hành vi ngoài scope;
- có test/evidence phù hợp;
- reviewer hiểu được thay đổi trong thời gian hợp lý;
- nếu có rủi ro thì rủi ro được ghi rõ;
- nếu có docs cần cập nhật thì docs đã được cập nhật;
- sau merge không tạo thêm nợ kỹ thuật khó kiểm soát.

### 1.2. Những lỗi tài liệu này muốn ngăn chặn

| Lỗi thường gặp | Hậu quả |
| --- | --- |
| Refactor một file quá lớn trong một PR | Reviewer không đọc hết, regression khó phát hiện |
| Sửa UI và sửa logic cùng lúc | Không biết lỗi đến từ visual hay behavior |
| Gọi `fetch` trực tiếp trong component | API layer bị bypass, error handling không thống nhất |
| Hard-code URL backend | Deploy nhầm môi trường, khó quản trị staging/prod |
| Thêm mock nhưng không gắn nhãn | Người dùng hiểu nhầm dữ liệu y tế là thật |
| Xóa CSS global không có visual evidence | UI route khác bị vỡ |
| Update test chỉ để pass | Che giấu bug thật |
| Không ghi out-of-scope | PR phình to, khó review |

---

## 2. Nguyên tắc làm việc khi refactor

### 2.1. Không refactor cảm tính

Mọi refactor phải bắt đầu bằng chuỗi lý do rõ ràng:

```txt
Vấn đề -> Mục tiêu -> Phạm vi -> Cách làm -> Test -> Evidence
```

Ví dụ tốt:

```txt
Vấn đề: AdminWorkspacePage chứa logic AI configs, làm file quá lớn và khó test.
Mục tiêu: tách AI configs thành section riêng, giữ behavior cũ.
Phạm vi: AdminWorkspacePage, components/adminAIConfigs, feature/admin/ai-configs.
Cách làm: copy logic hiện tại sang hook, giữ service call và selector cũ.
Test: lint, build, admin-ai-configs E2E, manual CRUD.
Evidence: command output + screenshot section.
```

Ví dụ không đạt:

```txt
Em thấy file này rối nên em clean lại hết.
```

Lý do không đạt: không rõ scope, không rõ behavior nào được giữ, không có test plan, không biết reviewer cần kiểm gì.

### 2.2. Một PR chỉ nên có một mục tiêu chính

PR tốt:

```txt
refactor(admin): extract AI config section from AdminWorkspacePage
```

PR xấu:

```txt
refactor: clean admin, fix payment, change CSS, update auth, add route
```

Nếu một PR có nhiều mục tiêu, reviewer phải yêu cầu tách PR. Chỉ chấp nhận PR rộng khi:

- là thay đổi cơ học toàn repo;
- có script hoặc pattern rất rõ;
- có test đủ;
- có tech lead approve trước;
- không đụng vùng security/payment/auth/medical safety ngoài scope.

### 2.3. Giữ behavior trước, tối ưu sau

Khi tách code, mục tiêu đầu tiên là behavior cũ vẫn đúng. Không nên vừa tách code vừa sửa UX, đổi copy, đổi API payload hoặc đổi CSS lớn.

Thứ tự an toàn:

```txt
1. Tách file nhưng giữ logic giống cũ.
2. Chạy test và manual verify.
3. Sau khi behavior ổn, tạo PR khác để tối ưu UX/performance.
```

### 2.4. Tách nhỏ theo miền nghiệp vụ

Không tách theo kiểu máy móc “mỗi hàm một file”. Tách theo domain và trách nhiệm.

Tốt:

```txt
features/admin/users/useAdminUsers.js
features/admin/users/AdminUsersTable.jsx
features/admin/users/AdminUserFormDialog.jsx
```

Không tốt:

```txt
AdminUsersButton.jsx
AdminUsersTitle.jsx
AdminUsersSmallText.jsx
```

Nếu component chỉ dùng một lần và rất nhỏ, không cần tách thành file riêng trừ khi giúp giảm độ phức tạp rõ ràng.

### 2.5. Không sửa ngoài scope nếu không cần

Nếu phát hiện lỗi ngoài scope, ghi lại follow-up thay vì sửa luôn.

Mẫu ghi chú trong PR:

```md
## Out-of-scope issue found
- File: src/pages/NearbyClinicPage.jsx
- Issue: geolocation denied chưa có copy rõ ràng
- Risk: user không biết vì sao không thấy clinic gần mình
- Suggested follow-up: tạo task P1 map fallback UX
```

Chỉ sửa ngoài scope nếu:

- lỗi chặn task hiện tại;
- lỗi security/safety nghiêm trọng;
- lỗi production blocker;
- tech lead đồng ý mở rộng scope.

---

## 3. Luồng làm việc chuẩn từ task đến merge

### 3.1. Tổng quan luồng

```txt
Chọn task
  -> đọc docs liên quan
  -> xác định scope/out-of-scope
  -> tạo branch
  -> ghi baseline
  -> refactor nhỏ theo commit
  -> chạy test liên quan
  -> tự review
  -> mở PR có evidence
  -> reviewer review
  -> sửa comment
  -> merge
  -> kiểm tra sau merge
```

### 3.2. Bảng checklist nhanh

| Giai đoạn | Việc bắt buộc | Output |
| --- | --- | --- |
| Trước khi code | Chọn task, scope, out-of-scope | Issue/PR plan rõ |
| Trước khi sửa | Chạy baseline nếu có thể | Lint/build/test trạng thái ban đầu |
| Khi sửa | Commit nhỏ, không đổi behavior ngoài scope | Diff reviewable |
| Trước PR | Chạy test liên quan, tự review | Evidence |
| Khi mở PR | Ghi summary, risk, test, docs | PR đủ thông tin |
| Sau review | Sửa đúng comment, không mở rộng scope | PR ổn định |
| Sau merge | Kiểm tra CI/preview, cập nhật task | Task done thật |

---

## 4. Giai đoạn 1: Chọn task và xác định ưu tiên

### 4.1. Chọn task từ checklist

Task nên được chọn từ `04_CHECKLIST_CAI_TIEN_REFACTOR.md`. Ưu tiên theo thứ tự:

1. P0 security/env/demo/safety.
2. P1 route/API/auth/page lớn/CSS.
3. P2 test/performance/production readiness.
4. P3 docs/process/team governance.

Không tự chọn task P0/P1 phức tạp nếu chưa có owner và reviewer phù hợp.

### 4.2. Quy tắc chọn task theo năng lực developer

| Năng lực developer | Task phù hợp | Task không nên giao ngay |
| --- | --- | --- |
| New developer | Tách content tĩnh, thêm docs, UI component nhỏ, test đơn giản | Auth, payment, API client, deploy env |
| Mid-level developer | Tách feature section vừa, chuẩn hóa form, thêm service theo mẫu | Secret handling, route access phức tạp |
| Senior developer | Page lớn, API layer, auth/premium, performance, migration | Không có giới hạn nhưng vẫn cần scope |
| Tech lead | Architecture decision, ADR, CI gate, policy, release blockers | Không nên ôm toàn bộ implementation nếu team có thể chia |

### 4.3. Ma trận ưu tiên khi nhiều task cùng lúc

| Câu hỏi | Nếu Có | Hành động |
| --- | --- | --- |
| Có rủi ro secret/token/API key không? | Có | P0, làm trước |
| Có thể khiến user hiểu nhầm demo y tế là thật không? | Có | P0, làm trước |
| Có thể bypass admin/staff/premium không? | Có | P0/P1, làm trước |
| Có làm release fail không? | Có | P0/P1 |
| Có làm developer khó maintain nhưng không chặn release không? | Có | P1/P2 |
| Chỉ cải thiện docs/process? | Có | P3, làm song song |

---

## 5. Giai đoạn 2: Xác định scope và out-of-scope

### 5.1. Mẫu scope bắt buộc

Trước khi code, developer phải ghi rõ phạm vi. Có thể ghi trong issue, task card hoặc draft PR.

```md
## Scope
- src/pages/AdminWorkspacePage.jsx
- src/features/admin/ai-configs/*
- src/components/adminAIConfigs/* nếu reuse
- tests/e2e/admin-ai-configs.spec.js nếu selector cần update

## Out of scope
- Không đổi endpoint
- Không đổi payload request/response
- Không đổi route path
- Không đổi role/access
- Không đổi UI copy ngoài khu vực AI configs
- Không refactor CSS global ngoài class liên quan
```

### 5.2. Khi nào scope quá rộng

Scope có dấu hiệu quá rộng nếu:

- đụng hơn 8-12 file source có logic;
- diff logic vượt khoảng 500 dòng;
- vừa sửa API vừa sửa UI vừa sửa route;
- phải update nhiều E2E spec không cùng domain;
- reviewer không thể mô tả mục tiêu PR bằng một câu;
- PR có nhiều khu vực rủi ro: auth + payment + admin + CSS.

Khi scope quá rộng, chia PR theo thứ tự:

```txt
PR 1: behavior-preserving extraction
PR 2: cleanup dead code/import/style nhỏ
PR 3: behavior fix hoặc UX improvement
PR 4: test/docs update nếu quá lớn
```

### 5.3. Ví dụ chia task tốt

Không làm một task:

```txt
Refactor AdminWorkspacePage toàn bộ.
```

Chia thành:

```txt
1. Extract Admin overview section.
2. Extract Admin AI configs section.
3. Extract Admin doctors section.
4. Extract Admin subscriptions section.
5. Extract Admin users section.
6. Extract Admin departments section.
7. Extract Admin facilities section.
8. Extract Admin staff section.
9. Cleanup AdminWorkspacePage after section extraction.
```

Mỗi task có test/evidence riêng.

---

## 6. Giai đoạn 3: Tạo branch và commit strategy

### 6.1. Quy ước branch

Dùng format:

```txt
<type>/<area>-<short-description>
```

Ví dụ tốt:

```txt
refactor/admin-ai-config-section
refactor/admin-users-section
fix/auth-logout-session-clear
chore/env-remove-hardcoded-api
feat/symptom-empty-question-state
test/payment-status-fixtures
docs/update-refactor-sop
```

Không dùng:

```txt
update-code
fix-bug
new-version
my-work
final-final
```

### 6.2. Quy ước commit

Commit nên nhỏ và mô tả rõ thay đổi:

```txt
refactor(admin): move ai config table into section component
refactor(admin): extract useAdminAiConfigs hook
test(admin): update ai config e2e selectors
docs(refactor): update admin extraction checklist
```

Commit không đạt:

```txt
update
fix
clean all
final
wip done
```

### 6.3. Khi nào nên squash

Có thể squash trước merge nếu repo dùng squash merge. Tuy nhiên, trong quá trình review, commit nhỏ giúp reviewer hiểu tiến trình. Không squash thành một commit lớn trước khi reviewer đọc nếu PR phức tạp.

---

## 7. Giai đoạn 4: Ghi baseline trước khi sửa

### 7.1. Baseline tối thiểu

Trước khi sửa vùng lớn, chạy:

```bash
npm run lint
npm run build
```

Nếu task liên quan route/access:

```bash
npm run test:e2e:routes
```

Nếu task liên quan UI/layout:

```bash
npm run test:e2e:a11y
npm run test:e2e:visual
```

Nếu task liên quan performance:

```bash
npm run test:e2e:performance
```

### 7.2. Nếu baseline đang fail từ trước

Không giấu baseline fail. Ghi rõ trong PR:

```md
## Baseline status before change
- npm run lint: fail trước khi sửa, lỗi hiện có tại ...
- npm run build: pass
- E2E route: chưa chạy vì backend/local dependency thiếu

## Impact of this PR
PR không sửa lỗi baseline lint hiện có. Không phát sinh lỗi build mới.
```

Nếu baseline fail liên quan trực tiếp đến task, phải xử lý hoặc báo tech lead trước khi tiếp tục.

### 7.3. Không có backend local thì làm gì

Nếu backend local không khả dụng, vẫn có thể:

- chạy lint/build;
- chạy route/static tests nếu không cần backend;
- mock network trong E2E nếu spec đã hỗ trợ;
- manual test UI bằng fallback/mock rõ ràng;
- refactor UI thuần;
- update docs/checklist.

Nhưng không được claim đã kiểm thử API thực tế. Ghi trong PR:

```txt
API runtime chưa được xác nhận vì backend local không khả dụng. Đã kiểm tra static/lint/build và manual UI với mock/fallback.
```

---

## 8. Giai đoạn 5: Thực hiện refactor an toàn

### 8.1. Thứ tự refactor chung

Áp dụng cho mọi file lớn:

```txt
1. Tách constants/data thuần.
2. Tách component render thuần.
3. Tách hook quản lý state/API.
4. Tách normalize/mapper/validator.
5. Tách CSS feature-specific nếu cần.
6. Dọn import/dead code.
7. Chạy test.
```

Không nên bắt đầu bằng việc đổi toàn bộ kiến trúc. Tách từ phần ít rủi ro để tạo pattern trước.

### 8.2. Refactor behavior-preserving

Behavior-preserving nghĩa là:

- route không đổi;
- API endpoint không đổi;
- payload không đổi;
- UI text chính không đổi;
- selector test quan trọng không đổi nếu không cần;
- quyền truy cập không đổi;
- loading/error/empty state hiện có giữ nguyên hoặc chỉ được cải thiện rất nhỏ trong scope.

Ví dụ tốt:

```jsx
// Trước: logic nằm trong AdminWorkspacePage
const renderAiConfigs = () => <AIConfigTable data={configs} />;

// Sau: logic chuyển sang section, behavior giữ nguyên
function AdminAiConfigsSection() {
  return <AIConfigTable data={configs} />;
}
```

Ví dụ không nên làm trong cùng PR:

```txt
Tách section + đổi endpoint + đổi table UI + đổi pagination + đổi copy error.
```

### 8.3. Refactor có đổi behavior

Nếu cần đổi behavior, PR phải ghi rõ:

```md
## Behavior changes
- Trước: API lỗi thì UI giữ dữ liệu cũ và không hiện thông báo.
- Sau: API lỗi thì UI hiện Alert error và giữ dữ liệu cũ với trạng thái stale.

## Why
Giúp user biết request thất bại, tránh hiểu nhầm dữ liệu đã cập nhật.

## Test
- Mock 500 response.
- Manual retry.
```

Nếu PR refactor nhưng có behavior change không ghi rõ, reviewer nên yêu cầu sửa PR description hoặc tách PR.

---

## 9. SOP refactor `AdminWorkspacePage.jsx`

### 9.1. Vì sao phải tách

`AdminWorkspacePage.jsx` là vùng rủi ro cao vì có nhiều domain trong một file: overview, users, doctors, AI configs, subscriptions, staff, departments, facilities. Khi nhiều section CRUD nằm trong một page lớn, các vấn đề thường xảy ra:

- nhiều `useState` không liên quan nằm cạnh nhau;
- handler của domain này có thể ảnh hưởng domain khác;
- form/modal/table trộn lẫn;
- reviewer khó phát hiện bug;
- test unit gần như không thể viết;
- merge conflict thường xuyên;
- developer mới mất nhiều thời gian để hiểu.

Mục tiêu là đưa page về vai trò điều phối shell/section, không chứa chi tiết CRUD.

### 9.2. Target structure

```txt
src/features/admin/
├── AdminWorkspacePage.jsx
├── AdminShell.jsx
├── overview/
│   ├── AdminOverviewSection.jsx
│   └── index.js
├── ai-configs/
│   ├── AdminAiConfigsSection.jsx
│   ├── useAdminAiConfigs.js
│   ├── aiConfigFormModel.js
│   └── index.js
├── doctors/
├── subscriptions/
├── users/
├── departments/
├── facilities/
└── staff/
```

Sau refactor, `AdminWorkspacePage` chỉ nên:

```jsx
import { AdminAiConfigsSection } from "../features/admin/ai-configs";
import { AdminOverviewSection } from "../features/admin/overview";

export default function AdminWorkspacePage({ initialSection = "overview" }) {
  return (
    <AdminShell activeSection={initialSection}>
      {renderAdminSection(initialSection)}
    </AdminShell>
  );
}

function renderAdminSection(section) {
  switch (section) {
    case "ai-configs":
      return <AdminAiConfigsSection />;
    default:
      return <AdminOverviewSection />;
  }
}
```

### 9.3. Thứ tự tách khuyến nghị

| Thứ tự | Section | Lý do | Test chính |
| ---: | --- | --- | --- |
| 1 | overview | Ít rủi ro, không CRUD nặng | route/admin overview manual |
| 2 | ai-configs | Có component riêng, pattern rõ | `admin-ai-configs.spec.js` |
| 3 | doctors | Có component adminDoctors | `admin-doctors.spec.js` |
| 4 | subscriptions | Có component adminSubscriptions | payment/plans related |
| 5 | users | Cần cẩn thận approve/delete/role | `admin-users.spec.js` |
| 6 | departments | CRUD vừa phải | admin departments manual/spec nếu có |
| 7 | facilities | Form/location/status rủi ro hơn | `admin-facilities.spec.js` |
| 8 | staff | Liên quan role/approval | staff/admin access test |

### 9.4. Pattern tách từng section

Bước 1: tạo folder section.

```txt
src/features/admin/ai-configs/
```

Bước 2: chuyển render JSX sang section component.

```jsx
export function AdminAiConfigsSection() {
  return (
    <section className="operator-section" aria-labelledby="admin-ai-configs-title">
      <h2 id="admin-ai-configs-title">AI configs</h2>
      {/* giữ JSX cũ trước */}
    </section>
  );
}
```

Bước 3: chuyển state/API sang hook nếu section đã chạy ổn.

```jsx
export function useAdminAiConfigs() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await aiConfigsApi.list();
      setItems(normalizeAiConfigs(response));
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return { items, isLoading, error, load };
}
```

Bước 4: `AdminWorkspacePage` render section mới.

Bước 5: chạy test/evidence.

### 9.5. Quy tắc giữ behavior khi tách admin

- Giữ cùng service call.
- Giữ cùng route path.
- Giữ cùng role/access gate.
- Giữ cùng data-testid nếu test đang phụ thuộc.
- Không đổi table column trong PR tách logic.
- Không đổi form validation nếu không có task riêng.
- Không đổi CSS selector lớn.
- Không đổi copy lỗi nếu chưa có task chuẩn hóa error.

### 9.6. Dấu hiệu phải dừng và chia PR

Dừng nếu:

- phải đổi API payload;
- phát hiện bug cũ chưa rõ expected behavior;
- phải sửa CSS global lớn;
- test fail ở section không liên quan;
- diff vượt quá khả năng review;
- đang tách admin nhưng phải sửa auth/route/payment;
- reviewer không thể hiểu PR trong 15-20 phút đầu.

---

## 10. SOP xử lý security/env P0

### 10.1. Gỡ provider key khỏi client

Frontend Vite expose mọi biến `VITE_*` vào bundle client. Vì vậy, mọi key dạng secret không được nằm trong frontend production.

Quy trình:

1. Tìm nơi dùng key.

```bash
rg "VITE_.*KEY|ANTHROPIC|OPENAI|apiKey|x-api-key|Authorization" src .env* vite.config.js vercel.json
```

2. Xác định call nào đi thẳng từ browser tới provider.
3. Thay bằng backend endpoint nội bộ.
4. Xóa env key khỏi frontend.
5. Cập nhật `.env.example` chỉ giữ placeholder không nhạy cảm.
6. Kiểm tra build output không chứa key.
7. Cập nhật docs deploy.
8. Nếu key từng bị commit, rotate key ở provider.

Target đúng:

```txt
Frontend -> Backend AI Gateway -> AI Provider
```

Không dùng:

```txt
Frontend -> AI Provider bằng provider secret key
```

### 10.2. Kiểm tra build output không chứa secret

Sau khi build:

```bash
npm run build
rg "ANTHROPIC|OPENAI|sk-|apiKey|x-api-key|VITE_.*KEY" dist
```

Pass:

```txt
Không tìm thấy provider secret/key/token thật trong dist.
```

Fail:

```txt
Bundle chứa secret, phải dừng merge.
```

### 10.3. Tách env theo môi trường

Target:

```txt
.env.example         # placeholder, commit được
.env.local           # local override, không commit
Vercel env dev       # cấu hình trên platform
Vercel env preview   # cấu hình trên platform
Vercel env prod      # cấu hình trên platform
```

Không nên hard-code backend IP trong:

- `vite.config.js`;
- `vercel.json`;
- `.env.production` commit vào repo;
- service file;
- page/component.

### 10.4. Checklist env trước release

- [ ] Production API dùng HTTPS domain, không dùng IP thô.
- [ ] `.env.example` không chứa secret thật.
- [ ] `.env.local` nằm trong `.gitignore`.
- [ ] Vercel/hosting env được set theo môi trường.
- [ ] Build output không chứa provider key.
- [ ] Docs deploy nêu rõ biến nào bắt buộc.
- [ ] Không log env value nhạy cảm.

### 10.5. Khi phát hiện secret đã commit

1. Dừng release.
2. Báo tech lead.
3. Rotate/revoke key ở provider.
4. Xóa secret khỏi source.
5. Kiểm tra history nếu cần theo quy trình bảo mật.
6. Thêm secret scanning vào CI nếu chưa có.
7. Tạo postmortem ngắn: secret vào repo bằng cách nào và guardrail nào cần thêm.

---

## 11. SOP thêm hoặc sửa route

### 11.1. Luồng chuẩn thêm route

1. Tạo page/feature component.
2. Thêm route metadata vào `src/router/routes.js`.
3. Chọn `access` đúng: `public`, `auth`, `premium`, hoặc `role`.
4. Thêm `roles` nếu access là `role`.
5. Thêm navigation metadata nếu route cần hiện menu.
6. Import/render route trong `App.jsx`.
7. Chạy route tests.
8. Test auth/role/premium nếu route không public.
9. Cập nhật docs nếu route là capability mới.

### 11.2. Checklist route metadata

- [ ] `id` có namespace rõ: `public.*`, `auth.*`, `patient.*`, `admin.*`, `staff.*`.
- [ ] `path` không trùng route khác.
- [ ] `title` rõ, không để default nếu route quan trọng.
- [ ] `access` đúng.
- [ ] `roles` đúng nếu access là `role`.
- [ ] `shell` đúng nếu route nằm trong workspace.
- [ ] `navigation.order` không trùng bất hợp lý.
- [ ] `aliases` không bypass access.
- [ ] Unknown path vẫn có fallback.

### 11.3. Ví dụ route chuẩn

```js
{
  id: "patient.symptom",
  path: "/symptom",
  title: "Phân tích triệu chứng | MediMate AI",
  access: "auth",
  shell: "patient",
  navigation: {
    shell: "patient",
    label: "Triệu chứng",
    hint: "Mô tả triệu chứng",
    icon: "activity",
    order: 20,
    mobile: true,
  },
}
```

### 11.4. Lỗi route thường gặp

| Lỗi | Cách phát hiện | Cách sửa |
| --- | --- | --- |
| Route mới chỉ thêm trong `App.jsx` | Không có metadata/navigation/test | Thêm vào `routes.js` |
| Route private thiếu `access` | User chưa login vẫn vào được | Set `access: "auth"` hoặc role/premium đúng |
| Alias bypass access | Test alias vào thẳng content | Resolve alias vẫn phải check route access |
| Document title sai | Browser title không đổi | Set `title` trong route metadata |
| Route mới không có 404 fallback | URL sai blank page | Cập nhật unknown route handling |

---

## 12. SOP API layer và backend contract

### 12.1. Luồng chuẩn thêm endpoint mới

1. Thêm endpoint group/path vào `src/services/endpoints.js`.
2. Tạo hoặc update domain service.
3. Nếu API trả shape phức tạp, tạo normalize helper.
4. Page/hook gọi domain service, không gọi `fetch` trực tiếp.
5. Thêm loading/error/empty state.
6. Thêm test hoặc manual evidence.
7. Cập nhật docs backend contract nếu contract mới hoặc thay đổi.

### 12.2. Mẫu endpoint và service

```js
// endpoints.js
export const ENDPOINTS = {
  CLINICAL_QUESTIONS: {
    BASE: "/api/clinical-questions",
    DETAIL: (id) => `/api/clinical-questions/${id}`,
  },
};
```

```js
// clinicalQuestionService.js
import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const clinicalQuestionsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(
      `${ENDPOINTS.CLINICAL_QUESTIONS.BASE}?${withPagination(pageNumber, pageSize)}`,
      { auth: true }
    );
  },

  getById(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.DETAIL(id), { auth: true });
  },
};
```

Không làm:

```js
// Không đặt trong component/page
const res = await fetch("/api/clinical-questions");
```

### 12.3. Chuẩn normalize response

Nếu backend có thể trả nhiều shape, normalize tại service/model:

```js
export function normalizeFacility(record) {
  if (!record || typeof record !== "object") return null;

  return {
    id: record.id ?? record.facilityId,
    name: record.name ?? record.facilityName ?? "",
    latitude: toNumberOrNull(record.latitude ?? record.lat),
    longitude: toNumberOrNull(record.longitude ?? record.lng),
    status: record.status ?? "unknown",
  };
}
```

UI không nên chứa logic như:

```jsx
<td>{facility.facilityName || facility.name || facility.title || "N/A"}</td>
```

Vì khi nhiều page cùng tự đoán field, contract sẽ mất kiểm soát.

### 12.4. Checklist API PR

- [ ] Endpoint nằm trong `endpoints.js`.
- [ ] Domain service có tên rõ.
- [ ] Component/page không gọi `fetch` trực tiếp.
- [ ] Error được normalize hoặc hiển thị qua pattern chung.
- [ ] Loading state có.
- [ ] Empty state có nếu list có thể rỗng.
- [ ] Unauthorized/forbidden được xử lý đúng.
- [ ] Pagination dùng helper/chuẩn chung.
- [ ] Docs contract cập nhật nếu field/payload mới.
- [ ] Không log payload nhạy cảm.

### 12.5. Timeout, retry và unauthorized

Quy tắc đề xuất:

| Trường hợp | Cách xử lý |
| --- | --- |
| Timeout GET idempotent | Có thể retry giới hạn hoặc hiển thị retry button |
| Timeout POST tạo dữ liệu | Không auto retry nếu có nguy cơ tạo duplicate |
| 401 | Clear session/redirect login theo policy |
| 403 | Hiển thị không đủ quyền, không redirect vòng lặp |
| 404 | Hiển thị resource không tồn tại |
| 422/400 validation | Map vào form errors nếu có field errors |
| 500 | Hiển thị lỗi hệ thống, không expose stack trace |

---

## 13. SOP CSS/UI

### 13.1. Khi thêm component UI mới

Trước khi tạo component mới, trả lời:

- component này dùng lại nhiều nơi không?
- có primitive sẵn trong `components/ui` không?
- có nên là feature component thay vì shared component không?
- có token spacing/color/radius/shadow sẵn không?
- có state hover/focus/disabled/loading/error không?
- có keyboard accessibility không?
- có responsive behavior không?

### 13.2. Phân loại component UI

| Loại | Nơi đặt | Ví dụ | Không nên làm |
| --- | --- | --- | --- |
| Shared primitive | `components/ui` hoặc `shared/ui` | Button, Card, Dialog, Field, Table | Gọi API, biết domain admin/patient |
| Feature component | `features/<domain>/components` | AdminUsersTable, SymptomQuestionList | Dùng ở nhiều domain khác nhau không qua shared |
| Layout component | `components/workspace` hoặc `app/layouts` | UserWorkspaceShell, AdminShell | Chứa business CRUD |
| Page component | `pages` hoặc route entry | SymptomAnalysisPage | Nhồi toàn bộ API/form/render |

### 13.3. Khi sửa global CSS

Chỉ sửa `global.css` nếu:

- là token/base/foundation;
- là reset/typography/layout dùng toàn app;
- là utility được document rõ;
- là cleanup có visual evidence;
- không thể đặt vào feature/module.

Không thêm CSS feature-specific vào global:

```css
/* Không nên nếu chỉ dùng cho admin AI configs */
.ai-config-card-special-state { ... }
```

Nên đặt trong feature CSS:

```txt
features/admin/ai-configs/admin-ai-configs.css
```

### 13.4. Evidence UI trong PR

PR UI nên có:

- screenshot desktop;
- screenshot mobile nếu responsive;
- note test keyboard navigation;
- note loading/error/empty state;
- visual/a11y test output nếu ảnh hưởng lớn.

Mẫu evidence:

```md
## UI evidence
- Desktop screenshot: attached
- Mobile screenshot: attached
- Keyboard: Tab order checked in login form and dialog
- Empty state: verified with empty API response mock
- Error state: verified with 500 response mock
```

### 13.5. Checklist accessibility tối thiểu

- [ ] Form input có label hoặc aria-label rõ.
- [ ] Error message liên kết với input nếu phù hợp.
- [ ] Button có text hoặc accessible name.
- [ ] Dialog có title, focus trap, Escape close nếu phù hợp.
- [ ] Focus visible rõ.
- [ ] Table có header/caption hoặc context đủ.
- [ ] Color không phải cách duy nhất truyền đạt trạng thái.
- [ ] Loading state không làm screen reader kẹt.

---

## 14. SOP viết test

### 14.1. Chọn loại test đúng

| Logic/UI | Test nên dùng | Ví dụ |
| --- | --- | --- |
| Pure function normalize/role/validation | Unit test | `normalizeFacility`, `hasPremiumAccess` |
| Service API behavior | Integration test mock fetch | auth header, pagination, error parsing |
| Route/auth/premium | E2E route/access | private route redirect login |
| User flow chính | E2E | symptom diagnosis, payment return |
| Layout/visual | Visual test | landing, admin table, mobile shell |
| Form/dialog/table accessibility | A11y + keyboard manual | dialog trap focus, form errors |

### 14.2. Không lạm dụng E2E

E2E bảo vệ flow tổng thể nhưng chậm và khó pinpoint lỗi. Nếu logic có thể test bằng unit, ưu tiên unit. Ví dụ role helper, validation, normalize response, date/format helper không cần E2E cho mọi branch.

### 14.3. Mapping test theo vùng sửa

| Vùng sửa | Test tối thiểu |
| --- | --- |
| Route/navigation | `npm run test:e2e:routes` |
| Accessibility/form/dialog | `npm run test:e2e:a11y` + manual keyboard |
| Admin users | `npx playwright test tests/e2e/admin-users.spec.js` |
| Admin doctors | `npx playwright test tests/e2e/admin-doctors.spec.js` |
| Admin facilities | `npx playwright test tests/e2e/admin-facilities.spec.js` |
| Admin AI configs | `npx playwright test tests/e2e/admin-ai-configs.spec.js` |
| Payment | `npx playwright test tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js` |
| Map | `npx playwright test tests/e2e/map-ux.spec.js` |
| Symptom | `npx playwright test tests/e2e/symptom-diagnosis.spec.js` |
| Visual layout | `npm run test:e2e:visual` |
| Performance-sensitive | `npm run test:e2e:performance` |
| Docs-only | Có thể không cần test runtime, nhưng cần ghi docs-only |

### 14.4. Khi E2E fail sau refactor

Quy trình:

1. Xác định fail do behavior hay selector/test brittle.
2. Nếu behavior đổi ngoài scope, sửa code hoặc revert phần gây lỗi.
3. Nếu selector cũ không còn phù hợp nhưng behavior đúng, update selector theo pattern ổn định.
4. Không update snapshot/test chỉ để pass nếu UI thật bị lỗi.
5. Ghi rõ trong PR vì sao test được cập nhật.

Mẫu ghi chú:

```md
## Test update note
E2E selector cũ phụ thuộc vào text nằm trong component đã tách. Behavior không đổi. Đã chuyển selector sang data-testid ổn định để giảm brittle test.
```

---

## 15. Tự review trước khi mở PR

Developer phải tự kiểm trước khi gửi reviewer.

### 15.1. Checklist tự review chung

- [ ] PR có một mục tiêu chính.
- [ ] Scope và out-of-scope rõ.
- [ ] Không đổi behavior ngoài scope.
- [ ] Không gọi API trực tiếp trong component/page.
- [ ] Không hard-code endpoint/env/IP/token.
- [ ] Không thêm secret/API provider key.
- [ ] Không log PII/medical data.
- [ ] Không thêm mock/demo không nhãn.
- [ ] Loading/error/empty state được xử lý nếu có API.
- [ ] A11y không bị giảm.
- [ ] Mobile/responsive không bị phá nếu liên quan.
- [ ] Docs cập nhật nếu route/API/architecture/process đổi.
- [ ] Lint/build/test liên quan đã chạy hoặc có lý do rõ nếu chưa chạy.

### 15.2. Checklist tự review cho refactor page lớn

- [ ] Page sau refactor ngắn hơn hoặc trách nhiệm rõ hơn.
- [ ] Hook mới không chứa JSX.
- [ ] Component render không chứa API call trực tiếp.
- [ ] Normalize/validation không nằm trong JSX dài.
- [ ] Import không vòng lặp.
- [ ] Selector test quan trọng giữ ổn định.
- [ ] Không tạo shared component quá domain-specific.

### 15.3. Checklist tự review cho API/service

- [ ] Endpoint trong `endpoints.js`.
- [ ] Service dùng `apiRequest`.
- [ ] Auth flag đúng.
- [ ] Error được xử lý nhất quán.
- [ ] Pagination/query params đúng.
- [ ] Request payload không chứa field thừa nhạy cảm.
- [ ] Response normalize nếu cần.
- [ ] Không log response chứa dữ liệu y tế.

### 15.4. Checklist tự review cho CSS/UI

- [ ] Không thêm CSS feature vào global nếu không cần.
- [ ] Dùng token thay vì hard-code tùy tiện.
- [ ] Có focus-visible.
- [ ] Có disabled/loading state.
- [ ] Có empty/error state.
- [ ] Không dùng color làm tín hiệu duy nhất.
- [ ] Screenshot/evidence đã có nếu visual thay đổi.

---

## 16. Mẫu PR description chuẩn

```md
## Summary
Tách Admin AI Configs section khỏi AdminWorkspacePage để giảm kích thước page và chuẩn bị migration feature-first.

## Why
AdminWorkspacePage đang chứa nhiều domain CRUD trong một file lớn. Việc tách từng section giúp giảm rủi ro regression, dễ review và dễ test hơn.

## Changes
- Thêm `features/admin/ai-configs/AdminAiConfigsSection.jsx`
- Thêm `features/admin/ai-configs/useAdminAiConfigs.js`
- Reuse table/form/toolbar hiện có
- `AdminWorkspacePage` chỉ render section component

## Not changed
- Không đổi endpoint
- Không đổi route
- Không đổi API payload
- Không đổi role/access
- Không đổi UI copy chính

## Test evidence
- `npm run lint`: pass
- `npm run build`: pass
- `npx playwright test tests/e2e/admin-ai-configs.spec.js`: pass
- Manual: list/create/update/delete AI config checked in preview

## Risk
Rủi ro regression admin AI configs ở mức trung bình vì có di chuyển state/handler. Đã giữ selector và service call cũ.

## Rollback
Revert PR này sẽ đưa logic AI configs về `AdminWorkspacePage` như trước.

## Docs
- Cập nhật checklist migration admin nếu cần.
```

### 16.1. PR docs-only

```md
## Summary
Cập nhật SOP refactor frontend để bổ sung quy trình xử lý API error và rollback.

## Changes
- Bổ sung checklist API service
- Bổ sung mẫu PR description
- Bổ sung playbook E2E fail sau refactor

## Test evidence
Docs-only. Không chạy test runtime.

## Risk
Thấp. Không đổi code production.
```

### 16.2. PR có rủi ro cao

```md
## Risk area
- [x] Auth/session
- [ ] Payment/subscription
- [ ] AI/symptom/medical safety
- [ ] Admin CRUD
- [x] Deploy/env
- [ ] CSS/layout

## Required reviewer
- Tech lead hoặc owner auth/deploy phải review.

## Rollback plan
- Revert PR nếu login/logout hoặc production env fail.
- Nếu env production sai, rollback deployment và restore env cũ trên hosting.
```

---

## 17. Quy trình review dành cho reviewer

### 17.1. Reviewer cần đọc theo thứ tự

1. Đọc PR Summary/Why/Scope.
2. Kiểm tra file changed list.
3. Xác định risk area.
4. Kiểm tra behavior change có được ghi rõ không.
5. Review code theo layer: route -> page -> feature -> service -> UI -> CSS -> test.
6. Kiểm tra evidence.
7. Kiểm tra docs nếu route/API/architecture/process đổi.

### 17.2. Reviewer không chỉ comment style

Reviewer phải kiểm tra:

- thay đổi có đúng layer không;
- có bypass API layer không;
- có phá route/access/premium không;
- có tăng rủi ro security/safety không;
- có mock/demo không nhãn không;
- có loading/error/empty state không;
- có đủ evidence không;
- có cần chia nhỏ PR không.

### 17.3. Mẫu review comment chuẩn

Khi import sai layer:

```txt
File này đang import trực tiếp từ layer không phù hợp. Theo boundary rule, UI nên gọi hook/service của feature hoặc shared API public export. Hãy chuyển logic này về service/hook và chỉ expose API cần dùng.
```

Khi thiếu loading/error state:

```txt
Flow này gọi API nhưng chưa có loading/error/empty state. Vui lòng bổ sung state tối thiểu để user không bị blank UI hoặc hiểu nhầm request đã thành công.
```

Khi PR quá rộng:

```txt
PR đang kết hợp refactor, đổi behavior và đổi CSS. Vui lòng tách thành các PR nhỏ hơn: 1) behavior-preserving refactor, 2) behavior fix, 3) CSS update.
```

Khi có demo/mock không nhãn:

```txt
Vì đây là capability liên quan sức khỏe, mock/demo phải được gắn nhãn rõ hoặc ẩn khỏi production surface. Vui lòng bổ sung banner/copy hoặc feature flag.
```

Khi thiếu docs:

```txt
Thay đổi này có ảnh hưởng route/API/architecture nên docs cần được cập nhật. Vui lòng cập nhật tài liệu liên quan hoặc ghi rõ follow-up đã được tạo với owner.
```

### 17.4. Khi nào reviewer phải chặn merge

Reviewer phải request changes nếu:

- có secret/key/token thật;
- API provider secret nằm trong frontend;
- private/admin/premium route có thể bypass;
- mock y tế hiển thị như dữ liệu thật;
- lint/build fail;
- test liên quan fail không có quyết định chấp nhận rủi ro;
- PR quá rộng không thể review;
- auth/payment/API contract thay đổi không có evidence;
- CSS global lớn không có visual evidence.

---

## 18. Playbook xử lý tình huống thường gặp

### 18.1. API trả dữ liệu khác shape dự kiến

Dấu hiệu:

- UI crash vì `undefined`;
- list rỗng dù backend có data;
- field tên khác như `id`, `userId`, `identityId`;
- pagination nằm ở shape khác;
- backend bọc response trong `data`, `result`, `items` không nhất quán.

Cách xử lý:

1. Không sửa tạm trong JSX.
2. Ghi lại response sample đã ẩn dữ liệu nhạy cảm.
3. Tạo hoặc sửa normalize helper trong service/model.
4. UI chỉ nhận shape đã normalize.
5. Thêm test normalize nếu logic quan trọng.
6. Cập nhật backend contract docs nếu contract đổi.

Không làm:

```jsx
{user.name || user.fullName || user.displayName || user.email || "Unknown"}
```

Nên làm:

```js
export function normalizeUser(record) {
  return {
    id: record.id ?? record.userId,
    name: record.name ?? record.fullName ?? record.displayName ?? "",
    email: record.email ?? "",
  };
}
```

### 18.2. Page quá lớn nhưng chưa thể tách hết

Cách làm an toàn:

1. Tách constants/data ra file riêng.
2. Tách component render thuần trước.
3. Tách hook state/API sau.
4. Tách service/model nếu còn normalize trong page.
5. Cuối cùng dọn import và dead code.

Không tách đồng thời:

- route;
- API payload;
- CSS class names;
- UI copy;
- behavior;
- test selectors.

### 18.3. CSS regression sau khi move class

Quy trình:

1. So sánh screenshot trước/sau.
2. Tìm selector bị mất specificity/order.
3. Không thêm `!important` để chữa nhanh trừ khi có lý do rõ.
4. Đặt CSS vào đúng layer.
5. Chạy lại visual hoặc manual các route liên quan.
6. Ghi note trong PR nếu selector/order có thay đổi.

### 18.4. Form validation quá dài trong component

Dấu hiệu:

- component có nhiều `if` validate trước submit;
- error message hard-code trong handler;
- validate bị lặp ở nhiều form;
- khó test invalid cases.

Cách xử lý:

1. Tạo `validateXForm(values)` trong `model/` hoặc `utils/` của feature.
2. Hàm trả về object errors.
3. Component chỉ gọi validate và render error.
4. Unit test validate nếu flow quan trọng.

Ví dụ:

```js
export function validateProfileForm(values) {
  const errors = {};
  if (!values.fullName?.trim()) errors.fullName = "Vui lòng nhập họ tên.";
  if (values.height && Number(values.height) <= 0) errors.height = "Chiều cao không hợp lệ.";
  return errors;
}
```

### 18.5. Loading/error state bị duplicate ở nhiều page

Dấu hiệu:

- mỗi page tự viết spinner khác nhau;
- error copy không thống nhất;
- empty state lúc có, lúc không;
- cùng một lỗi API hiển thị nhiều kiểu.

Cách xử lý:

1. Tạo shared UI pattern: `LoadingState`, `ErrorState`, `EmptyState`.
2. Feature truyền message/action cụ thể.
3. Không hard-code business copy trong shared primitive nếu quá domain-specific.
4. Document pattern trong UI docs.

### 18.6. Phát hiện circular dependency

Dấu hiệu:

- build warning;
- import lạ giữa feature và shared;
- component shared import feature;
- service import UI.

Cách xử lý:

1. Xác định chiều import đúng.
2. Shared không import feature.
3. Service không import component.
4. Router không import logic feature quá sâu nếu không cần.
5. Tạo public export ở `index.js` nếu cần.
6. Nếu dependency cần dùng hai chiều, trích phần chung ra `shared/lib` hoặc `shared/model`.

### 18.7. Build pass nhưng runtime blank page

Checklist kiểm tra:

- console error có import undefined không;
- dynamic import/lazy route có fallback không;
- route switch có case mới không;
- component export/import named vs default đúng không;
- error boundary có bắt không;
- CSS không ẩn root/main content;
- env thiếu làm service throw ngay khi render không.

---

## 19. Quy trình rollback và hotfix

### 19.1. Khi nào cần rollback

Rollback nếu:

- production không login được;
- payment không hoạt động;
- admin không truy cập được;
- private route bị public;
- AI/symptom đưa thông tin nguy hiểm do thay đổi frontend;
- deploy trỏ sai backend;
- app blank page trên route chính;
- lỗi không thể hotfix an toàn trong thời gian ngắn.

### 19.2. Quy trình rollback

1. Xác định lỗi thuộc route/API/auth/UI/env.
2. Nếu lỗi production nghiêm trọng, rollback deployment trước.
3. Tạo hotfix branch từ commit ổn định hoặc revert PR gây lỗi.
4. Chỉ sửa nguyên nhân trực tiếp.
5. Chạy test tối thiểu liên quan.
6. Deploy hotfix.
7. Thêm regression test sau hotfix.
8. Cập nhật risk register nếu là rủi ro mới.

### 19.3. Mẫu hotfix PR

```md
## Summary
Hotfix redirect loop khi user non-premium truy cập `/chat`.

## Root cause
PR trước đổi returnTo handling nhưng chưa test premium route với user đã login non-premium.

## Fix
- Sửa `withReturnTo` để không tạo nested returnTo.
- Thêm case E2E cho `/chat` non-premium.

## Test evidence
- npm run build: pass
- npm run test:e2e:routes: pass
- Manual: non-premium `/chat` -> `/pricing?returnTo=/chat`

## Rollback
Có thể revert hotfix nếu route redirect khác bị ảnh hưởng, nhưng test route đã pass.
```

### 19.4. Postmortem ngắn sau lỗi nghiêm trọng

Không cần dài, nhưng phải có:

```md
## Incident
Ngày/giờ, lỗi gì, ảnh hưởng route/user nào.

## Root cause
Nguyên nhân kỹ thuật cụ thể.

## Detection
Phát hiện bằng user report, monitoring, QA hay CI.

## Resolution
Rollback/hotfix thế nào.

## Prevention
Test/guardrail/docs nào cần thêm.
```

---

## 20. Checklist hoàn thành task

Trước khi chuyển task sang Done:

- [ ] Scope đúng.
- [ ] Out-of-scope không bị sửa ngầm.
- [ ] Code đã tự review.
- [ ] Lint/build pass hoặc ghi rõ lý do không chạy được.
- [ ] Test liên quan pass.
- [ ] Manual evidence có nếu cần.
- [ ] Không thêm secret/mock nguy hiểm.
- [ ] Không phá route/access.
- [ ] Không bypass API layer.
- [ ] Loading/error/empty state đủ nếu có API.
- [ ] A11y/mobile được kiểm nếu UI thay đổi.
- [ ] Docs cập nhật nếu cần.
- [ ] Reviewer approve.
- [ ] CI main/preview pass sau merge.

---

## 21. Checklist release production

### 21.1. Lệnh tối thiểu trước release

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
npx playwright test tests/e2e/admin-users.spec.js
npx playwright test tests/e2e/admin-doctors.spec.js
npx playwright test tests/e2e/admin-facilities.spec.js
npx playwright test tests/e2e/admin-ai-configs.spec.js
```

Nếu có thay đổi payment:

```bash
npx playwright test tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js
```

Nếu có thay đổi symptom/map:

```bash
npx playwright test tests/e2e/symptom-diagnosis.spec.js tests/e2e/map-ux.spec.js
```

### 21.2. Release gate cho domain y tế

Trước release, phải kiểm:

- [ ] Demo/Mock liên quan records/medication/symptom có nhãn hoặc bị ẩn production.
- [ ] Symptom/AI không dùng wording khẳng định chẩn đoán.
- [ ] Emergency copy không bị xóa.
- [ ] Không log triệu chứng/hồ sơ/token.
- [ ] API provider secret không nằm trong client.
- [ ] Backend URL production đúng môi trường.

### 21.3. Sau release

- [ ] Kiểm tra landing.
- [ ] Kiểm tra login/logout.
- [ ] Kiểm tra private route chính.
- [ ] Kiểm tra payment return/cancel nếu có thay đổi payment.
- [ ] Kiểm tra admin route nếu có thay đổi admin.
- [ ] Kiểm tra console không có error nghiêm trọng.
- [ ] Kiểm tra monitoring/log nếu có.
- [ ] Ghi release note nếu thay đổi đáng kể.

---

## 22. Mẫu checklist reviewer copy vào PR

```md
## Reviewer checklist

### Scope
- [ ] PR có một mục tiêu chính
- [ ] Scope rõ
- [ ] Không trộn refactor và behavior change không giải thích

### Architecture
- [ ] Đúng layer
- [ ] Không gọi API trực tiếp trong UI
- [ ] Không tạo dependency ngược
- [ ] Không tăng god component

### Security/safety
- [ ] Không secret/token/API key
- [ ] Không hard-code production env/IP
- [ ] Không log PII/medical data
- [ ] Không mock/demo y tế không nhãn

### UX/state
- [ ] Loading state đủ
- [ ] Error state đủ
- [ ] Empty state đủ nếu list có thể rỗng
- [ ] A11y/mobile không bị giảm

### Test/docs
- [ ] Lint/build evidence có
- [ ] Test liên quan có
- [ ] Manual evidence đủ nếu chưa automation
- [ ] Docs cập nhật nếu cần
```

---

## 23. Sprint workflow đề xuất cho refactor

### 23.1. Sprint planning

Mỗi sprint refactor nên có:

- tối đa 1-2 task P0/P1 rủi ro cao;
- một số task P1/P2 nhỏ giúp giảm nợ kỹ thuật;
- một task docs/process nếu docs đang stale;
- thời gian review rõ;
- owner/reviewer cho từng vùng nhạy cảm.

### 23.2. Ví dụ sprint 1

| Task | Ưu tiên | Owner | Reviewer | Evidence |
| --- | --- | --- | --- | --- |
| Remove AI provider key from frontend | P0 | Senior | Tech lead | build scan + manual chat |
| Demo inventory records/medication | P0 | Mid | Senior | inventory + screenshots |
| Extract admin overview | P1 | Mid | Senior | build + admin manual |
| Add PR template | P3 | Junior | Senior | PR template preview |

### 23.3. Ví dụ sprint 2

| Task | Ưu tiên | Owner | Reviewer | Evidence |
| --- | --- | --- | --- | --- |
| Extract admin AI configs | P1 | Senior | Tech lead | admin-ai-configs spec |
| Add API error state pattern | P1 | Senior | Senior | mock error screenshots |
| Route access E2E improvements | P1/P2 | QA/Dev | Senior | route test output |
| CSS global freeze policy docs | P3 | Mid | Senior | docs update |

---

## 24. Training workflow cho developer mới

### 24.1. Ngày 1

Developer mới cần:

1. Đọc `00_INDEX.md`.
2. Đọc `01_TONG_QUAN_DU_AN.md`.
3. Đọc `02_CAU_TRUC_CODE_VA_LUONG_HOAT_DONG.md`.
4. Chạy app local nếu có thể.
5. Chạy `npm run lint` và `npm run build`.
6. Ghi lại lỗi môi trường nếu có.

### 24.2. Ngày 2-3

Task phù hợp:

- docs-only update;
- tách constants/content tĩnh;
- thêm empty state đơn giản;
- thêm unit test cho utility nhỏ;
- audit mock/demo inventory;
- sửa UI primitive nhỏ có reviewer sát.

Không giao ngay:

- auth/token/session;
- payment;
- AI provider;
- route role/premium;
- deploy env;
- refactor toàn bộ page lớn.

### 24.3. Tiêu chí hoàn thành onboarding kỹ thuật

Developer mới đạt yêu cầu nếu có thể giải thích:

- app mount từ đâu;
- route được resolve ở đâu;
- API call phải đi qua service nào;
- vì sao không gọi fetch trong component;
- vì sao mock y tế phải gắn nhãn;
- khi sửa route cần test gì;
- khi mở PR cần evidence gì;
- khi nào phải báo tech lead.

---

## 25. Appendix A: Command checklist

### 25.1. Grep kiểm tra API direct call

```bash
rg -n "fetch\(|axios\.|XMLHttpRequest|/api/" src/pages src/components
```

Kết quả cần review thủ công vì một số string `/api/` trong docs/copy có thể hợp lệ. Nhưng mọi API runtime trong page/component cần được chuyển về service.

### 25.2. Grep kiểm tra secret/env

```bash
rg -n "VITE_.*KEY|ANTHROPIC|OPENAI|apiKey|x-api-key|secret|token" src .env* vite.config.js vercel.json
```

Không phải mọi `token` đều sai, nhưng phải kiểm tra nếu có token/key thật hoặc log token.

### 25.3. Grep kiểm tra mock/demo

```bash
rg -n "MOCK_|mock|demo|placeholder|TODO: Replace|fake" src docs
```

Mọi mock/demo production surface cần owner và policy.

### 25.4. Kiểm tra bundle sau build

```bash
npm run build
rg -n "ANTHROPIC|OPENAI|sk-|apiKey|x-api-key|VITE_.*KEY" dist
```

### 25.5. Kiểm tra console log nhạy cảm

```bash
rg -n "console\.log|console\.debug|console\.info|console\.warn|console\.error" src
```

Không phải mọi console đều sai, nhưng không được log PII, medical data, token, provider key, payment payload nhạy cảm.

---

## 26. Appendix B: Definition of Ready và Definition of Done

### 26.1. Definition of Ready

Task chỉ nên bắt đầu khi có:

- [ ] Mục tiêu rõ.
- [ ] Phạm vi file dự kiến.
- [ ] Out-of-scope rõ.
- [ ] Reviewer phù hợp.
- [ ] Test/evidence dự kiến.
- [ ] Rủi ro được ghi nếu đụng auth/payment/API/route/deploy/medical safety.
- [ ] Rollback plan nếu rủi ro cao.

### 26.2. Definition of Done

Task được xem là done khi:

- [ ] Code đúng scope.
- [ ] Lint/build pass hoặc có giải thích được chấp nhận.
- [ ] Test liên quan pass.
- [ ] Manual evidence đủ nếu automation chưa có.
- [ ] Không thêm secret/mock nguy hiểm.
- [ ] Không phá route/access.
- [ ] Docs cập nhật nếu cần.
- [ ] Reviewer approve.
- [ ] CI/preview sau merge ổn.

---

## 27. Appendix C: Các quyết định cần hỏi tech lead

Phải báo tech lead trước khi làm nếu task:

- đụng auth/token/session;
- đụng payment/subscription;
- đụng deploy/env/Vercel;
- đụng AI provider/safety prompt;
- bật/tắt capability production;
- refactor file lớn hơn 1.000 dòng;
- đổi route/access;
- xóa CSS lớn;
- đổi API contract với backend;
- thay đổi cách lưu dữ liệu người dùng;
- thay đổi copy liên quan y tế, chẩn đoán, cấp cứu.

Mẫu tin nhắn báo tech lead:

```txt
Em chuẩn bị làm task P1 tách Admin AI configs khỏi AdminWorkspacePage.
Scope dự kiến: AdminWorkspacePage + features/admin/ai-configs + admin-ai-configs E2E.
Không đổi API/route/role/CSS global.
Rủi ro: state/handler CRUD bị di chuyển.
Test: lint, build, admin-ai-configs spec, manual CRUD.
Anh/chị xác nhận scope này ổn trước khi em bắt đầu.
```

---

## 28. Appendix D: Anti-pattern cần tránh

### 28.1. API trong component

Không làm:

```jsx
useEffect(() => {
  fetch("/api/users").then(...);
}, []);
```

Nên làm:

```jsx
useEffect(() => {
  usersApi.list().then(...);
}, []);
```

Tốt hơn nếu state phức tạp:

```jsx
const { users, isLoading, error, reload } = useAdminUsers();
```

### 28.2. Form validate lẫn trong JSX

Không làm:

```jsx
<button onClick={() => {
  if (!name) setError("...");
  if (!email.includes("@")) setError("...");
  // nhiều logic tiếp
}}>Save</button>
```

Nên làm:

```js
const errors = validateUserForm(values);
if (hasErrors(errors)) return setErrors(errors);
```

### 28.3. Shared component biết quá nhiều domain

Không làm:

```jsx
<Button variant="adminDeleteDoctorDangerPaymentPlan" />
```

Nên làm:

```jsx
<Button variant="danger" />
```

Domain-specific copy/action nằm ở feature.

### 28.4. CSS global cho mọi thứ

Không làm:

```css
/* global.css */
.admin-ai-config-card-new-special-layout { ... }
```

Nên làm:

```txt
features/admin/ai-configs/admin-ai-configs.css
```

### 28.5. Mock fallback không nhãn

Không làm:

```js
catch {
  setRecords(MOCK_RECORDS);
}
```

Nên làm:

```js
catch {
  setError("Không tải được hồ sơ thật. Dữ liệu demo không được hiển thị trong môi trường production.");
}
```

Hoặc nếu demo route có chủ đích:

```jsx
<DemoBanner message="Đây là dữ liệu minh họa, không phải hồ sơ y tế thật." />
```

---

## 29. Kết luận vận hành

Refactor chuyên nghiệp không phải là sửa thật nhiều code trong một lần. Refactor chuyên nghiệp là giảm rủi ro từng bước, giữ behavior quan trọng, có test/evidence rõ, giúp reviewer hiểu nhanh và giúp developer sau này không lặp lại lỗi cũ.

Đối với MediMate AI Frontend, những vùng cần kỷ luật cao nhất là:

1. auth/session/token;
2. payment/subscription;
3. AI/symptom/medical safety;
4. API layer/backend contract;
5. route/access/premium/role;
6. admin CRUD;
7. env/deploy;
8. CSS global/design system;
9. mock/demo production surface.

Mỗi PR nên làm repo tốt hơn một bước nhỏ nhưng chắc chắn. Không ưu tiên rewrite toàn bộ. Ưu tiên refactor incremental, có test bảo vệ và có tài liệu cập nhật theo code.


---

## 30. Appendix E: Template triển khai nhanh theo vùng code

### Template triển khai nhanh: Admin AI configs

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/admin/ai-configs` |
| Test chính | `tests/e2e/admin-ai-configs.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Admin AI configs` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/admin/ai-configs/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/admin-ai-configs.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/admin-ai-configs.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/admin-ai-configs.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Admin users

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/admin/users` |
| Test chính | `tests/e2e/admin-users.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Admin users` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/admin/users/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/admin-users.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/admin-users.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/admin-users.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Admin doctors

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/admin/doctors` |
| Test chính | `tests/e2e/admin-doctors.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Admin doctors` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/admin/doctors/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/admin-doctors.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/admin-doctors.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/admin-doctors.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Admin facilities

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/admin/facilities` |
| Test chính | `tests/e2e/admin-facilities.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Admin facilities` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/admin/facilities/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/admin-facilities.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/admin-facilities.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/admin-facilities.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Symptom analysis

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/symptom-analysis` |
| Test chính | `tests/e2e/symptom-diagnosis.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Symptom analysis` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/symptom-analysis/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/symptom-diagnosis.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/symptom-diagnosis.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/symptom-diagnosis.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Payment

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/payment` |
| Test chính | `tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Payment` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/payment/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/payments.spec.js tests/e2e/payment-results.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Map/Nearby clinic

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P2 |
| Folder mục tiêu | `features/map` |
| Test chính | `tests/e2e/map-ux.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Map/Nearby clinic` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/map/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/map-ux.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/map-ux.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/map-ux.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.


### Template triển khai nhanh: Auth forms

| Trường | Nội dung |
| --- | --- |
| Ưu tiên | P1 |
| Folder mục tiêu | `features/auth` |
| Test chính | `tests/e2e/routes.spec.js` |

#### Mục tiêu

Tách hoặc chuẩn hóa vùng `Auth forms` theo hướng giữ behavior hiện tại, giảm logic trong page lớn, đưa state/API vào hook/service đúng tầng và tạo evidence rõ cho reviewer.

#### Scope đề xuất

```txt
- src/pages/<page liên quan>.jsx
- src/features/auth/*
- src/components/<component liên quan>/* nếu reuse
- tests/e2e/routes.spec.js
```

#### Out-of-scope mặc định

```txt
- Không đổi route path
- Không đổi access/role/premium gate
- Không đổi API payload nếu task là refactor
- Không đổi UI copy lớn
- Không sửa CSS global ngoài selector liên quan
```

#### Các bước thực hiện

1. Ghi baseline lint/build.
2. Copy JSX hiện tại sang section/component mới.
3. Giữ selector/test id cũ nếu có.
4. Tách state/API sang hook nếu section đã render ổn.
5. Tách normalize/validation ra model/helper nếu còn nằm trong render.
6. Dọn import/dead code trong page cũ.
7. Chạy test `tests/e2e/routes.spec.js` và lint/build.
8. Ghi evidence trong PR.

#### Rủi ro

- Di chuyển state làm mất loading/error state.
- Selector E2E bị brittle.
- CSS phụ thuộc thứ tự import.
- Service call bị gọi nhiều lần do dependency `useEffect` sai.

#### Cách verify

```bash
npm run lint
npm run build
npx playwright test tests/e2e/routes.spec.js
```

Manual verify:

- mở route liên quan;
- kiểm tra loading/error/empty;
- kiểm tra action chính;
- kiểm tra refresh route;
- kiểm tra mobile nếu UI bị ảnh hưởng.
