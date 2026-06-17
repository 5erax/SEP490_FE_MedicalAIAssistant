# Checklist refactor và nâng cấp repo frontend React

> Dùng cho: Frontend Developer, Senior Frontend Engineer, Tech Lead, Reviewer, QA.  
> Phạm vi: repo frontend React/Vite, có routing, API service, auth, form, dashboard/admin/patient workspace.  
> Mục tiêu: giúp team refactor theo từng bước nhỏ, có tiêu chí kiểm tra rõ ràng, giảm rủi ro phá app khi nâng cấp kiến trúc.

## Cách sử dụng tài liệu này

Tài liệu này được thiết kế như một checklist triển khai thực tế, không phải tài liệu lý thuyết. Mỗi checklist item có cùng format để developer có thể tạo issue, làm branch, mở PR và reviewer có thể đánh giá theo tiêu chí thống nhất.

### Quy ước mức ưu tiên

| Mức | Ý nghĩa | Khi nào làm |
| --- | --- | --- |
| High | Ảnh hưởng trực tiếp đến maintainability, bug production, auth, API, data flow, release gate | Làm trước hoặc chặn merge nếu code mới vi phạm |
| Medium | Cải thiện chất lượng, onboarding, performance, testability nhưng không nhất thiết chặn release ngay | Đưa vào sprint refactor gần nhất |
| Low | Cải thiện polish, documentation, consistency hoặc tối ưu nhỏ | Làm khi có thời gian hoặc khi chạm vào module liên quan |

### Nguyên tắc refactor an toàn

1. Không refactor toàn bộ app trong một PR.
2. Mỗi PR chỉ nên đụng một nhóm vấn đề chính: structure, component, API, routing, state, form, performance hoặc docs.
3. Không thay đổi behavior nghiệp vụ nếu task chỉ là refactor.
4. Mọi thay đổi liên quan API/auth/route phải có test hoặc bằng chứng manual test rõ ràng.
5. Code mới phải đi theo chuẩn mới, code cũ migrate dần theo từng feature.
6. Nếu chưa có test bảo vệ, phải tạo test hoặc ghi rõ checklist manual trước khi tách logic.
7. Không gọi `fetch`/`axios` trực tiếp trong component/page.
8. Không hard-code endpoint, token, role, route path rải rác nhiều nơi.
9. Không để UI gọi API mà thiếu loading, error, empty state.
10. Không merge PR nếu reviewer không xác định được phạm vi thay đổi.

### Definition of Ready cho một task refactor

Một task chỉ nên bắt đầu khi có đủ:

- mục tiêu rõ ràng;
- phạm vi file/thư mục rõ ràng;
- checklist item tương ứng trong tài liệu này;
- rủi ro đã biết;
- cách kiểm tra sau khi sửa;
- rollback plan nếu đụng route/auth/API/payment/admin;
- acceptance criteria viết được dưới dạng pass/fail.

### Definition of Done chung cho mọi PR refactor

Một PR được xem là hoàn thành khi:

- lint pass;
- build pass;
- test liên quan pass hoặc có bằng chứng manual test;
- không phát sinh duplicate code mới;
- không bypass API layer/router/auth guard;
- component có loading/error/empty state nếu có async data;
- file/folder đặt đúng chuẩn;
- docs được cập nhật nếu thay đổi architecture, route, API, env hoặc flow chính;
- reviewer có thể hiểu thay đổi qua PR description mà không phải đọc toàn bộ repo.

# 1. Project Structure


## 1.1. Kiểm tra và lập bản đồ cấu trúc thư mục hiện tại

### Mục tiêu

Xác định repo hiện đang tổ chức theo kiểu nào, module nào đang bị đặt sai tầng, file nào quá lớn, logic nào đang bị trộn giữa page, component, service và utility. Kết quả cuối cùng phải là một bản đồ rõ ràng: hiện tại code nằm ở đâu, trách nhiệm của từng folder là gì, điểm nào cần migrate trước.

### Vấn đề thường gặp

Trong repo React phát triển nhanh, cấu trúc thường bị trộn lẫn:

- `pages/` chứa cả UI, API call, validation, mapping DTO, business logic;
- `components/` chứa cả shared component lẫn feature component;
- `utils/` chứa logic nghiệp vụ nhưng không ai biết nơi nào đang dùng;
- CSS global phình to, class dùng chung nhưng ảnh hưởng nhiều màn hình;
- route, role, permission, navigation metadata bị khai báo ở nhiều nơi;
- file lớn như `AdminWorkspacePage.jsx`, `UserWorkspaceShell.jsx`, `DashboardPage.jsx` khó review vì chứa quá nhiều section.

### Cách thực hiện

1. Chạy thống kê file lớn:

```bash
find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 wc -l \
  | sort -nr \
  | head -30
```

2. Tạo bảng inventory cho từng folder:

```md
| Folder | Vai trò hiện tại | Vai trò mong muốn | Vấn đề | Hành động |
| --- | --- | --- | --- | --- |
| src/pages | Chứa page và nhiều logic | Chỉ compose page-level layout | Page quá dài | Tách feature |
| src/components | Vừa shared vừa feature | Shared UI rõ ràng | Duplicate card/button | Phân loại |
| src/services | API client và domain service | Tầng API duy nhất | Một số API call nằm ngoài services | Migrate |
```

3. Search các dấu hiệu sai tầng:

```bash
grep -R "fetch(" src
grep -R "axios" src
grep -R "localStorage" src
grep -R "window.location" src
grep -R "navigate(" src
grep -R "process.env\|import.meta.env" src
```

4. Với mỗi kết quả, phân loại:

- hợp lệ ở tầng hiện tại;
- cần migrate ngay vì rủi ro cao;
- migrate sau khi có test;
- giữ nguyên tạm thời nhưng thêm TODO có mã issue.

5. Chụp trạng thái hiện tại vào tài liệu `docs/architecture/current-structure.md` hoặc cập nhật checklist hiện có.

### Ví dụ trước khi sửa

```txt
src/
  pages/
    AdminWorkspacePage.jsx       # 2500 dòng, chứa table, modal, API call, validation
    SymptomAnalysisPage.jsx      # gọi fetch trực tiếp
  components/
    Button.jsx
    PatientRecordCard.jsx        # thực ra chỉ dùng trong feature patient
  utils/
    api.js                       # trùng trách nhiệm với services/apiClient.js
```

### Ví dụ sau khi sửa

```txt
src/
  app/
    App.jsx
    providers/
  routes/
    routeConfig.js
    ProtectedRoute.jsx
  shared/
    components/
      Button/
      Modal/
      EmptyState/
    hooks/
    lib/
    styles/
  services/
    apiClient.js
    endpoints.js
  features/
    admin/
      components/
      hooks/
      services/
      pages/
    symptom-analysis/
      components/
      hooks/
      services/
      pages/
```

### File/thư mục liên quan

- `src/pages/`
- `src/components/`
- `src/services/`
- `src/router/` hoặc `src/routes/`
- `src/styles/`
- `src/utils/`
- `vite.config.*`
- `package.json`

### Rủi ro

- Đổi import path hàng loạt có thể phá build.
- Di chuyển file nhưng quên update test hoặc route lazy import.
- Tách folder trước khi hiểu dependency có thể tạo circular dependency.
- Nếu refactor structure cùng lúc với sửa logic nghiệp vụ, reviewer khó phát hiện bug.

### Cách kiểm tra

- Chạy `npm run lint`.
- Chạy `npm run build`.
- Search lại import path cũ.
- Mở app local và truy cập toàn bộ route chính.
- Kiểm tra console browser không có lỗi module not found.
- PR description phải có bảng trước/sau và danh sách file di chuyển.

### Độ ưu tiên

High


## 1.2. Đề xuất cấu trúc feature-first chuẩn cho repo React

### Mục tiêu

Chuẩn hóa cấu trúc project theo hướng feature-first để mỗi tính năng có nơi đặt page, component, hook, service, schema, type và test riêng. Mục tiêu là developer mới nhìn vào folder có thể hiểu domain nghiệp vụ mà không phải search toàn bộ repo.

### Vấn đề thường gặp

Cấu trúc theo loại file thuần túy như `components/`, `pages/`, `hooks/`, `services/` dễ hiểu lúc đầu nhưng khi app lớn sẽ gây các vấn đề:

- feature bị rải ở 5-7 folder khác nhau;
- xóa một feature khó biết phải xóa file nào;
- component private của feature bị import nhầm ở nơi khác;
- service API của feature không nằm gần UI dùng nó;
- test khó tổ chức vì không biết test thuộc feature nào.

### Cách thực hiện

1. Giữ `shared/` cho code dùng lại thật sự.
2. Tạo `features/` cho các module nghiệp vụ.
3. Mỗi feature có cấu trúc nhất quán:

```txt
features/<feature-name>/
  pages/              # page entry cho route
  components/         # component chỉ dùng trong feature này
  hooks/              # hooks xử lý data, state, side effect của feature
  services/           # API/domain service của feature, nếu không đặt ở services global
  schemas/            # validation schema
  constants/          # constant private của feature
  utils/              # helper private của feature
  tests/              # test gần feature
  index.js            # public exports có kiểm soát
```

4. `shared/` chỉ chứa thứ đạt đủ 3 điều kiện:

- được dùng bởi ít nhất 2 feature;
- không phụ thuộc business logic của một feature;
- API props đủ ổn định để dùng lâu dài.

5. `app/` chỉ chứa bootstrap và provider cấp app:

```txt
app/
  App.jsx
  providers/
    AppProviders.jsx
    QueryProvider.jsx
    AuthProvider.jsx
```

6. `routes/` chỉ chứa route config, guard, lazy loading, not found route.

7. Không cho feature import ngược từ feature khác trừ khi thông qua public API hoặc shared abstraction.

### Ví dụ trước khi sửa

```jsx
// src/pages/AdminWorkspacePage.jsx
import DoctorTable from '../components/DoctorTable';
import { approveDoctor } from '../services/api';
import { validateDoctor } from '../utils/validation';
```

### Ví dụ sau khi sửa

```jsx
// src/features/admin/pages/AdminWorkspacePage.jsx
import { DoctorApprovalSection } from '../components/DoctorApprovalSection';
import { useDoctorApproval } from '../hooks/useDoctorApproval';
```

```txt
src/features/admin/
  pages/AdminWorkspacePage.jsx
  components/DoctorApprovalSection.jsx
  hooks/useDoctorApproval.js
  services/adminDoctorService.js
  schemas/doctorApprovalSchema.js
```

### File/thư mục liên quan

- `src/features/`
- `src/shared/`
- `src/app/`
- `src/routes/`
- `src/services/`
- `src/pages/` cũ
- `src/components/` cũ

### Rủi ro

- Tạo quá nhiều folder khi feature còn nhỏ có thể làm code rườm rà.
- Di chuyển ồ ạt có thể gây conflict lớn giữa các nhánh.
- Nếu không quy định public export, feature này có thể import sâu vào internals của feature khác.

### Cách kiểm tra

- Mỗi feature có README ngắn hoặc comment mô tả scope nếu domain phức tạp.
- Không còn component feature-specific nằm trong `shared/components`.
- Không còn page import trực tiếp từ `src/components` nếu component đó thuộc feature riêng.
- Chạy script kiểm tra circular dependency nếu có, ví dụ `madge`.

### Độ ưu tiên

High


## 1.3. Quy tắc đặt file vào đúng thư mục

### Mục tiêu

Thiết lập quy tắc rõ ràng để mọi developer biết file mới phải đặt ở đâu. Việc này giảm tranh luận trong review, giảm duplicate code và giúp onboarding nhanh hơn.

### Vấn đề thường gặp

Developer thường đặt file theo cảm tính:

- component mới cứ cho vào `components/` dù chỉ dùng một page;
- helper nghiệp vụ bị đưa vào `utils/` global;
- hook gọi API được đặt trong `hooks/` global nhưng chỉ dùng một feature;
- constant route/API/status được khai báo ngay trong component;
- CSS của feature bị thêm vào `global.css`.

### Cách thực hiện

Áp dụng bảng quyết định sau:

| Loại file | Đặt ở đâu | Điều kiện |
| --- | --- | --- |
| Page route entry | `features/<feature>/pages` | Được route import trực tiếp |
| Component chỉ dùng trong một feature | `features/<feature>/components` | Không export sang feature khác |
| Component dùng chung nhiều feature | `shared/components` | Không chứa business logic |
| Hook chỉ dùng trong một feature | `features/<feature>/hooks` | Có logic data/state của feature |
| Hook dùng chung | `shared/hooks` | Không phụ thuộc domain cụ thể |
| API service | `services/` hoặc `features/<feature>/services` | Không nằm trong component |
| Endpoint constants | `services/endpoints.js` | Không hard-code trong UI |
| Validation schema | `features/<feature>/schemas` | Gắn với form/DTO của feature |
| Pure helper | `shared/lib` hoặc feature `utils` | Không gọi API, không side effect |
| Style token | `shared/styles` | Dùng toàn app |
| CSS feature | `features/<feature>/styles` hoặc CSS module | Chỉ ảnh hưởng feature |
| Test | cạnh file hoặc `tests/` trong feature | Dễ tìm khi sửa feature |

Quy tắc reviewer cần áp dụng:

1. Hỏi “file này thuộc business domain nào?” trước khi merge.
2. Nếu chỉ dùng một feature, không đưa vào shared.
3. Nếu file cần dùng lại, kiểm tra có đủ generic chưa.
4. Nếu file import domain-specific model, không được đặt trong shared.
5. Nếu file gọi API, không được đặt trong component.

### Ví dụ trước khi sửa

```txt
src/components/DoctorApprovalModal.jsx
src/utils/doctorStatus.js
src/hooks/useDoctorApproval.js
```

Các file này đều chỉ phục vụ admin doctor approval nhưng bị rải ở global folders.

### Ví dụ sau khi sửa

```txt
src/features/admin-doctor-approval/
  components/DoctorApprovalModal.jsx
  hooks/useDoctorApproval.js
  constants/doctorStatus.js
  services/doctorApprovalService.js
```

### File/thư mục liên quan

- `src/components/`
- `src/hooks/`
- `src/utils/`
- `src/features/`
- `src/shared/`

### Rủi ro

- Nếu đưa quá nhiều thứ vào shared, shared trở thành “thùng rác mới”.
- Nếu chia feature quá nhỏ, code bị phân mảnh và khó theo dõi.
- Nếu không update import alias, đường dẫn `../../../` sẽ xuất hiện nhiều.

### Cách kiểm tra

- PR không thêm file mới vào global folder nếu không giải thích lý do.
- Search usage của file mới: nếu chỉ một feature dùng, phải nằm trong feature.
- Import path rõ ràng, không có chuỗi `../../../../` quá dài.
- Reviewer có thể xác định owner của file.

### Độ ưu tiên

High


## 1.4. Migration từng phần mà không phá vỡ app

### Mục tiêu

Đưa repo từ cấu trúc cũ sang cấu trúc mới theo từng bước nhỏ, bảo toàn behavior hiện tại, giảm conflict và dễ rollback.

### Vấn đề thường gặp

Migration structure thường thất bại vì:

- di chuyển quá nhiều file trong một PR;
- đổi tên file kèm sửa logic nghiệp vụ;
- không có test route/API trước khi migrate;
- route lazy import bị sai sau khi đổi path;
- CSS đổi scope làm vỡ UI nhiều màn hình;
- team đang làm feature mới bị conflict import path.

### Cách thực hiện

1. Chọn một feature nhỏ trước, ví dụ `symptom-analysis`, `profile`, `settings` thay vì admin workspace lớn.
2. Tạo folder feature mới nhưng chưa xóa file cũ.
3. Di chuyển component leaf trước, page sau.
4. Giữ public API qua `index.js` nếu cần:

```js
// src/features/symptom-analysis/index.js
export { SymptomAnalysisPage } from './pages/SymptomAnalysisPage';
```

5. Update route import sang path mới.
6. Chạy lint/build.
7. Test route liên quan.
8. Xóa file cũ sau khi chắc chắn không còn import.
9. Ghi migration note trong PR.

Chiến lược PR nên chia như sau:

```txt
PR 1: Tạo folder feature + move component không đổi logic
PR 2: Tách hook/service khỏi page
PR 3: Chuẩn hóa loading/error/empty state
PR 4: Thêm test cho feature
PR 5: Dọn import cũ và cập nhật docs
```

### Ví dụ trước khi sửa

```jsx
// routes.js
import SymptomAnalysisPage from '../pages/SymptomAnalysisPage';
```

### Ví dụ sau khi sửa

```jsx
// routes.js
const SymptomAnalysisPage = lazy(() =>
  import('../features/symptom-analysis/pages/SymptomAnalysisPage')
);
```

### File/thư mục liên quan

- route config
- moved page/component files
- test imports
- storybook imports nếu có
- docs architecture
- alias config trong `vite.config.*` hoặc `jsconfig.json`

### Rủi ro

- Import path sai làm route blank page.
- Duplicate file cũ/mới tồn tại song song quá lâu gây sửa nhầm.
- CSS import order thay đổi làm khác visual.
- Barrel export không kiểm soát có thể che giấu dependency xấu.

### Cách kiểm tra

- `npm run lint`
- `npm run build`
- Mở route đã migrate.
- Search file cũ trong repo.
- Kiểm tra network/API flow không đổi.
- So sánh screenshot trước/sau nếu UI quan trọng.

### Độ ưu tiên

High


# 2. Components


## 2.1. Tách component lớn thành component nhỏ có trách nhiệm rõ ràng

### Mục tiêu

Giảm complexity của page/component lớn bằng cách tách thành các component nhỏ, dễ đọc, dễ test và dễ reuse trong phạm vi phù hợp. Component nhỏ phải có trách nhiệm rõ ràng, không chỉ tách file để giảm số dòng.

### Vấn đề thường gặp

Một component lớn thường có các dấu hiệu:

- trên 300-500 dòng;
- nhiều `useState`, `useEffect` không liên quan nhau;
- vừa render layout, vừa gọi API, vừa validate form;
- có nhiều modal/table/filter/card trong cùng file;
- function handler dài và phụ thuộc nhiều state;
- reviewer không thể hiểu hết behavior trong một lần đọc.

### Cách thực hiện

1. Chia component theo section UI trước:

```txt
AdminWorkspacePage
  Header
  StatsCards
  DoctorApprovalSection
  FacilityManagementSection
  AiConfigurationSection
  AuditLogSection
```

2. Với mỗi section, xác định input/output:

```txt
DoctorApprovalSection
Input: doctors, loading, error
Output: onApprove, onReject, onRefresh
Không tự biết route, không tự đọc localStorage, không tự tạo token.
```

3. Tách logic async sang hook:

```txt
useDoctorApproval()
  doctors
  loading
  error
  approveDoctor()
  rejectDoctor()
  refresh()
```

4. Page chỉ compose:

```jsx
export function AdminWorkspacePage() {
  const doctorApproval = useDoctorApproval();

  return (
    <WorkspaceLayout>
      <DoctorApprovalSection {...doctorApproval} />
    </WorkspaceLayout>
  );
}
```

5. Không tách component nếu component mới chỉ wrap 2 dòng JSX và không tăng rõ readability.

### Ví dụ trước khi sửa

```jsx
function AdminWorkspacePage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    fetch('/api/admin/doctors')
      .then((res) => res.json())
      .then(setDoctors);
  }, []);

  async function handleApprove(id) {
    await fetch(`/api/admin/doctors/${id}/approve`, { method: 'POST' });
    setDoctors((items) => items.filter((item) => item.id !== id));
  }

  return (
    <div>
      <h1>Admin</h1>
      <table>{/* 200 dòng */}</table>
      <div>{/* modal */}</div>
      <div>{/* stats */}</div>
    </div>
  );
}
```

### Ví dụ sau khi sửa

```jsx
function AdminWorkspacePage() {
  const doctorApproval = useDoctorApproval();

  return (
    <AdminWorkspaceLayout title="Admin workspace">
      <DoctorApprovalSection
        doctors={doctorApproval.doctors}
        loading={doctorApproval.loading}
        error={doctorApproval.error}
        onApprove={doctorApproval.approveDoctor}
        onReject={doctorApproval.rejectDoctor}
        onRetry={doctorApproval.refresh}
      />
    </AdminWorkspaceLayout>
  );
}
```

```jsx
function DoctorApprovalSection({ doctors, loading, error, onApprove, onReject, onRetry }) {
  if (loading) return <DoctorApprovalSkeleton />;
  if (error) return <SectionError message={error.message} onRetry={onRetry} />;
  if (doctors.length === 0) return <EmptyState title="Không có hồ sơ chờ duyệt" />;

  return <DoctorApprovalTable doctors={doctors} onApprove={onApprove} onReject={onReject} />;
}
```

### File/thư mục liên quan

- `src/pages/*Page.jsx`
- `src/features/*/pages/`
- `src/features/*/components/`
- `src/features/*/hooks/`

### Rủi ro

- Tách quá nhỏ làm prop truyền qua nhiều tầng.
- Tách component nhưng vẫn để API call trong component con.
- Đổi lifecycle khi chuyển logic sang hook làm API gọi nhiều lần.
- Làm mất state khi component bị unmount/remount.

### Cách kiểm tra

- Page chính giảm số dòng và chỉ compose layout/sections.
- Component con có props rõ ràng.
- Không có behavior nghiệp vụ bị đổi ngoài phạm vi.
- React DevTools không cho thấy render loop bất thường.
- Test hoặc manual test đủ flow: load, success, error, empty, action.

### Độ ưu tiên

High


## 2.2. Phân biệt shared component, feature component và layout component

### Mục tiêu

Ngăn tình trạng component dùng một lần bị đưa vào shared, hoặc shared component chứa business logic. Việc phân loại đúng giúp repo dễ mở rộng, tránh dependency chéo và giảm duplicate UI.

### Vấn đề thường gặp

- `components/Button.jsx` có nhiều variant riêng cho admin/patient/landing.
- `components/Card.jsx` chứa cả layout và logic status của hồ sơ bệnh án.
- `Layout.jsx` vừa render sidebar vừa fetch user profile vừa kiểm tra role.
- Component feature bị import ở nhiều nơi vì đặt trong shared.

### Cách thực hiện

Áp dụng 3 nhóm:

#### Shared component

Đặt tại `src/shared/components`. Chỉ chứa UI primitive hoặc pattern thật sự dùng chung.

Ví dụ hợp lệ:

- `Button`
- `Input`
- `Modal`
- `Spinner`
- `EmptyState`
- `ErrorMessage`
- `ConfirmDialog`
- `DataTable` nếu đủ generic

Không chứa endpoint, role, medical status, admin-specific logic.

#### Feature component

Đặt tại `src/features/<feature>/components`. Chỉ phục vụ feature cụ thể.

Ví dụ:

- `DoctorApprovalTable`
- `SymptomQuestionnaire`
- `PatientRecordTimeline`
- `PaymentPlanCard`

#### Layout component

Đặt tại `src/layouts` hoặc `src/shared/layouts` nếu dùng nhiều feature. Chỉ quản lý bố cục, navigation slot, sidebar, header, content area. Auth check nên nằm ở route guard/provider, không nhét vào layout nếu có thể.

### Ví dụ trước khi sửa

```jsx
// src/components/Card.jsx
export function Card({ type, record, doctor, paymentPlan }) {
  if (type === 'doctor') return <DoctorCard doctor={doctor} />;
  if (type === 'record') return <PatientRecordCard record={record} />;
  if (type === 'payment') return <PaymentPlanCard plan={paymentPlan} />;
  return null;
}
```

### Ví dụ sau khi sửa

```jsx
// src/shared/components/Card/Card.jsx
export function Card({ children, title, footer }) {
  return (
    <section className="card">
      {title ? <header className="card__header">{title}</header> : null}
      <div className="card__body">{children}</div>
      {footer ? <footer className="card__footer">{footer}</footer> : null}
    </section>
  );
}
```

```jsx
// src/features/patient-records/components/PatientRecordCard.jsx
import { Card } from '@/shared/components/Card';

export function PatientRecordCard({ record }) {
  return (
    <Card title={record.title}>
      <p>{record.summary}</p>
      <RecordStatusBadge status={record.status} />
    </Card>
  );
}
```

### File/thư mục liên quan

- `src/components/`
- `src/shared/components/`
- `src/features/*/components/`
- `src/layouts/`

### Rủi ro

- Shared component quá generic có thể khó dùng.
- Feature component bị đưa lên shared quá sớm sẽ tạo API props kém ổn định.
- Layout chứa auth logic có thể gây redirect ngoài ý muốn.

### Cách kiểm tra

- Shared component không import từ `features/`.
- Shared component không gọi API.
- Feature component không bị dùng chéo trực tiếp bởi feature khác.
- Layout không chứa domain-specific business logic.

### Độ ưu tiên

High


## 2.3. Chuẩn hóa quy tắc đặt tên component và file

### Mục tiêu

Giúp codebase nhất quán, dễ search, dễ hiểu quan hệ giữa file và component. Tên component phải phản ánh vai trò, không mơ hồ, không phụ thuộc vị trí tạm thời.

### Vấn đề thường gặp

- File tên `index.jsx`, `Main.jsx`, `Content.jsx` quá nhiều nơi.
- Component tên `Card`, `Modal`, `Table` nhưng thực ra là doctor/patient/payment specific.
- Có nơi dùng `doctor-card.jsx`, nơi khác dùng `DoctorCard.jsx`.
- Component default export làm rename tùy ý khi import.

### Cách thực hiện

1. Component React dùng PascalCase:

```txt
DoctorApprovalTable.jsx
PatientProfileForm.jsx
PaymentPlanCard.jsx
```

2. Hook dùng camelCase và bắt đầu bằng `use`:

```txt
useDoctorApproval.js
useSymptomQuestions.js
useAuthSession.js
```

3. Service dùng camelCase hoặc domain suffix:

```txt
doctorApprovalService.js
symptomAnalysisService.js
authService.js
```

4. Không dùng tên quá chung trong feature:

```txt
Sai: Table.jsx
Đúng: DoctorApprovalTable.jsx
```

5. Ưu tiên named export cho component quan trọng:

```jsx
export function DoctorApprovalTable() {}
```

6. `index.js` chỉ export public API, không biến folder thành nơi giấu logic.

### Ví dụ trước khi sửa

```jsx
// src/components/table.jsx
export default function Table(props) {
  return <table>{/* doctor approval only */}</table>;
}
```

```jsx
import X from '../components/table';
```

### Ví dụ sau khi sửa

```jsx
// src/features/admin/components/DoctorApprovalTable.jsx
export function DoctorApprovalTable({ doctors, onApprove, onReject }) {
  return <table>{/* doctor approval */}</table>;
}
```

```jsx
import { DoctorApprovalTable } from '../components/DoctorApprovalTable';
```

### File/thư mục liên quan

- toàn bộ `src/**/*.jsx`
- `src/**/*.tsx` nếu có TypeScript
- import trong tests/storybook nếu có

### Rủi ro

- Rename file trên Windows/macOS có thể không phát hiện case-sensitive issue nhưng Linux CI fail.
- Đổi default export sang named export cần update toàn bộ import.
- Rename nhiều file dễ tạo conflict.

### Cách kiểm tra

- Chạy build trên môi trường case-sensitive nếu có CI Linux.
- Search component cũ không còn import.
- ESLint rule import/export không báo lỗi.
- Reviewer nhìn tên file hiểu được domain.

### Độ ưu tiên

Medium


## 2.4. Chuẩn hóa props và tránh component nhận quá nhiều dữ liệu

### Mục tiêu

Giữ interface component rõ ràng, tránh component nhận object khổng lồ hoặc nhiều props không liên quan. Props tốt giúp component dễ test, dễ reuse và ít bug khi data shape API thay đổi.

### Vấn đề thường gặp

- Component nhận nguyên `user`, `doctor`, `record`, `config` rồi tự đọc nhiều field bên trong.
- Component nhận 15-20 props do page quản lý quá nhiều state.
- Props boolean chồng chéo: `isAdmin`, `isDoctor`, `isPatient`, `isPremium`.
- Component con tự mutate object props.
- Callback không đặt tên theo hành động.

### Cách thực hiện

1. Props phải mô tả đúng nhu cầu render.
2. Nếu component chỉ cần `name` và `avatarUrl`, không truyền cả `user`.
3. Nếu props vượt 8-10 props, xem xét:

- gom thành object có nghĩa;
- tách component;
- đưa logic vào hook;
- dùng context nếu state thật sự global.

4. Callback đặt tên theo event/action:

```txt
onSubmit
onCancel
onApproveDoctor
onRetry
onSelectRecord
```

5. Không dùng props mơ hồ:

```txt
Sai: onClick, data, item, type
Đúng: onApprove, doctor, appointment, variant
```

6. Với JS repo, dùng `PropTypes` hoặc JSDoc cho component phức tạp nếu chưa migrate TypeScript.

### Ví dụ trước khi sửa

```jsx
function DoctorCard({ data, type, isAdmin, handleClick }) {
  return (
    <div onClick={() => handleClick(data.id)}>
      <h3>{data.fullName}</h3>
      {isAdmin && <button>Duyệt</button>}
    </div>
  );
}
```

### Ví dụ sau khi sửa

```jsx
function DoctorApprovalCard({ doctorName, specialty, licenseCode, onApprove, onReject }) {
  return (
    <article>
      <h3>{doctorName}</h3>
      <p>{specialty}</p>
      <p>Mã giấy phép: {licenseCode}</p>
      <button type="button" onClick={onApprove}>Duyệt</button>
      <button type="button" onClick={onReject}>Từ chối</button>
    </article>
  );
}
```

### File/thư mục liên quan

- component trong `src/components/`
- component trong `src/features/*/components/`
- page truyền props xuống nhiều tầng

### Rủi ro

- Tách props từ object có thể cần update nhiều nơi.
- Nếu component đang phụ thuộc field ẩn, refactor có thể thiếu data.
- Callback tạo inline nhiều có thể tăng render nếu truyền vào list lớn.

### Cách kiểm tra

- Component có thể render bằng mock props đơn giản.
- Test component không cần mock cả API response lớn.
- Không có props object tên `data` nếu domain có thể đặt tên rõ.
- Không mutate props.

### Độ ưu tiên

Medium


## 2.5. Quy tắc tránh duplicate UI

### Mục tiêu

Giảm việc copy-paste UI như button, modal, loading, error, empty state, badge, table, form field. Duplicate UI làm giao diện thiếu nhất quán và khiến mỗi lần đổi design phải sửa nhiều nơi.

### Vấn đề thường gặp

- Mỗi page tự viết spinner/loading text.
- Modal confirm xóa/duyệt/từ chối bị copy nhiều lần.
- Button style hard-code class khác nhau.
- Error message API mỗi nơi hiển thị một kiểu.
- Empty state không nhất quán.

### Cách thực hiện

1. Tìm duplicate bằng search:

```bash
grep -R "Đang tải\|Loading\|Không có dữ liệu\|Có lỗi xảy ra" src
grep -R "confirm(" src
grep -R "className=.*button" src
```

2. Tạo shared UI primitive:

```txt
shared/components/Button
shared/components/Modal
shared/components/ConfirmDialog
shared/components/LoadingState
shared/components/ErrorState
shared/components/EmptyState
shared/components/Badge
```

3. Tạo variant có kiểm soát:

```jsx
<Button variant="primary" size="md" isLoading={isSubmitting}>
  Lưu thay đổi
</Button>
```

4. Với UI domain-specific, tạo component feature bọc shared primitive:

```jsx
function DoctorStatusBadge({ status }) {
  return <Badge tone={doctorStatusToneMap[status]}>{doctorStatusLabelMap[status]}</Badge>;
}
```

5. Không đưa toàn bộ domain logic vào `Badge` shared.

### Ví dụ trước khi sửa

```jsx
{loading && <p className="loading">Loading...</p>}
{error && <p style={{ color: 'red' }}>{error}</p>}
{items.length === 0 && <div>No data</div>}
```

### Ví dụ sau khi sửa

```jsx
if (loading) return <LoadingState label="Đang tải danh sách bác sĩ" />;
if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
if (items.length === 0) return <EmptyState title="Chưa có dữ liệu" description="Danh sách sẽ hiển thị khi có hồ sơ mới." />;
```

### File/thư mục liên quan

- `src/shared/components/`
- `src/components/` cũ
- tất cả page có loading/error/empty UI
- CSS button/modal/card/table

### Rủi ro

- Shared component quá phức tạp vì cố cover mọi case.
- Đổi UI shared có thể ảnh hưởng nhiều màn hình.
- Nếu không có visual check, style regression khó phát hiện.

### Cách kiểm tra

- Search duplicate text/style giảm rõ rệt.
- Các trạng thái loading/error/empty hiển thị cùng pattern.
- Button/modal/table dùng shared primitive ở feature mới.
- Chạy visual/manual check cho route chính.

### Độ ưu tiên

Medium


# 3. API Layer


## 3.1. Chuẩn hóa API client duy nhất cho toàn app

### Mục tiêu

Tất cả request HTTP phải đi qua một API client duy nhất để chuẩn hóa base URL, headers, token, timeout, parse response, error normalization và unauthorized handling. Component/page không được gọi `fetch` hoặc `axios` trực tiếp.

### Vấn đề thường gặp

- Mỗi feature tự viết `fetch('/api/...')`.
- Có nơi dùng `axios`, nơi dùng `fetch`.
- Token được lấy từ `localStorage` ở nhiều component.
- API error shape khác nhau làm UI phải xử lý nhiều nhánh.
- Khi backend đổi response, phải sửa nhiều màn hình.

### Cách thực hiện

1. Tạo hoặc chuẩn hóa file `src/services/apiClient.js`.
2. API client nhận config:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

3. Tạo function dùng chung:

```js
export async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method ?? 'GET',
      headers: buildHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? controller.signal,
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      throw normalizeApiError(response, payload);
    }

    return normalizeApiResponse(payload);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

4. Tạo `endpoints.js` để quản lý endpoint:

```js
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    me: '/api/auth/me',
  },
  symptomAnalysis: {
    suggestQuestions: '/api/symptom-analysis/suggest-clinical-questions',
  },
};
```

5. Mỗi domain service dùng `apiRequest`, không để UI biết endpoint.

### Ví dụ trước khi sửa

```jsx
async function loadQuestions(userInput) {
  const res = await fetch('http://server/api/symptom-analysis/suggest-clinical-questions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ userInput }),
  });
  return res.json();
}
```

### Ví dụ sau khi sửa

```js
// services/symptomAnalysisService.js
import { apiRequest } from './apiClient';
import { endpoints } from './endpoints';

export function suggestClinicalQuestions(userInput) {
  return apiRequest(endpoints.symptomAnalysis.suggestQuestions, {
    method: 'POST',
    body: { userInput },
  });
}
```

```jsx
// component/hook
const result = await suggestClinicalQuestions(input);
```

### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/services/endpoints.js`
- `src/services/*Service.js`
- `src/features/*/services/`
- pages/components đang gọi API trực tiếp

### Rủi ro

- Chuẩn hóa response sai có thể làm vỡ feature đang phụ thuộc raw response.
- Unauthorized handling nếu redirect ngay trong apiClient có thể gây loop.
- Timeout quá ngắn gây lỗi giả trên mạng chậm.

### Cách kiểm tra

- `grep -R "fetch(" src` không còn fetch trong component/page, trừ apiClient.
- `grep -R "axios" src` chỉ xuất hiện trong apiClient nếu dùng axios.
- Test login/authenticated request/unauthorized request.
- Verify loading/error UI vẫn đúng sau khi đổi API layer.

### Độ ưu tiên

High


## 3.2. Tách API call khỏi component bằng service và custom hook

### Mục tiêu

Component chỉ render UI và nhận callback/data. Logic gọi API, mapping response, retry, refetch, cancellation và state async phải được đưa vào service/hook để dễ test và tái sử dụng.

### Vấn đề thường gặp

- `useEffect` trong page gọi API trực tiếp.
- Component có 5-10 hàm `handleLoad`, `handleSubmit`, `handleDelete` chứa request logic.
- UI biết quá nhiều về response backend.
- Không hủy request khi component unmount.

### Cách thực hiện

1. Tạo service thuần cho API.
2. Tạo hook quản lý async state.
3. Component gọi hook và render theo state.

```js
export function useSymptomQuestions() {
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async (userInput) => {
    setStatus('loading');
    setError(null);
    try {
      const data = await suggestClinicalQuestions(userInput);
      setQuestions(data.questions ?? []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  return { questions, status, error, loadQuestions };
}
```

4. Không để hook render JSX.
5. Không để service phụ thuộc React.

### Ví dụ trước khi sửa

```jsx
function SymptomPage() {
  const [questions, setQuestions] = useState([]);

  async function submit() {
    const res = await fetch('/api/symptom-analysis/suggest-clinical-questions');
    const json = await res.json();
    setQuestions(json.data.questions);
  }

  return <button onClick={submit}>Phân tích</button>;
}
```

### Ví dụ sau khi sửa

```jsx
function SymptomPage() {
  const { questions, status, error, loadQuestions } = useSymptomQuestions();

  return (
    <SymptomQuestionnaire
      questions={questions}
      loading={status === 'loading'}
      error={error}
      onSubmit={loadQuestions}
    />
  );
}
```

### File/thư mục liên quan

- `src/pages/*`
- `src/features/*/hooks/*`
- `src/features/*/services/*`
- `src/services/*`

### Rủi ro

- Hook bị viết quá generic và khó hiểu.
- Hook giữ state global không cần thiết.
- Tách service nhưng vẫn để mapping response trong component.

### Cách kiểm tra

- Component test có thể mock hook hoặc service.
- Service test không cần render React.
- Component không import `endpoints` hoặc `apiClient` trực tiếp trừ page-level hook đặc biệt.
- Async flow có loading/error/success rõ ràng.

### Độ ưu tiên

High


## 3.3. Chuẩn hóa request/response DTO và mapping dữ liệu

### Mục tiêu

Đảm bảo frontend không phụ thuộc trực tiếp vào raw response backend ở mọi component. DTO và mapper giúp khi backend đổi field, chỉ cần sửa ở service/mapper thay vì sửa toàn bộ UI.

### Vấn đề thường gặp

- UI đọc `response.data.data.items` hoặc `response.success` trực tiếp.
- Có nơi dùng `fullName`, nơi dùng `name`, nơi dùng `doctorName`.
- Backend trả `questions: []`, UI coi là lỗi dù API success.
- Response null/undefined làm crash render.

### Cách thực hiện

1. Định nghĩa normalized model dùng trong UI:

```js
export function mapDoctorDto(dto) {
  return {
    id: String(dto.id),
    fullName: dto.fullName ?? dto.name ?? 'Không rõ tên',
    specialty: dto.specialty ?? 'Chưa cập nhật',
    status: dto.status ?? 'unknown',
  };
}
```

2. Service trả data đã normalize:

```js
export async function getPendingDoctors() {
  const response = await apiRequest(endpoints.admin.pendingDoctors);
  return (response.data?.items ?? []).map(mapDoctorDto);
}
```

3. Với API response chuẩn `{ data, success, message, errors }`, tạo helper normalize.
4. Không để component xử lý nhiều cấp response.

### Ví dụ trước khi sửa

```jsx
setQuestions(json.data.questions);
if (json.success === false) setError(json.message);
```

### Ví dụ sau khi sửa

```js
export function mapClinicalQuestionsResponse(response) {
  return {
    sessionId: response.data?.sessionId ?? null,
    questions: Array.isArray(response.data?.questions) ? response.data.questions : [],
  };
}
```

```js
export async function suggestClinicalQuestions(input) {
  const response = await apiRequest(endpoints.symptomAnalysis.suggestQuestions, {
    method: 'POST',
    body: { userInput: input },
  });
  return mapClinicalQuestionsResponse(response);
}
```

### File/thư mục liên quan

- `src/services/mappers/`
- `src/features/*/services/`
- API service files
- UI đang đọc raw response

### Rủi ro

- Mapper sai có thể che mất field backend cần dùng.
- Default value không đúng có thể làm UI hiển thị dữ liệu gây hiểu nhầm.
- Nếu mapper quá nhiều logic nghiệp vụ, khó test.

### Cách kiểm tra

- Unit test cho mapper với response đủ field, thiếu field, null, lỗi format.
- Component không chứa chuỗi `response.data.data`.
- Khi API trả empty list, UI hiển thị empty state chứ không crash.

### Độ ưu tiên

High


## 3.4. Chuẩn hóa error handling, timeout, retry và unauthorized

### Mục tiêu

Tạo một chiến lược xử lý lỗi thống nhất cho toàn frontend: lỗi network, timeout, 400 validation, 401 unauthorized, 403 forbidden, 404, 500, API business error và request bị hủy.

### Vấn đề thường gặp

- Component dùng `alert(error)`.
- 401 mỗi nơi xử lý khác nhau, có nơi redirect, có nơi im lặng.
- Timeout không có nên request treo lâu.
- Retry không kiểm soát làm duplicate submit.
- Error message backend hiển thị raw technical text cho user.

### Cách thực hiện

1. Tạo error class/shape chuẩn:

```js
export class AppError extends Error {
  constructor({ code, message, status, details, isRetryable = false }) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}
```

2. Normalize trong apiClient:

```js
function normalizeApiError(response, payload) {
  if (response.status === 401) {
    return new AppError({ code: 'UNAUTHORIZED', status: 401, message: 'Phiên đăng nhập đã hết hạn.' });
  }
  if (response.status === 403) {
    return new AppError({ code: 'FORBIDDEN', status: 403, message: 'Bạn không có quyền thực hiện thao tác này.' });
  }
  return new AppError({
    code: payload?.code ?? 'API_ERROR',
    status: response.status,
    message: payload?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.',
    details: payload?.errors,
    isRetryable: response.status >= 500,
  });
}
```

3. Quy định retry:

- chỉ retry GET hoặc request idempotent;
- không retry login/payment/create order nếu không có idempotency key;
- retry tối đa 1-2 lần;
- có delay tăng dần.

4. Unauthorized handling:

- apiClient phát event hoặc trả error `UNAUTHORIZED`;
- AuthProvider hoặc route guard xử lý clear session và redirect;
- không redirect trực tiếp ở mọi service.

### Ví dụ trước khi sửa

```js
catch (e) {
  alert('Error');
}
```

### Ví dụ sau khi sửa

```jsx
if (error?.code === 'UNAUTHORIZED') {
  return <SessionExpiredMessage onLoginAgain={redirectToLogin} />;
}

return <ErrorState message={error.message} canRetry={error.isRetryable} onRetry={onRetry} />;
```

### File/thư mục liên quan

- `src/services/apiClient.js`
- `src/services/errors.js`
- `src/app/providers/AuthProvider.jsx`
- `src/shared/components/ErrorState`
- forms/pages gọi API

### Rủi ro

- Retry sai request POST có thể tạo dữ liệu trùng.
- Clear token không đúng có thể logout user khi API phụ lỗi tạm thời.
- Error message quá chung làm QA khó debug.

### Cách kiểm tra

- Mock 400/401/403/500/timeout và xem UI.
- Verify 401 redirect đúng một lần, không loop.
- Verify POST submit không bị gửi nhiều lần khi click nhanh.
- Log kỹ thuật chỉ xuất hiện ở console/dev/logging service, không lộ raw stack cho user.

### Độ ưu tiên

High


# 4. State Management


## 4.1. Phân loại local state, server state và global UI state

### Mục tiêu

Đặt state đúng nơi để giảm prop drilling, tránh global state không cần thiết và giúp component dễ test. Mọi state phải được phân loại trước khi đưa vào context/store.

### Vấn đề thường gặp

- Dùng global context cho state chỉ cần trong một form.
- Page cha giữ tất cả state của nhiều section.
- Server data được copy vào nhiều local state khác nhau.
- Auth user được đọc từ localStorage ở nhiều component.
- Modal open state bị truyền qua nhiều tầng.

### Cách thực hiện

Phân loại theo bảng:

| Loại state | Ví dụ | Nơi đặt khuyến nghị |
| --- | --- | --- |
| Local UI state | input value, modal open, selected tab | Component gần nơi dùng nhất |
| Form state | field value, touched, validation error | Form hook/library |
| Server state | danh sách bác sĩ, hồ sơ, câu hỏi triệu chứng | React Query/SWR hoặc custom data hook |
| Global auth state | current user, token status, role | AuthProvider/store |
| Global UI state | toast, theme, sidebar collapsed | UI provider/store |
| Route state | filter/search/page từ URL | URL query params |

Quy trình quyết định:

1. State chỉ dùng trong một component? Để local.
2. State dùng bởi component cha-con gần nhau? Lift state tối đa 1-2 tầng.
3. State là dữ liệu từ API? Dùng server state hook, không copy lung tung.
4. State cần nhiều feature biết? Đưa vào provider/store.
5. State cần share qua URL/bookmark? Đưa vào query param.

### Ví dụ trước khi sửa

```jsx
const [doctorList, setDoctorList] = useState([]);
const [paymentList, setPaymentList] = useState([]);
const [selectedTab, setSelectedTab] = useState('doctor');
const [doctorModalOpen, setDoctorModalOpen] = useState(false);
const [facilityModalOpen, setFacilityModalOpen] = useState(false);
```

### Ví dụ sau khi sửa

```jsx
const [selectedTab, setSelectedTab] = useState('doctor');

return (
  <AdminTabs value={selectedTab} onChange={setSelectedTab}>
    <DoctorApprovalSection />
    <FacilityManagementSection />
  </AdminTabs>
);
```

Mỗi section tự quản lý modal local và data hook riêng.

### File/thư mục liên quan

- page lớn
- providers/context
- custom hooks
- components có nhiều props state

### Rủi ro

- Đưa state xuống quá sâu có thể làm mất khả năng sync giữa section.
- Đưa state global quá sớm làm store phình to.
- Không phân biệt server state với client state gây stale data.

### Cách kiểm tra

- State global có lý do rõ ràng.
- Component không nhận chuỗi props chỉ để truyền tiếp.
- Refresh/refetch data không làm mất UI state không liên quan.
- Test flow tab/modal/form sau refactor.

### Độ ưu tiên

High


## 4.2. Tránh prop drilling bằng composition, context đúng phạm vi và custom hooks

### Mục tiêu

Giảm truyền props qua nhiều tầng trung gian mà không lạm dụng global store. Dùng composition, context theo feature hoặc custom hook để state nằm gần domain của nó.

### Vấn đề thường gặp

- `App -> Layout -> Page -> Section -> Table -> Row -> Button` đều truyền `currentUser`, `token`, `onRefresh`.
- Component trung gian không dùng props nhưng vẫn phải nhận để truyền tiếp.
- Context toàn app chứa state của một feature nhỏ.

### Cách thực hiện

1. Nếu props chỉ phục vụ layout slot, dùng composition:

```jsx
<WorkspaceLayout sidebar={<Sidebar />} header={<Header />}>
  <DoctorApprovalSection />
</WorkspaceLayout>
```

2. Nếu state chỉ dùng trong một feature, tạo feature context:

```jsx
<DoctorApprovalProvider>
  <DoctorApprovalFilters />
  <DoctorApprovalTable />
</DoctorApprovalProvider>
```

3. Nếu state là auth/session, dùng app-level provider.
4. Không dùng context cho state thay đổi liên tục trong list lớn nếu gây render rộng.
5. Tách context read/write nếu cần tối ưu.

### Ví dụ trước khi sửa

```jsx
<DoctorTable
  doctors={doctors}
  selectedDoctor={selectedDoctor}
  setSelectedDoctor={setSelectedDoctor}
  approveDoctor={approveDoctor}
  rejectDoctor={rejectDoctor}
  refresh={refresh}
/>
```

### Ví dụ sau khi sửa

```jsx
<DoctorApprovalProvider>
  <DoctorApprovalToolbar />
  <DoctorApprovalTable />
  <DoctorApprovalDetailModal />
</DoctorApprovalProvider>
```

### File/thư mục liên quan

- components truyền props nhiều tầng
- feature hooks/context
- providers global

### Rủi ro

- Context quá lớn làm mọi consumer re-render.
- Context che giấu dependency, khó test nếu không có provider mock.
- Composition quá sâu làm JSX khó đọc nếu không đặt tên slot rõ.

### Cách kiểm tra

- Component trung gian không nhận props không dùng.
- Context chỉ bao phạm vi cần thiết.
- React DevTools kiểm tra re-render khi state thay đổi.
- Test component có helper render with provider.

### Độ ưu tiên

Medium


## 4.3. Chuẩn hóa custom hooks

### Mục tiêu

Custom hook phải gom logic có ý nghĩa, đặt tên rõ, trả API ổn định và không trộn render JSX. Hook giúp tách logic khỏi component nhưng không được trở thành nơi chứa mọi thứ không phân loại.

### Vấn đề thường gặp

- Hook tên `useData` không rõ domain.
- Hook vừa gọi API vừa navigate vừa show toast vừa mutate global state.
- Hook trả quá nhiều biến làm component phụ thuộc mạnh.
- Hook không xử lý cleanup request.

### Cách thực hiện

1. Đặt tên theo domain + hành động:

```txt
useSymptomQuestions
useDoctorApproval
usePaymentPlans
useAuthSession
```

2. Hook trả state có cấu trúc:

```js
return {
  data,
  status,
  error,
  actions: { load, refresh, approve },
};
```

Hoặc nếu team thích phẳng, phải thống nhất toàn repo.

3. Hook không render JSX.
4. Hook không hard-code endpoint.
5. Hook có cleanup nếu request có thể bị hủy.
6. Hook phải test được bằng mock service.

### Ví dụ trước khi sửa

```js
function useData() {
  const [x, setX] = useState([]);
  const navigate = useNavigate();
  async function submit() {
    const res = await fetch('/api/x');
    if (res.status === 401) navigate('/login');
  }
  return { x, submit };
}
```

### Ví dụ sau khi sửa

```js
function useDoctorApproval() {
  const [doctors, setDoctors] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      setDoctors(await getPendingDoctors());
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  return { doctors, status, error, refresh };
}
```

### File/thư mục liên quan

- `src/hooks/`
- `src/features/*/hooks/`
- page/component chứa logic lặp lại

### Rủi ro

- Hook bị over-engineering.
- Hook gọi hook khác không đúng dependency, gây stale closure.
- Hook giấu side effect khó debug.

### Cách kiểm tra

- Hook name rõ domain.
- Hook không import component UI.
- Hook không gọi raw fetch.
- Hook có dependency array đúng và không bị infinite loop.

### Độ ưu tiên

Medium


# 5. Routing


## 5.1. Chuẩn hóa route config và route metadata

### Mục tiêu

Tập trung route path, access rule, title, navigation metadata và lazy import vào một nơi để tránh route bị khai báo rải rác. Route config rõ giúp auth guard, sidebar, breadcrumb, analytics và test route hoạt động nhất quán.

### Vấn đề thường gặp

- Route path hard-code trong nhiều component.
- Sidebar tự khai báo path khác với router.
- Private route check nằm trong từng page.
- Role/premium gate thiếu nhất quán.
- Route mới không có not found hoặc breadcrumb.

### Cách thực hiện

1. Tạo `routes/routeConfig.js`:

```js
export const routes = [
  {
    id: 'symptom-analysis',
    path: '/app/symptom-analysis',
    title: 'Phân tích triệu chứng',
    access: 'auth',
    element: lazy(() => import('@/features/symptom-analysis/pages/SymptomAnalysisPage')),
    showInNavigation: true,
  },
  {
    id: 'admin',
    path: '/app/admin',
    title: 'Quản trị',
    access: 'role',
    roles: ['admin', 'staff'],
    element: lazy(() => import('@/features/admin/pages/AdminWorkspacePage')),
  },
];
```

2. Sidebar đọc từ route metadata thay vì tự viết path.
3. Page dùng route constants khi navigate.
4. Không hard-code string route ở nhiều nơi.

### Ví dụ trước khi sửa

```jsx
<button onClick={() => navigate('/dashboard/admin')}>Admin</button>
<Link to="/admin-dashboard">Quản trị</Link>
```

### Ví dụ sau khi sửa

```js
export const routePaths = {
  admin: '/app/admin',
  symptomAnalysis: '/app/symptom-analysis',
};
```

```jsx
<button onClick={() => navigate(routePaths.admin)}>Admin</button>
```

### File/thư mục liên quan

- `src/router/`
- `src/routes/`
- sidebar/navigation components
- pages dùng `navigate`

### Rủi ro

- Đổi path có thể phá bookmark/link ngoài.
- Route lazy import sai path gây blank screen.
- Metadata sai làm user thấy menu không có quyền truy cập.

### Cách kiểm tra

- Route chính truy cập được bằng URL trực tiếp.
- Sidebar link khớp route config.
- User không quyền không thấy route restricted.
- Not found hoạt động cho path sai.
- Build pass với lazy import.

### Độ ưu tiên

High


## 5.2. Bảo vệ private routes, role routes và premium routes

### Mục tiêu

Đảm bảo người dùng chỉ truy cập được route phù hợp với trạng thái đăng nhập, role và entitlement. Logic bảo vệ route phải tập trung, test được và không phụ thuộc vào việc page tự chặn.

### Vấn đề thường gặp

- Page admin tự check role trong `useEffect`.
- Route premium chỉ ẩn menu nhưng URL trực tiếp vẫn vào được.
- User chưa login thấy flash nội dung private trước khi redirect.
- Role string hard-code nhiều nơi.

### Cách thực hiện

1. Tạo `ProtectedRoute` hoặc guard dựa trên route metadata.
2. Auth loading phải có màn hình chờ, không render private content khi chưa xác định session.
3. Access rule tối thiểu:

```txt
public: không cần login
auth: cần login
premium: cần login + entitlement
role: cần login + role phù hợp
```

4. Role constants:

```js
export const roles = {
  admin: 'admin',
  staff: 'staff',
  doctor: 'doctor',
  patient: 'patient',
};
```

5. Guard trả fallback rõ:

- unauthenticated -> login;
- forbidden -> 403 page;
- premium required -> upgrade page;
- session loading -> loading shell.

### Ví dụ trước khi sửa

```jsx
function AdminPage() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user.role !== 'admin') return <Navigate to="/" />;
  return <AdminDashboard />;
}
```

### Ví dụ sau khi sửa

```jsx
function RouteGuard({ route, children }) {
  const { user, status } = useAuthSession();

  if (status === 'loading') return <FullPageLoading />;
  if (route.access === 'auth' && !user) return <Navigate to="/login" replace />;
  if (route.access === 'role' && !route.roles.includes(user.role)) return <ForbiddenPage />;
  if (route.access === 'premium' && !user.hasPremium) return <UpgradeRequiredPage />;

  return children;
}
```

### File/thư mục liên quan

- route guard
- auth provider
- route config
- navigation/sidebar
- tests route access

### Rủi ro

- Sai rule có thể mở route nhạy cảm.
- Redirect loop nếu login route cũng bị guard sai.
- Role mismatch với backend làm user hợp lệ bị chặn.

### Cách kiểm tra

- Test direct URL cho public/auth/role/premium route.
- Test user chưa login, patient, doctor, staff, admin.
- Test reload browser ở route private.
- Không thấy flash nội dung private trước redirect.

### Độ ưu tiên

High


## 5.3. Lazy loading pages và fallback route

### Mục tiêu

Tối ưu initial bundle bằng cách lazy load page/feature lớn, đồng thời có fallback UI và not found route rõ ràng để app không trắng màn hình khi route sai hoặc chunk lỗi.

### Vấn đề thường gặp

- Import tất cả pages ngay trong app entry làm bundle lớn.
- Lazy loading không có Suspense fallback.
- Route sai redirect về home gây khó debug.
- Chunk load error không có fallback.

### Cách thực hiện

1. Lazy load page-level component, không nhất thiết lazy load component nhỏ.
2. Bọc route bằng `Suspense`:

```jsx
<Suspense fallback={<FullPageLoading label="Đang tải màn hình" />}>
  <AppRoutes />
</Suspense>
```

3. Tạo `NotFoundPage` cho route `*`.
4. Với app production, cân nhắc chunk error boundary hiển thị nút reload.
5. Đặt tên chunk nếu bundler hỗ trợ và cần phân tích bundle.

### Ví dụ trước khi sửa

```js
import AdminWorkspacePage from './pages/AdminWorkspacePage';
import SymptomAnalysisPage from './pages/SymptomAnalysisPage';
import PaymentPage from './pages/PaymentPage';
```

### Ví dụ sau khi sửa

```js
const AdminWorkspacePage = lazy(() => import('@/features/admin/pages/AdminWorkspacePage'));
const SymptomAnalysisPage = lazy(() => import('@/features/symptom-analysis/pages/SymptomAnalysisPage'));
```

### File/thư mục liên quan

- route config
- app root
- page imports
- error boundary

### Rủi ro

- Lazy import default/named export sai.
- Loading fallback quá lâu nếu chunk lớn hoặc network chậm.
- Tách chunk không hợp lý làm tăng request nhỏ.

### Cách kiểm tra

- Build output có chunk theo page/feature.
- Mở từng route bằng reload trực tiếp.
- Simulate slow network xem fallback.
- Route không tồn tại hiển thị NotFoundPage.

### Độ ưu tiên

Medium


# 6. Forms


## 6.1. Chuẩn hóa validation schema và error message

### Mục tiêu

Đưa validation ra khỏi component, chuẩn hóa message tiếng Việt, đảm bảo form không submit dữ liệu sai định dạng và backend validation error được map đúng field.

### Vấn đề thường gặp

- Validation viết inline trong `handleSubmit`.
- Mỗi form dùng message khác nhau cho cùng lỗi.
- Backend trả lỗi field nhưng UI chỉ hiển thị lỗi chung.
- Không trim/normalize input trước khi submit.

### Cách thực hiện

1. Chọn một cách validation thống nhất: schema tự viết, Zod/Yup, hoặc validation helper nội bộ.
2. Đặt schema trong feature:

```txt
features/auth/schemas/loginSchema.js
features/profile/schemas/profileSchema.js
features/symptom-analysis/schemas/symptomInputSchema.js
```

3. Error message phải thân thiện, cụ thể:

```txt
Sai: Invalid input
Đúng: Vui lòng nhập triệu chứng chính trước khi phân tích.
```

4. Chuẩn hóa field error shape:

```js
{
  userInput: 'Vui lòng nhập ít nhất 3 ký tự.',
  age: 'Tuổi phải là số hợp lệ.'
}
```

5. Map backend validation error vào field tương ứng.

### Ví dụ trước khi sửa

```js
if (!email.includes('@')) {
  setError('Email sai');
  return;
}
```

### Ví dụ sau khi sửa

```js
const loginSchema = {
  validate(values) {
    const errors = {};
    if (!values.email?.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!EMAIL_REGEX.test(values.email)) errors.email = 'Email không đúng định dạng.';
    if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.';
    return errors;
  },
};
```

### File/thư mục liên quan

- form components
- feature schemas
- API error mapper
- shared form fields

### Rủi ro

- Validation frontend khác backend gây user pass frontend nhưng fail backend.
- Message quá chung không giúp user sửa.
- Validate quá sớm gây khó chịu khi user đang gõ.

### Cách kiểm tra

- Submit empty form.
- Submit invalid format.
- Submit valid form.
- Mock backend validation error.
- Kiểm tra field focus/aria-describedby nếu có accessibility requirement.

### Độ ưu tiên

High


## 6.2. Chuẩn hóa submit handling và loading state

### Mục tiêu

Đảm bảo mọi form xử lý submit an toàn: disable khi đang gửi, chống double submit, hiển thị loading, map lỗi đúng nơi và reset state đúng lúc.

### Vấn đề thường gặp

- User click submit nhiều lần tạo nhiều request.
- Loading chỉ hiện trên button nhưng form vẫn edit lung tung.
- Sau lỗi API, form mất dữ liệu user đã nhập.
- Submit handler quá dài, vừa validate, gọi API, navigate, toast, mapping.

### Cách thực hiện

1. Tách submit flow thành các bước:

```txt
validate -> normalize payload -> call service -> handle success -> handle error -> cleanup
```

2. Disable submit button khi `isSubmitting`.
3. Không clear form khi API fail trừ khi có lý do.
4. Dùng idempotency hoặc chống double click cho action nhạy cảm.
5. Với form dài, tách `use<FormName>Form`.

### Ví dụ trước khi sửa

```jsx
<button onClick={handleSubmit}>Lưu</button>
```

### Ví dụ sau khi sửa

```jsx
<form onSubmit={handleSubmit} noValidate>
  <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
    Lưu thay đổi
  </Button>
</form>
```

```js
async function handleSubmit(event) {
  event.preventDefault();
  if (isSubmitting) return;

  const errors = validate(values);
  if (hasErrors(errors)) {
    setFieldErrors(errors);
    return;
  }

  setIsSubmitting(true);
  try {
    await updateProfile(normalizeProfilePayload(values));
    showToast('Cập nhật thành công');
  } catch (error) {
    applySubmitError(error);
  } finally {
    setIsSubmitting(false);
  }
}
```

### File/thư mục liên quan

- login/register/profile/search/payment/admin forms
- shared Button
- form hooks

### Rủi ro

- Disable toàn form có thể chặn user copy dữ liệu khi lỗi.
- Reset form sai thời điểm làm mất dữ liệu.
- Loading state không reset nếu throw trước finally.

### Cách kiểm tra

- Double click submit chỉ gửi một request.
- Network error không làm mất input.
- Success flow hiển thị feedback đúng.
- Button loading reset sau success/error.

### Độ ưu tiên

High


## 6.3. Tách logic form dài khỏi component

### Mục tiêu

Giữ form component tập trung render field, error và action; logic validation, submit, normalize payload và API interaction nằm trong hook/schema/service.

### Vấn đề thường gặp

- Form component trên 300 dòng.
- Mỗi field có state riêng và handler riêng.
- Logic transform payload nằm giữa JSX.
- Field error, submit error, toast, navigate trộn trong một hàm.

### Cách thực hiện

1. Tạo hook `useXForm`:

```js
function useProfileForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => { /* validate + service */ };
  return { values, errors, isSubmitting, setFieldValue, submit };
}
```

2. Component render:

```jsx
function ProfileForm() {
  const form = useProfileForm();
  return (
    <form onSubmit={form.submit}>
      <TextField value={form.values.fullName} error={form.errors.fullName} />
    </form>
  );
}
```

3. Với form phức tạp, chia thành fieldset component.
4. Không để fieldset tự submit API.

### Ví dụ trước khi sửa

```jsx
function RegisterForm() {
  // 20 useState, 10 validators, 5 API branches, 200 lines JSX
}
```

### Ví dụ sau khi sửa

```txt
features/auth/
  components/RegisterForm.jsx
  components/RegisterAccountFields.jsx
  components/RegisterProfileFields.jsx
  hooks/useRegisterForm.js
  schemas/registerSchema.js
  services/authService.js
```

### File/thư mục liên quan

- form page/component lớn
- feature hooks
- schemas
- services

### Rủi ro

- Tách hook nhưng vẫn giữ quá nhiều responsibility trong hook.
- Fieldset component nhận quá nhiều props.
- Validation chạy khác trước gây thay đổi UX.

### Cách kiểm tra

- Form component chủ yếu là JSX.
- Submit flow test được ở hook/service.
- Manual test mọi field bắt buộc, optional, invalid, success, fail.

### Độ ưu tiên

Medium


# 7. Performance


## 7.1. Lazy loading và code splitting theo route/feature

### Mục tiêu

Giảm initial bundle và thời gian tải trang đầu bằng cách chỉ tải code của route/feature khi cần. Đặc biệt quan trọng với admin dashboard, chart, map, editor, AI workspace hoặc thư viện lớn.

### Vấn đề thường gặp

- App import toàn bộ page ngay từ đầu.
- Thư viện chart/map/editor nằm trong bundle chính dù ít dùng.
- Component modal nặng được load dù user chưa mở.
- Không đo bundle nên tối ưu cảm tính.

### Cách thực hiện

1. Lazy load page-level route.
2. Lazy load component rất nặng nếu chỉ dùng theo tương tác:

```jsx
const MapPicker = lazy(() => import('./MapPicker'));
```

3. Dùng bundle analyzer nếu có:

```bash
npm run build
npx vite-bundle-visualizer
```

4. Tách vendor lớn nếu cần qua Vite config, nhưng chỉ sau khi đo.
5. Không lazy load component nhỏ gây tăng request không đáng.

### Ví dụ trước khi sửa

```js
import AdminCharts from '@/features/admin/components/AdminCharts';
```

### Ví dụ sau khi sửa

```jsx
const AdminCharts = lazy(() => import('@/features/admin/components/AdminCharts'));

{activeTab === 'analytics' ? (
  <Suspense fallback={<ChartSkeleton />}>
    <AdminCharts />
  </Suspense>
) : null}
```

### File/thư mục liên quan

- route config
- feature nặng
- chart/map/editor components
- `vite.config.*`

### Rủi ro

- Quá nhiều chunks nhỏ làm chậm trên mạng yếu.
- Lazy load thiếu fallback gây UI trống.
- Import sai làm runtime chunk error.

### Cách kiểm tra

- So sánh bundle trước/sau.
- Lighthouse hoặc Performance tab.
- Kiểm tra route trên mạng throttling.
- Không có layout shift lớn khi lazy component load.

### Độ ưu tiên

Medium


## 7.2. Memoization hợp lý và tránh render thừa

### Mục tiêu

Giảm render không cần thiết ở list/table/form lớn nhưng không lạm dụng `memo`, `useMemo`, `useCallback`. Tối ưu phải dựa trên đo đạc hoặc dấu hiệu rõ ràng.

### Vấn đề thường gặp

- Mỗi render tạo lại array/object/callback truyền vào table lớn.
- Context value là object mới làm mọi consumer re-render.
- Filter/sort list lớn chạy lại khi gõ input không liên quan.
- Lạm dụng `useMemo` cho phép tính rẻ, làm code khó đọc.

### Cách thực hiện

1. Dùng React DevTools Profiler để xác định component render nhiều.
2. Memoize data derived tốn chi phí:

```js
const filteredDoctors = useMemo(() => {
  return doctors.filter((doctor) => matchesFilter(doctor, filters));
}, [doctors, filters]);
```

3. Memoize callback truyền vào list item nếu list lớn:

```js
const handleApprove = useCallback((doctorId) => {
  approveDoctor(doctorId);
}, [approveDoctor]);
```

4. Memoize context value:

```js
const value = useMemo(() => ({ user, status, logout }), [user, status, logout]);
```

5. Không memoize mọi thứ theo thói quen.

### Ví dụ trước khi sửa

```jsx
<AuthContext.Provider value={{ user, logout, status }}>
  {children}
</AuthContext.Provider>
```

### Ví dụ sau khi sửa

```jsx
const authValue = useMemo(() => ({ user, logout, status }), [user, logout, status]);

return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
```

### File/thư mục liên quan

- table/list lớn
- provider/context
- dashboard chart
- form nhiều field

### Rủi ro

- Dependency sai gây stale data.
- Memoization không cần thiết làm code khó đọc.
- `React.memo` không hiệu quả nếu props luôn là object mới.

### Cách kiểm tra

- Profiler cho thấy render giảm ở component mục tiêu.
- Test behavior không đổi.
- Không có stale UI sau action update.
- Dependency array được lint kiểm tra.

### Độ ưu tiên

Medium


## 7.3. Tối ưu bundle size, assets và dependency

### Mục tiêu

Giảm kích thước tải về và chi phí runtime bằng cách loại dependency không cần thiết, import đúng cách, tối ưu ảnh/assets và tránh đưa thư viện nặng vào bundle chính.

### Vấn đề thường gặp

- Cài nhiều thư viện chỉ dùng một function nhỏ.
- Import cả icon library thay vì từng icon.
- Ảnh PNG/JPG lớn không nén.
- Asset demo nằm trong production bundle.
- Dependency cũ không còn dùng nhưng vẫn trong package.json.

### Cách thực hiện

1. Kiểm tra dependency:

```bash
npm ls --depth=0
npx depcheck
```

2. Kiểm tra import nặng:

```bash
grep -R "from 'lodash'\|from \"lodash\"" src
grep -R "from 'moment'\|from \"moment\"" src
```

3. Thay bằng import nhỏ hoặc native API nếu phù hợp.
4. Nén ảnh, dùng WebP/SVG hợp lý.
5. Lazy load asset lớn theo route.
6. Không để file mock/demo nặng trong production path nếu không cần.

### Ví dụ trước khi sửa

```js
import _ from 'lodash';
const name = _.capitalize(value);
```

### Ví dụ sau khi sửa

```js
function capitalize(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

### File/thư mục liên quan

- `package.json`
- `src/assets/`
- import icon/chart/date libraries
- Vite build output

### Rủi ro

- Gỡ dependency đang dùng động nhưng depcheck không phát hiện.
- Tối ưu ảnh làm giảm chất lượng quá mức.
- Thay date library bằng native sai timezone/locale.

### Cách kiểm tra

- Build pass sau khi gỡ dependency.
- Bundle report giảm hoặc không tăng bất thường.
- UI ảnh/icon vẫn đúng.
- Date/time format vẫn đúng locale/timezone.

### Độ ưu tiên

Medium


# 8. Error Handling


## 8.1. Thêm Error Boundary cho route và vùng UI quan trọng

### Mục tiêu

Ngăn lỗi render ở một component làm trắng toàn bộ app. Error Boundary phải cung cấp fallback UI rõ ràng, có nút reload/quay lại và logging kỹ thuật.

### Vấn đề thường gặp

- Một field null làm crash cả dashboard.
- Lazy chunk lỗi làm màn hình trắng.
- Không có log nên khó biết lỗi production.
- User chỉ thấy blank page.

### Cách thực hiện

1. Tạo `AppErrorBoundary` cho toàn app.
2. Tạo route-level boundary nếu router hỗ trợ.
3. Tạo fallback UI:

```jsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <section role="alert">
      <h1>Đã xảy ra lỗi</h1>
      <p>Vui lòng tải lại trang hoặc quay lại màn hình trước.</p>
      <button onClick={resetErrorBoundary}>Thử lại</button>
    </section>
  );
}
```

4. Log lỗi bằng service riêng:

```js
logClientError(error, { area: 'admin-workspace' });
```

5. Không hiển thị stack trace cho user production.

### Ví dụ trước khi sửa

```jsx
root.render(<App />);
```

### Ví dụ sau khi sửa

```jsx
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
```

### File/thư mục liên quan

- app root
- route root
- shared error components
- logging service

### Rủi ro

- Boundary che lỗi nhưng không log.
- Fallback không reset được state lỗi.
- Error Boundary không bắt async error trong event handler; cần xử lý riêng.

### Cách kiểm tra

- Tạo component test throw error và xem fallback.
- Verify log được gọi.
- Verify user có thể reload/quay lại.
- Async API error không bị nhầm với render error.

### Độ ưu tiên

High


## 8.2. Chuẩn hóa fallback UI cho API, form, auth và empty state

### Mục tiêu

Người dùng luôn nhận được phản hồi rõ ràng khi dữ liệu đang tải, rỗng, lỗi API, lỗi quyền truy cập hoặc lỗi form. UI không được im lặng hoặc crash.

### Vấn đề thường gặp

- API lỗi nhưng section vẫn trống.
- Empty list hiển thị như lỗi.
- 403 hiển thị “Có lỗi xảy ra” gây nhầm.
- Form error hiển thị ở top nhưng field không biết lỗi nào.

### Cách thực hiện

Chuẩn hóa fallback theo loại:

| Loại | Component | Nội dung cần có |
| --- | --- | --- |
| Loading | `LoadingState`/Skeleton | user biết đang tải gì |
| Empty | `EmptyState` | title, description, optional CTA |
| API error | `ErrorState` | message, retry nếu phù hợp |
| Form error | `FieldError`, `SubmitError` | field message, submit message |
| Auth error | `SessionExpired`, `Forbidden` | hành động tiếp theo |

### Ví dụ trước khi sửa

```jsx
{!items.length && <div />}
```

### Ví dụ sau khi sửa

```jsx
if (status === 'loading') return <LoadingState label="Đang tải hồ sơ" />;
if (status === 'error') return <ErrorState message={error.message} onRetry={reload} />;
if (records.length === 0) {
  return (
    <EmptyState
      title="Chưa có hồ sơ"
      description="Hồ sơ sẽ xuất hiện sau khi bạn tạo hoặc được bác sĩ cập nhật."
    />
  );
}
```

### File/thư mục liên quan

- all async pages/components
- shared fallback components
- auth guard pages
- form fields

### Rủi ro

- Message không chính xác với domain y tế có thể gây hiểu nhầm.
- Retry action ở request không idempotent có thể nguy hiểm.
- Empty state thiếu phân biệt giữa “chưa có data” và “không có quyền xem”.

### Cách kiểm tra

- Mock loading/success/empty/error/403/401.
- QA kiểm tra message có đúng ngữ cảnh.
- Retry chỉ xuất hiện khi request an toàn.
- Không còn blank section khi API fail.

### Độ ưu tiên

High


## 8.3. Logging strategy cho frontend

### Mục tiêu

Có cách ghi nhận lỗi frontend đủ để debug nhưng không lộ dữ liệu nhạy cảm. Logging cần phân biệt dev console, production monitoring và user-facing message.

### Vấn đề thường gặp

- `console.log` rải rác production.
- Log cả token, request body, thông tin sức khỏe nhạy cảm.
- Không log context route/user action nên khó debug.
- User message và technical error bị trộn.

### Cách thực hiện

1. Tạo logging service:

```js
export function logClientError(error, context = {}) {
  if (import.meta.env.DEV) {
    console.error(error, context);
    return;
  }

  // send to monitoring provider if configured
}
```

2. Redact dữ liệu nhạy cảm:

```js
function sanitizeContext(context) {
  const { token, password, medicalText, ...safe } = context;
  return safe;
}
```

3. Log ở các điểm:

- Error Boundary;
- API client error normalization;
- route guard unexpected state;
- payment/auth/admin action fail;
- chunk load error.

4. Không log full request body chứa triệu chứng/hồ sơ nếu không có chính sách rõ.

### Ví dụ trước khi sửa

```js
console.log('payload', payload);
console.error(error);
```

### Ví dụ sau khi sửa

```js
logClientError(error, {
  area: 'symptom-analysis',
  action: 'suggest-clinical-questions',
  status: error.status,
});
```

### File/thư mục liên quan

- logging service
- apiClient
- ErrorBoundary
- critical feature actions

### Rủi ro

- Log dữ liệu y tế/PII/token gây rủi ro bảo mật.
- Log quá nhiều gây nhiễu và tăng chi phí.
- Không có correlation id làm khó trace backend/frontend.

### Cách kiểm tra

- Search `console.log` trước khi merge.
- Test log không chứa token/password/sensitive text.
- Production build không in debug noise.
- Error có đủ area/action/status để debug.

### Độ ưu tiên

Medium


# 9. Testing


## 9.1. Unit test cho utility, mapper, validation và service helper

### Mục tiêu

Bảo vệ các logic thuần dễ sai: mapper API, validation schema, formatter, permission helper, route access helper, error normalizer. Đây là test rẻ, chạy nhanh và giúp refactor tự tin hơn.

### Vấn đề thường gặp

- Mapper đổi field làm UI vỡ nhưng không test.
- Permission helper sai role nhưng chỉ phát hiện khi QA test thủ công.
- Validation mỗi form mỗi kiểu.
- Error normalizer không cover 401/403/500.

### Cách thực hiện

1. Ưu tiên test pure functions:

```txt
mapDoctorDto.test.js
normalizeApiError.test.js
canAccessRoute.test.js
loginSchema.test.js
formatDate.test.js
```

2. Test đủ case bình thường và edge case:

- input đầy đủ;
- input thiếu field;
- null/undefined;
- invalid type;
- error response;
- role không hợp lệ.

3. Không cần render React cho pure function.

### Ví dụ trước khi sửa

Không có test cho:

```js
export function canAccessRoute(route, user) {
  return route.roles.includes(user.role);
}
```

Hàm này crash nếu `user` null.

### Ví dụ sau khi sửa

```js
describe('canAccessRoute', () => {
  it('rejects unauthenticated user for role route', () => {
    expect(canAccessRoute({ access: 'role', roles: ['admin'] }, null)).toBe(false);
  });

  it('allows admin for admin route', () => {
    expect(canAccessRoute({ access: 'role', roles: ['admin'] }, { role: 'admin' })).toBe(true);
  });
});
```

### File/thư mục liên quan

- `src/shared/lib/`
- `src/services/`
- `src/features/*/schemas/`
- `src/routes/`

### Rủi ro

- Test quá sát implementation gây khó refactor.
- Mock quá nhiều làm test không có giá trị.
- Bỏ qua edge case null/undefined.

### Cách kiểm tra

- Test chạy nhanh trong CI.
- Coverage tăng ở helpers quan trọng.
- Bug cũ được thêm regression test.
- Reviewer không cần test manual helper bằng mắt.

### Độ ưu tiên

High


## 9.2. Component test cho UI quan trọng

### Mục tiêu

Đảm bảo component quan trọng render đúng theo props/state: loading, error, empty, success, disabled, interaction. Component test giúp refactor UI mà không phá behavior cơ bản.

### Vấn đề thường gặp

- Component table/card/modal bị đổi markup làm button không hoạt động.
- Loading/error state không render sau refactor.
- Test chỉ snapshot, không kiểm tra behavior.
- Component phụ thuộc provider phức tạp nên khó test.

### Cách thực hiện

1. Dùng React Testing Library.
2. Test theo hành vi user thấy, không test class nội bộ.
3. Mock callback và assert event.
4. Tạo `renderWithProviders` nếu component cần provider.

### Ví dụ trước khi sửa

```js
expect(container).toMatchSnapshot();
```

### Ví dụ sau khi sửa

```js
it('calls onApprove when approve button is clicked', async () => {
  const onApprove = vi.fn();
  render(<DoctorApprovalCard doctorName="Dr. A" onApprove={onApprove} onReject={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: /duyệt/i }));

  expect(onApprove).toHaveBeenCalledTimes(1);
});
```

### File/thư mục liên quan

- shared components
- feature components quan trọng
- modal/table/form components

### Rủi ro

- Test phụ thuộc text quá nhiều có thể fail khi đổi copy.
- Không mock provider đúng làm test setup phức tạp.
- Chỉ test success state, bỏ qua error/empty.

### Cách kiểm tra

- Mỗi component async có test loading/error/empty/success.
- Mỗi action quan trọng có test callback.
- Test không phụ thuộc implementation detail.

### Độ ưu tiên

Medium


## 9.3. Integration test cho flow chính và mock API

### Mục tiêu

Bảo vệ các flow người dùng quan trọng: login, route guard, symptom analysis, profile update, admin approval, payment, logout. Integration test giúp phát hiện lỗi phối hợp giữa route, API, state và UI.

### Vấn đề thường gặp

- Unit test pass nhưng route guard sai.
- API mock không giống response thật.
- Flow submit không test double submit/error.
- Không test reload trực tiếp route private.

### Cách thực hiện

1. Chọn tool: Playwright/Cypress/MSW tùy stack hiện có.
2. Mock API theo contract backend thật.
3. Test flow theo user journey:

```txt
Login -> vào workspace -> gọi API profile -> hiển thị dashboard -> logout
```

4. Với route guard, test bằng URL trực tiếp.
5. Với API error, mock 401/403/500.

### Ví dụ trước khi sửa

Chỉ test render login form, không test login thành công và redirect.

### Ví dụ sau khi sửa

```js
test('patient can login and access symptom analysis', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('patient@example.com');
  await page.getByLabel('Mật khẩu').fill('password');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto('/app/symptom-analysis');
  await expect(page.getByText(/phân tích triệu chứng/i)).toBeVisible();
});
```

### File/thư mục liên quan

- `tests/e2e/`
- route config
- auth provider
- API mocks
- critical feature pages

### Rủi ro

- E2E chậm nếu test quá nhiều UI nhỏ.
- Mock không đồng bộ với backend thật.
- Flaky test nếu không chờ đúng UI state.

### Cách kiểm tra

- CI chạy flow critical trước merge.
- Mock contract cập nhật khi backend đổi.
- Test fail rõ lý do và có trace/screenshot nếu dùng Playwright.

### Độ ưu tiên

High


## 9.4. Checklist trước khi merge PR

### Mục tiêu

Tạo gate kiểm tra cuối cùng để không merge refactor thiếu test, thiếu docs, phá route/API hoặc tăng technical debt.

### Vấn đề thường gặp

- PR refactor quá lớn, reviewer chỉ skim.
- Không ghi cách test.
- Không chạy build.
- Không cập nhật docs dù đổi route/API.
- Thêm duplicate code mới trong khi refactor.

### Cách thực hiện

PR phải có template:

```md
## Mục tiêu

## Phạm vi thay đổi

## Checklist item liên quan

## Cách test
- [ ] npm run lint
- [ ] npm run build
- [ ] unit/component/e2e liên quan
- [ ] manual test route ...

## Rủi ro

## Screenshot/video nếu đổi UI

## Rollback plan nếu cần
```

Reviewer kiểm tra:

- scope đúng task;
- không trộn refactor và feature;
- API call đúng layer;
- route/access đúng;
- loading/error/empty đầy đủ;
- test hoặc manual evidence đủ;
- docs update nếu cần.

### Ví dụ trước khi sửa

```md
Refactor admin page.
```

Không có mô tả file, test, rủi ro.

### Ví dụ sau khi sửa

```md
## Mục tiêu
Tách DoctorApprovalSection khỏi AdminWorkspacePage, không đổi behavior.

## Phạm vi
- src/features/admin/components/DoctorApprovalSection.jsx
- src/features/admin/hooks/useDoctorApproval.js
- src/features/admin/pages/AdminWorkspacePage.jsx

## Cách test
- npm run lint
- npm run build
- Manual: admin login -> pending doctors -> approve/reject -> refresh
```

### File/thư mục liên quan

- PR template
- CI config
- docs checklist
- CODEOWNERS nếu có

### Rủi ro

- Template quá dài làm developer điền đối phó.
- Gate quá nghiêm cho task nhỏ gây chậm.
- Không có CI thì checklist dễ bị bỏ qua.

### Cách kiểm tra

- PR nào cũng có test evidence.
- Reviewer không approve nếu thiếu scope/risk/test.
- CI bắt buộc lint/build.

### Độ ưu tiên

High


# 10. Documentation


## 10.1. Nâng cấp README thành hướng dẫn setup và vận hành local

### Mục tiêu

README phải giúp developer mới clone repo, cài dependency, cấu hình env, chạy app, build, test và hiểu lệnh quan trọng mà không cần hỏi người cũ.

### Vấn đề thường gặp

- README chỉ có lệnh `npm install` và `npm run dev`.
- Không mô tả env vars.
- Không nói Node version.
- Không có troubleshooting.
- Không có link đến docs architecture/checklist.

### Cách thực hiện

README tối thiểu gồm:

```md
# Project name

## Yêu cầu môi trường
- Node.js version
- npm/pnpm/yarn version

## Setup
cp .env.example .env.local
npm install
npm run dev

## Environment variables
| Biến | Bắt buộc | Ví dụ | Ghi chú |

## Scripts
| Lệnh | Mục đích |

## Cấu trúc thư mục

## Quy trình làm việc

## Test

## Troubleshooting

## Tài liệu liên quan
```

Không đưa secret thật vào README.

### Ví dụ trước khi sửa

```md
npm install
npm start
```

### Ví dụ sau khi sửa

```md
## Environment variables
| Name | Required | Description |
| --- | --- | --- |
| VITE_API_BASE_URL | Yes | Base URL của backend API |
| VITE_APP_ENV | No | local/staging/production |
```

### File/thư mục liên quan

- `README.md`
- `.env.example`
- package scripts
- docs index

### Rủi ro

- README mô tả sai lệnh gây onboarding lỗi.
- Env docs thiếu làm dev dùng nhầm production API.
- Ghi secret vào docs gây rủi ro bảo mật.

### Cách kiểm tra

- Một developer mới làm theo README chạy được app.
- `.env.example` đủ biến nhưng không có secret thật.
- Scripts trong README khớp `package.json`.

### Độ ưu tiên

High


## 10.2. Architecture docs cho cấu trúc, route, API và data flow

### Mục tiêu

Tạo tài liệu kiến trúc giúp team hiểu app chạy từ entry point đến route, provider, API, state và UI. Docs phải đủ cụ thể để developer mới tránh sửa sai tầng.

### Vấn đề thường gặp

- Chỉ có code, không có bản đồ kiến trúc.
- Developer không biết API đi qua service nào.
- Auth/role/premium flow chỉ nằm trong đầu người cũ.
- Route mới thêm không cập nhật docs.

### Cách thực hiện

Tạo `docs/architecture.md` hoặc folder `docs/architecture/` gồm:

```md
# Frontend Architecture

## Entry point
main.jsx -> AppProviders -> Router -> Layout -> Page

## Folder structure

## Routing
- public routes
- auth routes
- role routes
- premium routes

## API layer
Component -> hook -> service -> apiClient -> backend

## Auth flow

## State management

## Error handling

## Testing strategy
```

Thêm sơ đồ ASCII nếu chưa dùng diagram tool:

```txt
User action
  -> Component
  -> Feature hook
  -> Domain service
  -> apiClient
  -> Backend
  -> Mapper
  -> Hook state
  -> UI fallback/success
```

### Ví dụ trước khi sửa

Không có docs, developer tự trace route bằng search.

### Ví dụ sau khi sửa

Docs ghi rõ:

```txt
Không gọi API trong component. Mọi request đi qua service + apiClient.
Route access được khai báo trong routeConfig, không check role trực tiếp trong page.
```

### File/thư mục liên quan

- `docs/architecture.md`
- route config
- apiClient/services
- providers

### Rủi ro

- Docs lỗi thời nguy hiểm hơn không có docs.
- Docs quá dài nhưng không có ví dụ thực tế sẽ không ai đọc.
- Không có owner cập nhật docs.

### Cách kiểm tra

- Dev mới đọc docs giải thích được flow chính.
- Mỗi thay đổi route/API/auth có cập nhật docs.
- Reviewer check docs khi PR đổi architecture.

### Độ ưu tiên

High


## 10.3. API docs cho frontend contract

### Mục tiêu

Ghi lại các API frontend đang dùng: endpoint, method, request body, response shape, error case, auth requirement và service tương ứng. Docs này giúp FE/BE đồng bộ và giảm lỗi contract.

### Vấn đề thường gặp

- Endpoint hard-code nên không biết frontend đang gọi gì.
- Backend đổi response làm UI vỡ.
- Không có docs error code.
- Không biết API nào cần token.

### Cách thực hiện

Tạo `docs/api-contracts.md`:

```md
## POST /api/symptom-analysis/suggest-clinical-questions

### Service frontend
`src/services/symptomAnalysisService.js`

### Auth
Required/Optional

### Request
```json
{
  "userInput": "đau đầu chóng mặt"
}
```

### Response success
```json
{
  "data": {
    "sessionId": "uuid",
    "questions": []
  },
  "success": true,
  "message": "OK",
  "errors": []
}
```

### Frontend behavior
- `questions.length === 0` phải hiển thị empty state hoặc bước fallback phù hợp.
- Không coi empty list là network error.

### Error cases
- 400 validation
- 401 unauthorized
- 500 server error
```

### Ví dụ trước khi sửa

API behavior chỉ nằm trong code service.

### Ví dụ sau khi sửa

Mỗi endpoint có contract và UI behavior tương ứng.

### File/thư mục liên quan

- `docs/api-contracts.md`
- `src/services/endpoints.js`
- `src/services/*Service.js`
- backend Swagger/Postman nếu có

### Rủi ro

- Docs không đồng bộ với backend.
- Ghi quá nhiều response mẫu nhạy cảm.
- Không cập nhật khi đổi endpoint.

### Cách kiểm tra

- Endpoint trong docs khớp `endpoints.js`.
- Mỗi service quan trọng có contract.
- Backend/Frontend cùng review khi đổi API.

### Độ ưu tiên

High


## 10.4. Component docs và contribution guide

### Mục tiêu

Tạo chuẩn dùng component, viết code, đặt tên, mở PR và review để team làm nhất quán. Docs này đặc biệt quan trọng cho onboarding nhân sự mới và giảm lỗi style/architecture trong PR.

### Vấn đề thường gặp

- Mỗi developer viết Button/Input/Modal khác nhau.
- Không biết khi nào tạo shared component.
- PR thiếu mô tả, thiếu test.
- Reviewer comment lặp lại các lỗi cơ bản.

### Cách thực hiện

1. Tạo `docs/components.md`:

```md
## Button
### Khi dùng
### Props
### Variants
### Ví dụ đúng
### Ví dụ sai
### Accessibility requirements
```

2. Tạo `CONTRIBUTING.md`:

```md
## Branch naming
feature/<scope>-<short-name>
refactor/<scope>-<short-name>
fix/<scope>-<short-name>

## Commit message
feat(scope): ...
fix(scope): ...
refactor(scope): ...
docs(scope): ...

## PR checklist

## Code review rules
```

3. Gắn contribution guide vào README.
4. Reviewer không lặp lại quy tắc bằng lời; link đến docs.

### Ví dụ trước khi sửa

Developer tự copy Button từ page khác và đổi class.

### Ví dụ sau khi sửa

Developer đọc docs:

```jsx
<Button variant="primary" size="md" isLoading={isSubmitting}>
  Lưu
</Button>
```

### File/thư mục liên quan

- `docs/components.md`
- `CONTRIBUTING.md`
- shared components
- PR template

### Rủi ro

- Docs quá dài nhưng không có example sẽ ít dùng.
- Component docs không cập nhật khi props đổi.
- Contribution guide quá cứng làm chậm task nhỏ.

### Cách kiểm tra

- Dev mới tạo component đúng convention.
- PR mới có checklist đầy đủ.
- Reviewer ít phải comment lỗi lặp lại.
- Component docs khớp code thực tế.

### Độ ưu tiên

Medium


## 10.5. Troubleshooting guide cho lỗi thường gặp

### Mục tiêu

Giảm thời gian debug lỗi setup, API, auth, build, route, CSS và test bằng tài liệu troubleshooting có triệu chứng, nguyên nhân, cách kiểm tra và cách sửa.

### Vấn đề thường gặp

- Dev mới không chạy được app vì thiếu env.
- API 401 nhưng không biết token lấy ở đâu.
- Build fail vì import case-sensitive.
- Route blank page do lazy import sai.
- CSS vỡ do global class conflict.

### Cách thực hiện

Tạo `docs/troubleshooting.md` theo format:

```md
## App không gọi được API

### Triệu chứng
Network tab báo ERR_CONNECTION_REFUSED hoặc 404.

### Nguyên nhân thường gặp
- `VITE_API_BASE_URL` sai.
- Backend chưa chạy.
- Proxy config sai.

### Cách kiểm tra
- Kiểm tra `.env.local`.
- Mở Network tab.
- Gọi health endpoint nếu có.

### Cách sửa
- Cập nhật env.
- Restart dev server sau khi đổi env.
```

Các mục nên có:

- không chạy được `npm install`;
- dev server không start;
- env không nhận;
- API 401/403/500;
- route blank page;
- build fail import;
- test fail do mock;
- CSS bị override;
- chunk load error.

### Ví dụ trước khi sửa

Mỗi lỗi phải hỏi senior hoặc tìm trong chat.

### Ví dụ sau khi sửa

Developer tự tra:

```txt
Triệu chứng: Route /app/admin trắng màn hình.
Kiểm tra: Console có lỗi lazy import module not found.
Sửa: Kiểm tra path trong routeConfig và named/default export của page.
```

### File/thư mục liên quan

- `docs/troubleshooting.md`
- README
- route config
- env files
- CI logs

### Rủi ro

- Troubleshooting lỗi thời gây mất thời gian.
- Ghi workaround nguy hiểm thay vì fix đúng.
- Ghi thông tin môi trường production nhạy cảm.

### Cách kiểm tra

- Dev mới dùng guide giải quyết được lỗi setup phổ biến.
- Mỗi lỗi production/release lặp lại phải được thêm vào guide.
- Không có secret, IP nội bộ nhạy cảm nếu docs public.

### Độ ưu tiên

Medium

# Bảng theo dõi triển khai tổng hợp

| Nhóm | Checklist item | Ưu tiên | Người phụ trách | Trạng thái | Bằng chứng cần nộp |
| --- | --- | --- | --- | --- | --- |
| Project Structure | 1.1 Kiểm tra cấu trúc hiện tại | High | FE Lead | Todo | Inventory + PR link |
| Project Structure | 1.2 Cấu trúc feature-first | High | FE Lead | Todo | Folder proposal + sample migrated feature |
| Project Structure | 1.3 Quy tắc đặt file | High | FE Lead | Todo | Updated docs + reviewer checklist |
| Project Structure | 1.4 Migration từng phần | High | FE Lead | Todo | Migration plan + build pass |
| Components | 2.1 Tách component lớn | High | Feature owner | Todo | Before/after LOC + test evidence |
| Components | 2.2 Phân loại component | High | Feature owner | Todo | Shared/feature mapping |
| Components | 2.3 Naming | Medium | All FE | Todo | Lint/build pass |
| Components | 2.4 Props | Medium | All FE | Todo | Component examples/tests |
| Components | 2.5 Duplicate UI | Medium | Design system owner | Todo | Shared fallback/Button/Modal usage |
| API Layer | 3.1 API client duy nhất | High | FE Lead | Todo | grep fetch/axios + API tests |
| API Layer | 3.2 API call khỏi component | High | Feature owner | Todo | Service/hook PR |
| API Layer | 3.3 DTO/mapper | High | FE/BE owner | Todo | Mapper unit tests |
| API Layer | 3.4 Error/timeout/retry/auth | High | FE Lead | Todo | Mock 400/401/403/500 evidence |
| State | 4.1 Phân loại state | High | Feature owner | Todo | State inventory |
| State | 4.2 Prop drilling | Medium | Feature owner | Todo | Provider/composition PR |
| State | 4.3 Custom hooks | Medium | Feature owner | Todo | Hook tests/examples |
| Routing | 5.1 Route config | High | FE Lead | Todo | Route manifest + tests |
| Routing | 5.2 Private/role/premium guard | High | FE Lead | Todo | Access matrix tests |
| Routing | 5.3 Lazy loading/not found | Medium | FE Lead | Todo | Bundle report + route manual test |
| Forms | 6.1 Validation | High | Feature owner | Todo | Schema + invalid case tests |
| Forms | 6.2 Submit/loading | High | Feature owner | Todo | Double-submit test/manual evidence |
| Forms | 6.3 Form hooks | Medium | Feature owner | Todo | Before/after component complexity |
| Performance | 7.1 Lazy/code split | Medium | FE Lead | Todo | Bundle comparison |
| Performance | 7.2 Render optimization | Medium | Feature owner | Todo | Profiler evidence |
| Performance | 7.3 Assets/dependencies | Medium | FE Lead | Todo | Bundle/dependency report |
| Error Handling | 8.1 Error Boundary | High | FE Lead | Todo | Throw test + fallback screenshot |
| Error Handling | 8.2 Fallback UI | High | All FE | Todo | State matrix evidence |
| Error Handling | 8.3 Logging | Medium | FE Lead | Todo | Redaction check |
| Testing | 9.1 Unit tests | High | All FE | Todo | Test output |
| Testing | 9.2 Component tests | Medium | All FE | Todo | RTL tests |
| Testing | 9.3 Integration tests | High | QA/FE | Todo | E2E report |
| Testing | 9.4 Merge checklist | High | Tech Lead | Todo | PR template + CI gates |
| Documentation | 10.1 README | High | FE Lead | Todo | New hire setup verification |
| Documentation | 10.2 Architecture docs | High | FE Lead | Todo | Architecture doc PR |
| Documentation | 10.3 API docs | High | FE/BE | Todo | Contract review |
| Documentation | 10.4 Component/contribution docs | Medium | FE Lead | Todo | Docs + PR template |
| Documentation | 10.5 Troubleshooting | Medium | FE/QA | Todo | Common issue guide |

# Gợi ý thứ tự triển khai theo sprint

## Sprint 1: Giảm rủi ro nền tảng

1. Chuẩn hóa API client.
2. Chuẩn hóa route config và guard.
3. Thêm Error Boundary.
4. Viết README setup và env.
5. Tạo PR template/checklist merge.

## Sprint 2: Tách feature đầu tiên làm mẫu

1. Chọn một feature ít rủi ro.
2. Migrate sang `features/<name>`.
3. Tách service/hook/component.
4. Thêm mapper/unit test.
5. Cập nhật architecture docs.

## Sprint 3: Chuẩn hóa UI state và forms

1. Tạo LoadingState/ErrorState/EmptyState.
2. Chuẩn hóa Button/Modal/ConfirmDialog.
3. Migrate form quan trọng sang schema + submit flow chuẩn.
4. Thêm component test cho UI quan trọng.

## Sprint 4: Performance và cleanup

1. Lazy load route/page lớn.
2. Phân tích bundle.
3. Gỡ dependency không dùng.
4. Tối ưu render list/table lớn bằng profiler evidence.
5. Cập nhật troubleshooting guide.

# Quy tắc bắt buộc cho code mới từ thời điểm áp dụng checklist

- Feature mới phải đặt trong `src/features/<feature-name>`.
- API mới phải có endpoint constant, service function và error handling.
- Component gọi API trực tiếp không được merge.
- Page mới phải khai báo route metadata và access rule.
- Form mới phải có validation, submit loading và error state.
- UI async mới phải có loading/error/empty/success state.
- Shared component mới phải chứng minh có ít nhất hai use case hoặc có kế hoạch dùng lại rõ ràng.
- PR đổi route/API/auth/form lớn phải cập nhật docs.
- PR không có cách test không được approve.
