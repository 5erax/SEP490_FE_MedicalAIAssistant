# Quy ước code chất lượng cho MediMate AI Frontend — Bản nâng cấp

> Phiên bản tài liệu: 2026-06-17  
> Phạm vi: frontend React/Vite của MediMate AI.  
> Đối tượng sử dụng: Frontend developer, reviewer, tech lead, QA, nhân sự mới onboarding.  
> Mục tiêu: chuẩn hóa cách viết code, cách review, cách refactor và cách bảo vệ chất lượng repo để đội ngũ phát triển nhanh nhưng không làm tăng nợ kỹ thuật.

---

## 0. Cách dùng tài liệu này trong công ty

Tài liệu này là **coding standards handbook** cho repo frontend. Không dùng như tài liệu đọc một lần rồi bỏ. Khi developer viết code, reviewer review PR hoặc tech lead thiết kế task refactor, tài liệu này phải được dùng như tiêu chuẩn tham chiếu.

### 0.1. Khi nào bắt buộc mở tài liệu này

| Tình huống | Phần cần đọc | Kết quả cần đạt |
| --- | --- | --- |
| Developer mới bắt đầu sửa code | Phần 1, 2, 3, 4, 5 | Hiểu naming, component, hook, API boundary |
| Thêm API mới | Phần 8, 9, 10, 24 | Không gọi API trực tiếp trong component |
| Tách page lớn | Phần 4, 5, 6, 13, 19 | Tách đúng trách nhiệm, không đổi behavior ngầm |
| Sửa form | Phần 11, 12, 15 | Có validation/loading/error/submitting rõ |
| Sửa UI/CSS | Phần 14, 16, 17 | Không làm global CSS phình thêm, có accessibility |
| Sửa auth/payment/AI/symptom | Phần 18, 20, 21 | Không vi phạm security/product safety |
| Mở PR | Phần 27, 28, 29 | Có evidence, scope rõ, test phù hợp |
| Review PR | Phần 30, 31, 32 | Review theo checklist, không theo cảm tính |

### 0.2. Quy tắc ưu tiên khi có mâu thuẫn

Khi có mâu thuẫn giữa tốc độ và chất lượng, áp dụng thứ tự ưu tiên sau:

1. Không làm rò rỉ secret, token, dữ liệu cá nhân hoặc dữ liệu sức khỏe.
2. Không trình bày demo/mock y tế như dữ liệu thật.
3. Không phá auth, role, premium gate, payment hoặc route private.
4. Không gọi API ngoài service layer.
5. Không làm `global.css` hoặc page lớn phình thêm nếu không có lý do.
6. Không merge nếu lint/build/test liên quan fail mà không có quyết định chấp nhận rủi ro.
7. Không refactor nhiều vùng cùng lúc nếu không có test bảo vệ.

### 0.3. Định nghĩa code chất lượng trong repo MediMate AI

Code chất lượng không chỉ là code chạy được. Với sản phẩm y tế/sức khỏe, code chất lượng phải đáp ứng đồng thời:

- dễ đọc;
- dễ review;
- đúng layer;
- có loading/error/empty state;
- không gây hiểu nhầm về y tế;
- không expose secret;
- không log dữ liệu nhạy cảm;
- có test hoặc evidence phù hợp;
- có docs cập nhật khi thay đổi route/API/architecture/flow;
- không khiến nhân viên mới phải đoán quá nhiều.

---

## 1. Nguyên tắc nền tảng

### 1.1. Rõ ràng quan trọng hơn ngắn gọn cực đoan

Code ngắn nhưng khó hiểu không phải là code tốt. Ưu tiên tên biến rõ, function rõ trách nhiệm, logic tách thành bước dễ đọc.

Không nên:

```js
const x = a?.b?.c?.map(i => ({ ...i, n: i.n || i.m })).filter(Boolean);
```

Nên:

```js
const rawFacilities = response?.data?.items ?? [];
const normalizedFacilities = rawFacilities
  .map(normalizeFacilityRecord)
  .filter(Boolean);
```

Lý do: reviewer hiểu được dữ liệu đi qua bước nào, debug dễ hơn và test helper dễ hơn.

### 1.2. Refactor không được đổi behavior ngầm

Khi PR có mục tiêu refactor, hành vi cũ phải giữ nguyên. Nếu cần đổi behavior, tách thành PR khác hoặc ghi rất rõ trong PR.

Ví dụ PR đúng:

```txt
refactor(admin): extract users section without changing CRUD behavior
```

Ví dụ PR rủi ro:

```txt
refactor admin and fix approval behavior and change table layout
```

### 1.3. Boundary rõ hơn convenience

Không được làm nhanh bằng cách phá boundary.

Không đúng:

```jsx
function AdminUsersPage() {
  const response = await fetch('/api/users');
}
```

Đúng:

```txt
UI -> feature hook -> domain service -> apiRequest -> backend
```

### 1.4. Safety trước cleverness

Không dùng trick khó hiểu ở vùng auth, payment, symptom, AI, profile, medical data. Code các vùng này nên rõ, có guard, có fallback, có message an toàn.

### 1.5. Shared không có nghĩa là bỏ mọi thứ vào shared

Chỉ đưa vào `shared` khi dùng lại thật sự hoặc là foundation của app. Nếu code chỉ phục vụ một capability, đặt trong feature tương ứng.

### 1.6. Test theo rủi ro

Không phải mọi dòng code đều cần test E2E, nhưng logic rủi ro phải có test/evidence. Các vùng sau cần ưu tiên test:

- route/access/role/premium;
- auth/session/logout;
- payment return/cancel/pending;
- symptom analysis empty/error/emergency flow;
- API response normalization;
- admin CRUD critical actions;
- form validation;
- mock/demo production surface.

---

## 2. Severity level cho quy ước

Không phải quy ước nào cũng có mức nghiêm trọng như nhau. Reviewer nên dùng bảng này để quyết định block merge hay góp ý cải thiện.

| Mức | Ý nghĩa | Ví dụ | Xử lý |
| --- | --- | --- | --- |
| Blocker | Không được merge | Secret trong client, bypass private route, fetch trực tiếp chứa auth token trong component, mock y tế như dữ liệu thật | Bắt buộc sửa trước merge |
| High | Rủi ro cao, thường phải sửa | Page thêm 300 dòng logic, không có error state cho API, role check thiếu test | Sửa trước merge hoặc tech lead chấp thuận |
| Medium | Nợ kỹ thuật đáng chú ý | Tên biến mơ hồ, component props chưa rõ, CSS selector hơi chung | Nên sửa trong PR nếu scope nhỏ |
| Low | Style/cải thiện nhỏ | Thứ tự import, comment chưa tối ưu | Có thể follow-up nếu không ảnh hưởng |

### 2.1. Những lỗi mặc định là Blocker

- Commit secret/token/API key thật.
- Dùng `VITE_*` cho secret provider thật.
- Gọi AI provider trực tiếp từ browser bằng provider key.
- Gọi API trực tiếp trong page/component thay vì service layer.
- Route private/premium/admin bị bypass.
- Demo/mock hồ sơ y tế hoặc tương tác thuốc hiển thị như dữ liệu thật.
- Log triệu chứng, token, hồ sơ sức khỏe, thông tin định danh nhạy cảm.
- Build/lint fail nhưng vẫn muốn merge mà không có quyết định rõ.

### 2.2. Những lỗi mặc định là High

- Component/page vượt ngưỡng lớn và tiếp tục thêm logic.
- API call không có loading/error/empty state.
- Form submit không disable khi submitting.
- Delete/action nguy hiểm không có confirm.
- CSS global tiếp tục phình vì feature-specific style.
- Test bị sửa để pass nhưng behavior thật sai.

---

## 3. Naming convention

### 3.1. Quy tắc chung

Tên phải trả lời được ba câu hỏi:

1. Đây là gì?
2. Thuộc domain nào?
3. Được dùng để làm gì?

Không dùng tên quá chung như `data`, `item`, `list`, `temp`, `handleClick`, `Component`, `Modal`, trừ khi phạm vi cực nhỏ và rõ.

### 3.2. Quy ước file

| Loại file | Convention | Ví dụ tốt | Ví dụ không tốt |
| --- | --- | --- | --- |
| Component | PascalCase | `AdminUsersTable.jsx` | `table.jsx`, `admin-users-table.jsx` |
| Page | PascalCase + `Page` | `SymptomAnalysisPage.jsx` | `Symptom.jsx` nếu không rõ vai trò |
| Hook | camelCase bắt đầu bằng `use` | `useAdminUsers.js` | `adminUsersHook.js` |
| Service/API | domain + `Api` hoặc `Service` | `doctorInvitationApi.js` | `api2.js`, `helperService.js` |
| Model/normalize | động từ rõ | `normalizeDoctorRecord.js` | `doctorUtils.js` nếu chứa quá nhiều |
| Constants | domain + `Constants` hoặc tên rõ | `paymentStatusConstants.js` | `constants.js` trong feature lớn |
| CSS feature | kebab-case/domain | `admin-users.css` | `style.css` |
| Test | behavior/domain + `.spec.js` | `admin-users.spec.js` | `test.spec.js` |
| Fixture | domain + `.fixture.js` | `payment-status.fixture.js` | `mock.js` |

### 3.3. Quy ước component

Component nên đặt tên theo trách nhiệm UI:

```txt
AdminUsersTable
AdminUserFormDialog
PricingPlanCard
PaymentStatusCard
SymptomInputForm
ClinicalQuestionList
FacilityMapPanel
```

Không đặt tên theo vị trí mơ hồ:

```txt
LeftBox
RightContent
MainSection
Card2
NewModal
```

### 3.4. Quy ước hook

Hook nên thể hiện domain và mục đích:

```js
useAdminUsers()
usePaymentReturnStatus()
useSymptomAnalysisFlow()
useFacilitySearchFilters()
useDoctorInvitationValidation()
```

Không nên:

```js
useData()
useFetch()
usePageLogic()
useStuff()
```

### 3.5. Quy ước boolean

Boolean phải bắt đầu bằng `is`, `has`, `can`, `should`, `needs`, `allow`.

```js
const isSubmitting = false;
const hasPremiumAccess = true;
const canDeleteUser = auth.role === 'Admin';
const shouldShowProfileSetup = needsPatientProfile(auth);
```

Tránh:

```js
const premium = true;
const deleteUser = false;
const profile = true;
```

### 3.6. Quy ước handler

Tên handler nên mô tả event hoặc action:

```js
function handleSubmitProfileForm(event) {}
function handleDeleteUser(userId) {}
function handleSelectFacility(facilityId) {}
function handleRetryPaymentStatus() {}
```

Nếu handler truyền xuống props, dùng `on`:

```jsx
<AdminUsersTable onDeleteUser={handleDeleteUser} />
```

### 3.7. Quy ước ID và field backend

Không tự đổi nghĩa ID. Nếu backend có nhiều loại ID, đặt rõ:

```js
const userId = user.id;
const doctorId = doctor.doctorId;
const facilityDepartmentId = relation.facilityDepartmentId;
const orderCode = payment.orderCode;
```

Không dùng chung `id` qua nhiều cấp khi logic phức tạp.

---

## 4. File size và complexity budget

### 4.1. Ngưỡng cảnh báo

| Loại file | Ngưỡng tốt | Cảnh báo | Cần refactor |
| --- | ---: | ---: | ---: |
| UI primitive | < 150 dòng | > 250 dòng | > 350 dòng |
| Feature component | < 250 dòng | > 400 dòng | > 600 dòng |
| Page component | < 300 dòng | > 500 dòng | > 800 dòng |
| Hook | < 180 dòng | > 300 dòng | > 450 dòng |
| Service | < 250 dòng | > 400 dòng | > 600 dòng |
| CSS feature | < 300 dòng | > 600 dòng | > 1000 dòng |
| Global CSS | Không tăng thêm nếu feature-specific | Mọi tăng mới cần lý do | Cần migration |

### 4.2. Khi file vượt ngưỡng cảnh báo

Không nhất thiết phải tách ngay nếu đang fix bug nhỏ. Nhưng PR không nên tiếp tục thêm logic vào file đã quá lớn nếu có thể tách.

Quy trình audit file lớn:

1. Đếm nhóm trách nhiệm trong file.
2. Tách constant/static data trước.
3. Tách component render thuần.
4. Tách hook state/API.
5. Tách normalize/helper.
6. Chạy test/evidence sau từng bước.

### 4.3. Dấu hiệu god component

Một component/page là god component nếu có nhiều dấu hiệu sau:

- nhiều domain state trong cùng file;
- nhiều API service import;
- nhiều modal/table/form không liên quan trực tiếp;
- nhiều handler CRUD khác nhau;
- render function dài;
- `useEffect` nhiều và phụ thuộc chéo;
- JSX có logic normalize/filter/map phức tạp;
- sửa một section dễ làm hỏng section khác;
- test unit gần như không thể viết.

### 4.4. Cách chia god component an toàn

Không tách toàn bộ một lần. Tách theo thứ tự:

```txt
constants/static data -> presentational components -> hooks -> model/normalizer -> service facade
```

Ví dụ với Admin Users:

```txt
AdminWorkspacePage.jsx
  -> features/admin/users/AdminUsersSection.jsx
  -> features/admin/users/hooks/useAdminUsers.js
  -> features/admin/users/components/AdminUsersTable.jsx
  -> features/admin/users/components/AdminUserFormDialog.jsx
  -> features/admin/users/model/normalizeAdminUser.js
```

---

## 5. Folder và import boundary standards

### 5.1. Kiến trúc target

Repo nên tiến dần tới cấu trúc:

```txt
src/
├── app/
├── features/
├── shared/
└── main.jsx
```

Trong giai đoạn chưa migration xong, vẫn phải giữ boundary theo ý nghĩa, dù folder cũ còn tồn tại.

### 5.2. Import direction

Được phép:

```txt
app -> features
app -> shared
features -> shared
feature section -> feature internal shared module
```

Không được:

```txt
shared -> features
shared/ui -> services
services -> components
router -> feature business implementation
feature A -> feature B internal file
```

### 5.3. Import qua public API

Nếu feature đã có `index.js`, code bên ngoài chỉ import từ public API.

Tốt:

```js
import { AdminUsersSection } from '@/features/admin/users';
```

Không tốt:

```js
import { AdminUsersTable } from '@/features/admin/users/components/AdminUsersTable';
```

Trừ khi file nằm cùng feature và cần import nội bộ.

### 5.4. Compatibility export

Trong migration, có thể giữ re-export để tránh đổi toàn bộ import một lúc.

```js
// Deprecated compatibility export. Prefer importing from '@/shared/api'.
// Remove after legacy imports are migrated.
export * from '../shared/api/apiClient';
```

Quy tắc:

- compatibility file không chứa logic mới;
- có comment deprecation;
- có điều kiện xóa;
- không tạo thêm dependency ngược.

### 5.5. Import order

Thứ tự khuyến nghị:

```txt
1. React/package imports
2. app/shared imports
3. feature imports
4. relative imports
5. style imports
```

Ví dụ:

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Field } from '@/shared/ui';
import { usersApi } from '@/features/admin/users/services/usersApi';
import { normalizeAdminUser } from './model/normalizeAdminUser';
import './admin-users.css';
```

---

## 6. React component standards

### 6.1. Component phải có trách nhiệm rõ

Mỗi component nên thuộc một trong các nhóm:

| Nhóm | Trách nhiệm | Có được gọi API không? | Ví dụ |
| --- | --- | --- | --- |
| Page | Điều phối route/layout/feature | Không trực tiếp, gọi hook/service qua feature | `SymptomAnalysisPage` |
| Feature container | Quản lý flow của một feature section | Có thể gọi hook, không fetch trực tiếp | `AdminUsersSection` |
| Presentational component | Render UI từ props | Không | `AdminUsersTable` |
| UI primitive | Control dùng chung | Không | `Button`, `Dialog`, `Field` |
| Layout component | Bố trí shell/nav | Không chứa business API | `UserWorkspaceShell` |

### 6.2. Props contract phải rõ

Tốt:

```jsx
function AdminUsersTable({
  users,
  loading,
  error,
  onRetry,
  onEditUser,
  onDeleteUser,
  onApproveUser,
}) {
  // render only
}
```

Không tốt:

```jsx
function AdminUsersTable(props) {
  // props quá rộng, không rõ component cần gì
}
```

### 6.3. Không truyền object khổng lồ nếu component chỉ cần vài field

Không tốt:

```jsx
<UserBadge user={user} />
```

nếu component chỉ cần:

```jsx
function UserBadge({ displayName, role, avatarUrl }) {}
```

Tốt:

```jsx
<UserBadge
  displayName={user.fullName}
  role={user.role}
  avatarUrl={user.avatarUrl}
/>
```

Lợi ích: component dễ test, giảm phụ thuộc shape backend.

### 6.4. Component không nên tự quyết định business permission nếu không thuộc trách nhiệm

Không tốt:

```jsx
function DeleteButton({ user }) {
  if (localStorage.getItem('role') !== 'Admin') return null;
}
```

Tốt:

```jsx
<DeleteButton disabled={!canDeleteUser} onClick={onDeleteUser} />
```

Permission nên tính ở hook/container hoặc helper role, không rải trong UI primitive.

### 6.5. Không viết logic phức tạp trong JSX

Không tốt:

```jsx
{users
  .filter((user) => user.role !== 'Admin' && user.status !== 'Deleted')
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .map((user) => <UserRow key={user.id} user={normalizeUser(user)} />)}
```

Tốt:

```jsx
const visibleUsers = useMemo(() => {
  return users
    .filter(isVisibleAdminUser)
    .sort(sortByNewestCreatedAt);
}, [users]);

return visibleUsers.map((user) => <UserRow key={user.id} user={user} />);
```

### 6.6. List key phải ổn định

Tốt:

```jsx
users.map((user) => <UserRow key={user.id} user={user} />)
```

Không tốt:

```jsx
users.map((user, index) => <UserRow key={index} user={user} />)
```

Chỉ dùng index khi list tĩnh, không reorder, không insert/delete.

### 6.7. Conditional rendering phải có fallback rõ

Không tốt:

```jsx
{data && <Result data={data} />}
```

Nếu `data` null vì lỗi, user thấy blank.

Tốt:

```jsx
if (loading) return <LoadingState message="Đang tải dữ liệu..." />;
if (error) return <ErrorState message={error} onRetry={reload} />;
if (!items.length) return <EmptyState message="Chưa có dữ liệu." />;
return <ResultList items={items} />;
```

### 6.8. Component phải giữ accessibility khi abstract

Khi tạo component `Button`, `Dialog`, `Field`, `Table`, phải expose props cần cho accessibility:

```jsx
<Button aria-label="Xóa người dùng Nguyễn Văn A" disabled={deleting} />
<Field label="Email" error={fieldErrors.email} required />
<Dialog title="Xác nhận xóa" open={open} onClose={close} />
```

Không tạo abstraction làm mất label, focus, aria hoặc disabled state.

---

## 7. Hook standards

### 7.1. Khi nào nên tạo custom hook

Tạo hook khi có ít nhất một điều kiện:

- state/effect/handler dùng lại ở nhiều component;
- page quá dài vì logic API/form/filter;
- flow có nhiều bước cần test hoặc debug;
- logic cần tách khỏi render để dễ đọc;
- cần chuẩn hóa loading/error/retry.

Không tạo hook nếu chỉ bọc một dòng state không có ý nghĩa.

### 7.2. Hook tốt phải expose contract rõ

Ví dụ:

```js
export function useAdminUsers() {
  return {
    users,
    loading,
    error,
    filters,
    pagination,
    selectedUser,
    loadUsers,
    setFilters,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    createUser,
    updateUser,
    deleteUser,
  };
}
```

Không tốt:

```js
export function useAdminUsers() {
  return { data, setData, state, actions };
}
```

trừ khi `state/actions` có type/shape document rõ.

### 7.3. Hook không render JSX

Không làm:

```js
function useSomething() {
  return <div>...</div>;
}
```

Hook trả dữ liệu và handler, component render UI.

### 7.4. Async hook phải chống stale request khi cần

Khi user search/filter nhanh, request cũ có thể về sau request mới. Dùng `AbortController` hoặc request id.

```js
const requestIdRef = useRef(0);

const loadUsers = useCallback(async () => {
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;
  setLoading(true);

  try {
    const result = await usersApi.list(filters);
    if (requestId !== requestIdRef.current) return;
    setUsers(result.items);
  } catch (error) {
    if (requestId !== requestIdRef.current) return;
    setError(getSafeErrorMessage(error));
  } finally {
    if (requestId === requestIdRef.current) {
      setLoading(false);
    }
  }
}, [filters]);
```

### 7.5. Dependency array phải chính xác

Không disable eslint hook rule để che lỗi.

Không tốt:

```js
useEffect(() => {
  loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Tốt:

```js
const loadUsers = useCallback(async () => {
  // ...
}, [filters, pageNumber, pageSize]);

useEffect(() => {
  loadUsers();
}, [loadUsers]);
```

Nếu thật sự cần bỏ dependency, phải có comment giải thích vì sao an toàn.

### 7.6. Hook không nên trộn nhiều domain

Không tốt:

```js
useAdminWorkspaceEverything()
```

Nếu hook quản lý users, doctors, plans, staff, facilities cùng lúc, nó chỉ chuyển god component thành god hook.

Tốt hơn:

```txt
useAdminUsers
useAdminDoctors
useAdminAiConfigs
useAdminSubscriptionPlans
useAdminFacilities
```

### 7.7. Hook phải có reset/cleanup nếu flow nhiều bước

Flow như symptom, payment, invitation, form wizard nên có `reset`, `retry`, `clearError`.

```js
return {
  step,
  loading,
  error,
  submitInput,
  submitAnswers,
  retry,
  reset,
  clearError,
};
```

---

## 8. API/service standards

### 8.1. Luồng API bắt buộc

```txt
Page/Component
  -> Feature hook hoặc container
  -> Domain service
  -> ENDPOINTS
  -> apiRequest
  -> Backend
```

Không được bỏ qua tầng service.

### 8.2. Endpoint policy

Mọi URL backend phải nằm trong endpoint registry.

Đúng:

```js
export const ENDPOINTS = {
  USERS: {
    BASE: '/api/users',
    BY_ID: (id) => `/api/users/${encodeURIComponent(id)}`,
  },
};
```

Service dùng endpoint:

```js
export const usersApi = {
  getById(userId) {
    return apiRequest(ENDPOINTS.USERS.BY_ID(userId), { auth: true });
  },
};
```

Sai:

```js
apiRequest(`/api/users/${userId}`, { auth: true });
```

trừ khi endpoint dynamic chưa thể đưa vào registry, nhưng phải có lý do trong PR.

### 8.3. Không gọi `fetch` trực tiếp trong UI

Không được:

```jsx
function PricingPage() {
  const response = await fetch('/api/subscription-plans');
}
```

Đúng:

```js
// services/subscriptionService.js
export const subscriptionPlansApi = {
  listActive() {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.ACTIVE);
  },
};
```

```jsx
function PricingPage() {
  const { plans, loading, error } = usePricingPlans();
}
```

### 8.4. Service không render UI và không chứa UI copy quá cụ thể

Không tốt:

```js
export async function loadUsersForTable() {
  try {
    return await apiRequest(...);
  } catch {
    return { errorMessage: 'Bảng người dùng không tải được, bấm nút xanh để thử lại' };
  }
}
```

Tốt:

```js
export async function listUsers(params) {
  return apiRequest(...);
}
```

UI/hook quyết định message phù hợp.

### 8.5. Auth header chỉ xử lý tập trung

Không tự set header authorization ở từng service.

Không tốt:

```js
const token = localStorage.getItem('token');
fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
```

Tốt:

```js
apiRequest(ENDPOINTS.USERS.BASE, { auth: true });
```

### 8.6. Query params dùng URLSearchParams

Tốt:

```js
const query = new URLSearchParams({
  PageNumber: String(pageNumber),
  PageSize: String(pageSize),
  Search: filters.search.trim(),
}).toString();

return apiRequest(`${ENDPOINTS.USERS.BASE}?${query}`, { auth: true });
```

Không tốt:

```js
return apiRequest(`/api/users?PageNumber=${pageNumber}&Search=${search}`);
```

vì dễ lỗi encode và query rỗng.

### 8.7. Service phải normalize response ở boundary nếu backend không ổn định

Không để JSX tự đoán nhiều shape.

```js
export function normalizeUserRecord(record) {
  if (!record || typeof record !== 'object') return null;
  return {
    id: record.id ?? record.userId,
    email: record.email ?? '',
    fullName: record.fullName ?? record.name ?? '',
    role: normalizeRole(record.role),
    status: record.status ?? 'Unknown',
  };
}
```

```js
async function listUsers(params) {
  const response = await apiRequest(...);
  return {
    ...response,
    items: (response.data?.items ?? []).map(normalizeUserRecord).filter(Boolean),
  };
}
```

### 8.8. API error phải an toàn

Không expose stack trace hoặc raw object.

```js
export function getSafeApiErrorMessage(error, fallback = 'Không thể xử lý yêu cầu.') {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
```

UI:

```jsx
<ErrorState message={error || 'Không thể tải dữ liệu. Vui lòng thử lại.'} />
```

Không hiển thị:

```txt
Cannot read properties of undefined
[object Object]
Error: Request failed at apiClient.js:42
```

### 8.9. Timeout, retry và unauthorized

Các flow quan trọng nên có strategy rõ:

| Tình huống | Cách xử lý |
| --- | --- |
| Timeout | Hiển thị retry, không treo loading vĩnh viễn |
| Network error | Message rõ, retry nếu an toàn |
| 401 | Clear/refresh auth theo policy, redirect login nếu cần |
| 403 | Hiển thị thiếu quyền hoặc redirect workspace phù hợp |
| 429 | Thông báo thử lại sau, không spam retry |
| 5xx | Message chung, không đổ lỗi user |

### 8.10. Không dùng provider secret ở frontend

`VITE_*` không bảo vệ secret. Mọi biến `VITE_` được đưa vào client bundle.

Không được:

```js
const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
fetch('https://api.anthropic.com/...', {
  headers: { 'x-api-key': apiKey },
});
```

Đúng:

```txt
Frontend -> Backend AI Gateway -> AI Provider
```

---

## 9. Data model và normalization standards

### 9.1. Không để UI phụ thuộc trực tiếp shape backend nếu shape chưa ổn định

UI nên nhận model frontend ổn định.

```js
const normalizedDoctor = {
  id: 'doctor-1',
  fullName: 'Nguyễn Văn A',
  departmentName: 'Tim mạch',
  status: 'Active',
};
```

Không để component phải xử lý:

```jsx
doctor?.doctorName ?? doctor?.fullName ?? doctor?.name ?? 'Không rõ'
```

ở nhiều nơi.

### 9.2. Normalize ở service/model

Cấu trúc đề xuất:

```txt
features/admin/doctors/
├── model/
│   ├── normalizeDoctorRecord.js
│   └── doctorStatus.js
├── services/
│   └── doctorsApi.js
```

### 9.3. Normalize function phải chịu được dữ liệu thiếu

```js
export function normalizeFacilityRecord(record) {
  if (!record || typeof record !== 'object') return null;

  const latitude = Number(record.latitude ?? record.lat);
  const longitude = Number(record.longitude ?? record.lng);

  return {
    id: String(record.id ?? record.facilityId ?? ''),
    name: String(record.name ?? record.facilityName ?? '').trim(),
    address: String(record.address ?? '').trim(),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    status: record.status ?? 'Unknown',
  };
}
```

### 9.4. Không che lỗi contract nghiêm trọng bằng fallback im lặng

Fallback giúp UI không crash, nhưng không được làm team không biết backend sai contract. Nếu field bắt buộc thiếu, nên log an toàn trong dev hoặc trả error state.

```js
if (!normalized.id) {
  return null;
}
```

Nếu số lượng null lớn bất thường, cần issue backend/frontend contract.

### 9.5. Date/time format

Không format date rải rác trong JSX. Tạo helper:

```js
export function formatDisplayDate(value) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN').format(date);
}
```

### 9.6. Money/currency format

Payment/pricing không hard-code string tiền thủ công.

```js
export function formatVndAmount(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}
```

### 9.7. Status enum

Không so sánh status string rải rác.

```js
export const PAYMENT_STATUS = {
  SUCCESS: 'success',
  PENDING: 'pending',
  CANCELED: 'canceled',
  FAILED: 'failed',
};
```

```js
export function normalizePaymentStatus(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (['paid', 'success', 'completed'].includes(normalized)) return PAYMENT_STATUS.SUCCESS;
  if (['pending', 'processing'].includes(normalized)) return PAYMENT_STATUS.PENDING;
  if (['cancel', 'canceled', 'cancelled'].includes(normalized)) return PAYMENT_STATUS.CANCELED;
  return PAYMENT_STATUS.FAILED;
}
```

---

## 10. Loading, error, empty và success state standards

### 10.1. Mọi API UI phải có 4 trạng thái cơ bản

| State | Khi nào | UI cần có |
| --- | --- | --- |
| Loading | Request đang chạy | Text/skeleton/spinner rõ, không nhảy layout quá mạnh |
| Error | Request fail | Message an toàn + retry nếu phù hợp |
| Empty | Request success nhưng không có data | Giải thích + CTA nếu có |
| Success | Có data/action thành công | Hiển thị dữ liệu hoặc confirmation rõ |

### 10.2. Không để loading vô hạn

Không tốt:

```js
setLoading(true);
await apiCall();
setLoading(false);
```

Nếu API lỗi, `setLoading(false)` không chạy.

Tốt:

```js
setLoading(true);
setError('');
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  setError(getSafeApiErrorMessage(error));
} finally {
  setLoading(false);
}
```

### 10.3. Error message không được đổ lỗi user nếu lỗi hệ thống

Không nên:

```txt
Bạn nhập sai, không thể tải dữ liệu.
```

khi thực tế backend 500.

Nên:

```txt
Hệ thống chưa thể tải dữ liệu. Vui lòng thử lại sau.
```

### 10.4. Empty state phải phân biệt với error

Không tốt:

```txt
Không có dữ liệu
```

cho mọi trường hợp.

Tốt:

```txt
Chưa có cơ sở y tế phù hợp với bộ lọc hiện tại.
```

hoặc:

```txt
Không thể tải danh sách cơ sở y tế. Vui lòng thử lại.
```

### 10.5. Action loading riêng cho từng row

Trong table CRUD, không khóa toàn bộ UI nếu chỉ xóa một row, trừ khi cần.

```js
const [deletingUserId, setDeletingUserId] = useState(null);
```

```jsx
<Button
  disabled={deletingUserId === user.id}
  loading={deletingUserId === user.id}
  onClick={() => onDeleteUser(user.id)}
>
  Xóa
</Button>
```

### 10.6. Success state không được làm mất dữ liệu quan trọng

Sau submit form lỗi, không clear form. Sau submit thành công, chỉ clear khi user không cần dữ liệu nữa.

### 10.7. Retry phải an toàn

Retry không nên gửi lại action phá dữ liệu nếu không có confirm. Với GET/list/load status thì retry thường an toàn. Với POST payment/checkout/delete, cần kiểm soát idempotency hoặc confirm.

---

## 11. Form standards

### 11.1. Form production phải có tối thiểu

- label rõ cho từng field;
- validation trước khi submit nếu có thể;
- field error hoặc summary error;
- disable submit khi submitting;
- không submit nhiều lần;
- không mất input khi API lỗi;
- success/error message rõ;
- không log giá trị nhạy cảm;
- keyboard submit hoạt động;
- mobile layout không vỡ.

### 11.2. Cấu trúc form state chuẩn

```js
const [form, setForm] = useState(initialForm);
const [fieldErrors, setFieldErrors] = useState({});
const [submitError, setSubmitError] = useState('');
const [submitting, setSubmitting] = useState(false);
```

### 11.3. Update field chuẩn

```js
function updateField(fieldName, value) {
  setForm((current) => ({
    ...current,
    [fieldName]: value,
  }));

  setFieldErrors((current) => {
    if (!current[fieldName]) return current;
    const next = { ...current };
    delete next[fieldName];
    return next;
  });
}
```

### 11.4. Submit chuẩn

```js
async function handleSubmit(event) {
  event.preventDefault();

  const errors = validateProfileForm(form);
  setFieldErrors(errors);
  if (Object.keys(errors).length > 0) {
    return;
  }

  setSubmitting(true);
  setSubmitError('');
  try {
    await patientProfilesApi.save(form);
    onSuccess?.();
  } catch (error) {
    setSubmitError(getSafeApiErrorMessage(error, 'Không thể lưu hồ sơ.'));
  } finally {
    setSubmitting(false);
  }
}
```

### 11.5. Validation không viết inline trong JSX

Không tốt:

```jsx
{form.email && !form.email.includes('@') ? <p>Email sai</p> : null}
```

Tốt:

```js
function validateAuthForm(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!isValidEmail(form.email)) errors.email = 'Email không hợp lệ.';
  if (!form.password) errors.password = 'Vui lòng nhập mật khẩu.';
  return errors;
}
```

### 11.6. Error message gần field

```jsx
<Field
  label="Email"
  value={form.email}
  error={fieldErrors.email}
  required
  onChange={(event) => updateField('email', event.target.value)}
/>
```

### 11.7. Form y tế cần cẩn trọng hơn

Các field liên quan sức khỏe như triệu chứng, chiều cao, cân nặng, nhóm máu, thuốc, bệnh nền phải:

- validate range hợp lý;
- không log;
- không lưu localStorage nếu không cần;
- có copy privacy/safety nếu phù hợp;
- không tự đưa kết luận chẩn đoán chắc chắn.

### 11.8. Form không nên chứa API payload raw nếu field UI khác backend

Tách mapper:

```js
function buildPatientProfilePayload(form) {
  return {
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    bloodType: form.bloodType || null,
  };
}
```

Component không nên tự build payload dài trong submit nếu form phức tạp.

---

## 12. Table/list CRUD standards

### 12.1. Table admin phải có state đầy đủ

| State | Yêu cầu |
| --- | --- |
| Loading | Skeleton hoặc text rõ |
| Empty | Message rõ, CTA tạo mới nếu phù hợp |
| Error | Message + retry |
| Pagination | Hiển thị page/pageSize nếu backend phân trang |
| Row action loading | Disable đúng action đang chạy |
| Dangerous action | Confirm trước khi thực hiện |
| Mobile | Không mất action chính |

### 12.2. Action label phải rõ

Không dùng icon-only button không có accessible name.

Không tốt:

```jsx
<button><TrashIcon /></button>
```

Tốt:

```jsx
<button aria-label={`Xóa người dùng ${user.fullName}`}>
  <TrashIcon aria-hidden="true" />
</button>
```

### 12.3. Delete confirm

Với action phá dữ liệu:

```jsx
<ConfirmDialog
  title="Xóa người dùng?"
  description={`Bạn sắp xóa ${user.fullName}. Hành động này không thể hoàn tác.`}
  confirmLabel="Xóa người dùng"
  tone="danger"
  onConfirm={() => deleteUser(user.id)}
/>
```

### 12.4. Không mutate list trực tiếp

Không tốt:

```js
users.splice(index, 1);
setUsers(users);
```

Tốt:

```js
setUsers((current) => current.filter((user) => user.id !== deletedUserId));
```

### 12.5. Optimistic update phải có rollback

Nếu update UI trước khi API success:

```js
const previousUsers = users;
setUsers(applyUpdate(users, updatedUser));
try {
  await usersApi.update(updatedUser.id, payload);
} catch (error) {
  setUsers(previousUsers);
  setError(getSafeApiErrorMessage(error));
}
```

Nếu không có rollback, không dùng optimistic update cho admin/payment/medical critical actions.

---

## 13. Routing, navigation và access standards

### 13.1. Route mới phải đi qua route metadata

Không thêm route bằng cách hard-code nhiều nơi. Route cần có:

- `id`;
- `path`;
- `title`;
- `access`;
- `roles` nếu role route;
- `shell` nếu thuộc workspace;
- navigation metadata nếu cần hiện menu.

### 13.2. Route ID convention

```txt
public.home
auth.login
auth.signup
patient.dashboard
patient.symptom
patient.chat
patient.records
payment.pricing
payment.return
workspace.staff
admin.users
admin.doctors
admin.aiConfigs
```

### 13.3. Access level phải chọn rõ

| Access | Khi dùng | Ví dụ |
| --- | --- | --- |
| `public` | Ai cũng xem được | landing, pricing, map public nếu cho phép |
| `auth` | Cần đăng nhập | profile, symptom flow cá nhân |
| `premium` | Cần quyền trả phí | chat AI, records, medication nếu là premium |
| `role` | Cần role cụ thể | admin, staff workspace |

### 13.4. Alias không được bypass access

Nếu `/admin` alias sang `/app/admin`, cả hai phải đi qua cùng access check.

Checklist alias:

- alias có lý do;
- alias không mở private content;
- returnTo vẫn đúng;
- không redirect loop;
- test route alias.

### 13.5. Navigation không dùng `window.location.href` tùy tiện

Dùng helper navigation của app nếu là internal route.

Chỉ dùng full reload khi:

- logout cần reset toàn bộ app;
- chuyển external provider/payment;
- yêu cầu đặc biệt có ghi chú.

### 13.6. Document title

Mỗi route production nên có title rõ. Không để mọi trang là `MediMate AI` nếu có thể.

### 13.7. Unknown route

Route không tồn tại phải có 404/recovery UI:

- nói rõ trang không tồn tại;
- CTA về dashboard/home;
- không crash;
- không lộ internal route list nhạy cảm.

---

## 14. CSS và design system standards

### 14.1. Token-first

Ưu tiên token thay vì hard-code.

Tốt:

```css
.admin-users-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
  padding: var(--space-4);
}
```

Không tốt:

```css
.admin-users-card {
  border-radius: 17px;
  box-shadow: 0 3px 17px rgba(1, 2, 3, .22);
  color: #121212;
  padding: 19px;
}
```

### 14.2. Không thêm feature CSS vào global nếu không cần

`global.css` chỉ nên chứa:

- reset/base;
- token;
- typography foundation;
- layout utilities thật sự dùng chung;
- accessibility utilities.

Feature-specific CSS đặt trong feature:

```txt
features/admin/users/admin-users.css
features/payment/pricing/pricing-page.css
features/symptom-analysis/symptom-analysis.css
```

### 14.3. Selector phải có namespace

Tốt:

```css
.admin-users-table {}
.symptom-analysis-question-card {}
.payment-result-status {}
```

Không tốt:

```css
.card {}
.title {}
.content {}
.box {}
.form {}
```

### 14.4. Không dùng `!important` để chữa nhanh

Chỉ dùng khi có lý do cực rõ, ví dụ override third-party style không có cách khác. Nếu dùng, comment lý do.

### 14.5. Focus visible bắt buộc

```css
.button:focus-visible,
.link:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

Không xóa outline nếu chưa thay bằng focus style rõ.

### 14.6. Responsive cần test tối thiểu

Mọi layout mới cần check:

- mobile 360px;
- tablet khoảng 768px;
- desktop 1280px;
- text dài tiếng Việt;
- table/list overflow;
- modal không vượt viewport.

### 14.7. Z-index policy

Không hard-code z-index tùy tiện. Nên có token/layer:

```txt
base: 1
sticky header: 10
dropdown: 30
modal overlay: 100
toast: 120
```

### 14.8. CSS cleanup

Khi xóa CSS:

1. grep selector;
2. kiểm tra dynamic class nếu có;
3. chạy visual/manual các route liên quan;
4. không xóa hàng trăm dòng trong PR không có evidence.

---

## 15. UI primitive standards

### 15.1. Button

Button primitive phải hỗ trợ:

- `type` mặc định hợp lý, thường là `button`;
- `disabled`;
- `loading` nếu dùng trong form/action;
- `variant` giới hạn;
- `size` giới hạn;
- `aria-label` cho icon-only;
- không làm mất focus.

Ví dụ:

```jsx
<Button
  type="submit"
  variant="primary"
  loading={submitting}
  disabled={submitting}
>
  Lưu thay đổi
</Button>
```

### 15.2. Field

Field primitive phải có:

- label;
- id liên kết label/input;
- error;
- help text;
- required state;
- disabled state;
- `aria-describedby` nếu có error/help.

### 15.3. Dialog

Dialog phải có:

- title;
- accessible name;
- focus management;
- Escape close nếu phù hợp;
- overlay click policy rõ;
- restore focus sau khi đóng;
- không scroll body sai.

### 15.4. Card

Card không nên chứa semantic sai. Nếu card là link/action, dùng `a`/`button` đúng, không dùng `div onClick` nếu không có keyboard support.

### 15.5. Table

Table primitive phải hỗ trợ:

- header rõ;
- empty/loading/error state;
- row key ổn định;
- action column accessible;
- responsive fallback.

---

## 16. Accessibility standards

### 16.1. Form accessibility

Bắt buộc:

- input có label visible hoặc accessible label;
- error message liên kết với field nếu có thể;
- không chỉ dùng màu để báo lỗi;
- required state rõ;
- keyboard submit hoạt động.

### 16.2. Button/link accessibility

- Button dùng cho action.
- Link dùng cho navigation.
- Không dùng `div` giả button.
- Icon-only phải có `aria-label`.
- Disabled state phải rõ.

Không tốt:

```jsx
<div onClick={submit}>Gửi</div>
```

Tốt:

```jsx
<button type="submit">Gửi</button>
```

### 16.3. Dialog accessibility

Dialog cần:

- role/dialog semantics;
- title;
- focus vào dialog khi mở;
- trap focus;
- restore focus;
- Escape close nếu không phải destructive confirmation bắt buộc.

### 16.4. Table accessibility

- Dùng `th` cho header.
- Action button có label cụ thể.
- Không chỉ dùng icon/màu để phân biệt status.
- Mobile card fallback vẫn giữ label field.

### 16.5. Color contrast

Không dùng text mờ trên nền sáng/tối nếu không check contrast. Warning/error/success phải có text hoặc icon kèm label, không chỉ màu.

### 16.6. Keyboard flow

Mọi flow chính phải dùng được bằng keyboard:

- login/signup;
- symptom form;
- admin table actions;
- dialog confirm;
- payment checkout CTA;
- map/list fallback action.

### 16.7. Motion/animation

Animation không được cản user. Tránh animation quá dài. Nếu dùng view transition, phải có fallback khi browser không hỗ trợ.

---

## 17. Security standards

### 17.1. Không commit secret

Không được commit:

- API key thật;
- access token;
- refresh token;
- password;
- private backend URL nhạy cảm;
- provider secret;
- test account thật nếu không được phép.

### 17.2. `VITE_*` không phải secret

Trong Vite, biến `VITE_*` được expose ra browser bundle. Chỉ dùng cho public config như client ID public, app env, feature flag không nhạy cảm.

Không dùng `VITE_*` cho:

- Anthropic/OpenAI/AI provider secret;
- backend private token;
- payment secret;
- admin secret.

### 17.3. Auth/session

- Không tự đọc token rải rác ngoài auth/apiClient layer.
- Logout phải clear session dù API logout fail.
- 401/403 phải xử lý tập trung.
- Không log token.
- Không lưu dữ liệu sức khỏe vào localStorage nếu không cần.

### 17.4. PII và medical data

Không log:

- triệu chứng user nhập;
- hồ sơ bệnh án;
- thuốc đang dùng;
- số điện thoại/email nếu không cần;
- token;
- payment payload nhạy cảm.

Nếu cần debug, dùng dữ liệu giả hoặc mask:

```js
const maskedEmail = maskEmail(user.email);
```

### 17.5. HTML rendering

Không render HTML từ user input nếu chưa sanitize.

Không tốt:

```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

Nếu bắt buộc render HTML từ CMS/static trusted source, phải có policy rõ.

### 17.6. Production API

Production không nên gọi HTTP/IP thô nếu có dữ liệu nhạy cảm. Dùng HTTPS domain và cấu hình env/platform.

### 17.7. Security review bắt buộc

PR cần reviewer có kinh nghiệm nếu đụng:

- auth/session/token;
- payment/subscription;
- AI provider;
- symptom/medical safety;
- env/deploy;
- admin role/access;
- storage/localStorage/sessionStorage.

---

## 18. Medical/product safety standards

### 18.1. Không chẩn đoán khẳng định

Không dùng copy:

```txt
Bạn bị bệnh X.
Kết quả này chính xác.
Bạn không cần đi khám.
Thuốc này chắc chắn an toàn.
```

Dùng copy:

```txt
Thông tin này chỉ hỗ trợ định hướng ban đầu và không thay thế chẩn đoán từ bác sĩ.
Bạn nên trao đổi với cơ sở y tế hoặc bác sĩ nếu triệu chứng kéo dài, nặng hơn hoặc khiến bạn lo lắng.
```

### 18.2. Emergency guidance

Flow symptom/AI nên có hướng dẫn an toàn cho dấu hiệu nặng:

```txt
Nếu bạn có đau ngực, khó thở, lơ mơ, ngất, yếu/liệt một bên cơ thể, chảy máu nhiều hoặc triệu chứng nghiêm trọng, hãy liên hệ cấp cứu hoặc đến cơ sở y tế gần nhất ngay.
```

### 18.3. Demo/mock phải trung thực

Bất kỳ demo liên quan y tế phải:

- có nhãn demo rõ;
- nói rõ không phải dữ liệu thật;
- không được dùng làm khuyến nghị điều trị;
- không xuất hiện như production capability nếu chưa sẵn sàng.

### 18.4. Medication safety

Không để UI nói thuốc an toàn/tương tác thuốc chắc chắn nếu backend/medical validation chưa có. Medication demo phải có banner rõ.

### 18.5. Records safety

Hồ sơ y tế demo không được trông như dữ liệu thật của user nếu không có nhãn. Nếu có route `/records`, cần phân biệt:

```txt
Dữ liệu minh họa
```

và:

```txt
Dữ liệu hồ sơ thật của bạn
```

### 18.6. AI output presentation

AI output nên có:

- disclaimer;
- mức độ không chắc chắn;
- CTA đi khám khi cần;
- không tạo false reassurance;
- không tự kê thuốc;
- không hướng dẫn hành động nguy hiểm.

---

## 19. Performance standards

### 19.1. Lazy loading

Các page nặng nên lazy load:

- map;
- admin workspace nếu bundle lớn;
- medical assistant/chat nếu kéo thư viện lớn;
- visual-heavy/static-heavy pages.

### 19.2. Không import thư viện nặng vào route không cần

Không để MapLibre hoặc thư viện tương tự nằm trong landing bundle nếu chỉ `/map` dùng.

### 19.3. Memoization hợp lý

Dùng `useMemo`/`useCallback` khi:

- tính toán list lớn;
- truyền callback vào component memoized;
- tránh render table/list nặng;
- derived data tốn chi phí.

Không dùng memoization bừa bãi cho mọi biến nhỏ.

### 19.4. Debounce search/filter

Nếu input search gọi API, cần debounce.

```js
const debouncedSearch = useDebounce(search, 300);
```

Không gọi API mỗi phím nếu backend không yêu cầu realtime.

### 19.5. Image/assets

- Dùng kích thước ảnh phù hợp.
- Lazy load ảnh ngoài viewport.
- Không dùng ảnh quá lớn cho icon/thumbnail.
- Có alt text nếu ảnh có nghĩa.

### 19.6. Bundle budget

Khi thêm dependency mới, PR phải trả lời:

- dependency có thật sự cần không;
- có thể tự viết nhỏ hơn không;
- bundle tăng bao nhiêu;
- có tree-shaking tốt không;
- có rủi ro security/license không.

### 19.7. Avoid unnecessary re-render

- Không tạo object/function mới trong props list lớn nếu gây re-render đáng kể.
- Tách row component nếu table lớn.
- Không đặt state quá cao nếu chỉ một component cần.
- Không đưa mọi thứ vào context global.

---

## 20. State management standards

### 20.1. Local state mặc định

Dùng local state nếu state chỉ dùng trong một component/feature nhỏ.

Ví dụ:

- modal open;
- selected row;
- form input;
- local loading;
- active tab trong section.

### 20.2. Derived state không nên lưu riêng

Không tốt:

```js
const [filteredUsers, setFilteredUsers] = useState([]);
useEffect(() => {
  setFilteredUsers(users.filter(...));
}, [users, filters]);
```

Tốt:

```js
const filteredUsers = useMemo(() => {
  return users.filter((user) => matchesFilters(user, filters));
}, [users, filters]);
```

### 20.3. Global/shared state chỉ dùng khi có lý do

Đưa state lên global khi:

- nhiều feature cần;
- có lifecycle rõ;
- có reset policy;
- có validate allowed values;
- không chứa dữ liệu nhạy cảm không cần thiết.

### 20.4. Tránh prop drilling bằng composition hoặc context có scope

Không đưa context toàn app nếu chỉ một subtree cần.

Tốt:

```jsx
<AdminUsersProvider>
  <AdminUsersToolbar />
  <AdminUsersTable />
</AdminUsersProvider>
```

nếu chỉ admin users dùng.

### 20.5. Storage policy

| Storage | Dùng cho | Không dùng cho |
| --- | --- | --- |
| localStorage | preference không nhạy cảm, auth hiện tại nếu MVP policy | triệu chứng, hồ sơ y tế chi tiết, provider secret |
| sessionStorage | state tạm thời theo phiên | dữ liệu cần bền hoặc nhạy cảm dài hạn |
| memory state | form/API state | dữ liệu cần persist qua reload |

### 20.6. Clear session

Logout hoặc expired auth phải clear các key liên quan `medimate.*` theo policy.

---

## 21. Environment/config standards

### 21.1. Không đọc env rải rác

Tạo config module:

```js
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  appEnv: import.meta.env.MODE,
  isProduction: import.meta.env.PROD,
};
```

UI/service import `appConfig`, không đọc `import.meta.env` khắp nơi.

### 21.2. Env bắt buộc phải fail rõ

Nếu thiếu config critical, không silent fail.

```js
export function requireConfig(value, name) {
  if (!value) {
    throw new Error(`Missing required config: ${name}`);
  }
  return value;
}
```

Không dùng throw làm crash production user-facing nếu flow có thể fallback UI, nhưng dev/build nên phát hiện sớm.

### 21.3. `.env.example`

Chỉ chứa placeholder:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Không chứa IP/backend thật nếu không nên public, không chứa secret.

### 21.4. Feature flags

Feature chưa production-ready nên có flag hoặc route/nav policy:

```js
export const featureFlags = {
  medicationDemo: import.meta.env.VITE_ENABLE_MEDICATION_DEMO === 'true',
};
```

Không chỉ ẩn bằng CSS.

---

## 22. Testing standards

### 22.1. Test tối thiểu trước PR

```bash
npm run lint
npm run build
```

Nếu vùng sửa có E2E liên quan, chạy spec tương ứng.

### 22.2. Chọn loại test

| Code/flow | Loại test phù hợp |
| --- | --- |
| normalize/helper/validation | Unit test |
| API service behavior | Integration test với mock fetch |
| route/access/premium | E2E route/access |
| payment return/cancel/pending | E2E/fixture |
| admin CRUD flow | E2E + service test nếu có |
| dialog/form accessibility | A11y + keyboard manual |
| layout lớn | Visual regression/manual screenshot |

### 22.3. Test name phải mô tả behavior

Tốt:

```js
test('redirects non-premium users from chat to pricing', async ({ page }) => {});
```

Không tốt:

```js
test('case 1', async ({ page }) => {});
```

### 22.4. Test data không dùng dữ liệu thật

Không dùng:

- hồ sơ y tế thật;
- email cá nhân thật;
- token thật;
- payment real secret;
- thông tin bệnh nhân thật.

### 22.5. Selector test ổn định

Ưu tiên role/label hoặc `data-testid` có chủ đích.

```jsx
<button data-testid="admin-users-delete-button">Xóa</button>
```

Không dựa vào CSS class nếu class có thể đổi vì style.

### 22.6. Không sửa test chỉ để pass

Nếu test fail, phải xác định:

- behavior sai;
- selector brittle;
- fixture sai;
- test không còn đúng do yêu cầu mới.

PR phải giải thích nếu update test/snapshot.

### 22.7. Manual test evidence

Nếu chưa có automation, PR cần ghi rõ:

```txt
Manual test:
- Login admin -> /app/admin/users -> load list ok
- Open create dialog -> validation works
- Submit duplicate email -> error shown
- Delete user -> confirm dialog shown
- Mobile 390px -> table fallback usable
```

---

## 23. Documentation standards

### 23.1. Khi nào phải cập nhật docs

Bắt buộc cập nhật docs khi:

- thêm/đổi route;
- thêm/đổi API endpoint;
- đổi access/role/premium;
- đổi folder structure;
- đổi env/deploy;
- bật/tắt demo production;
- thêm flow nghiệp vụ;
- đổi strategy auth/payment/AI;
- tạo shared component/API pattern mới.

### 23.2. Docs tốt phải thao tác được

Docs không chỉ ghi “nên chuẩn hóa API”. Docs phải nói:

- chuẩn hóa ở file nào;
- làm từng bước ra sao;
- ví dụ trước/sau;
- test gì;
- pass/fail như thế nào;
- rủi ro gì.

### 23.3. Không viết docs sai sự thật

Không ghi “đã có test” nếu chưa có. Không ghi “production-ready” nếu capability còn mock/demo.

### 23.4. Docs phải sống cùng code

Nếu PR đổi code làm docs cũ sai, PR phải cập nhật docs hoặc tạo follow-up rõ với owner.

---

## 24. Git, commit và PR standards

### 24.1. Branch naming

Tốt:

```txt
refactor/admin-users-section
fix/auth-clear-expired-session
chore/env-remove-hardcoded-api
feat/payment-pending-status-ui
docs/update-coding-standards
```

Không tốt:

```txt
update
fixbug
new
my-branch
final-code
```

### 24.2. Commit message

Format:

```txt
type(scope): message
```

Type gợi ý:

| Type | Khi dùng |
| --- | --- |
| `feat` | Thêm behavior mới |
| `fix` | Sửa bug |
| `refactor` | Đổi cấu trúc không đổi behavior |
| `test` | Thêm/sửa test |
| `docs` | Cập nhật tài liệu |
| `chore` | Tooling/config không đổi behavior user |
| `style` | CSS/format visual nếu không đổi logic |

Ví dụ:

```txt
refactor(admin): extract ai config section
fix(payment): handle missing order code on return page
test(route): cover premium redirect for medication
docs(api): document endpoint addition workflow
```

### 24.3. PR title

PR title phải rõ scope và intent.

```txt
refactor(admin): extract AI configs section from workspace page
```

Không dùng:

```txt
update frontend
fix all
new version
```

### 24.4. PR description bắt buộc

```md
## Summary
...

## Changes
- ...

## Not changed
- ...

## Risk area
- [ ] Auth/session
- [ ] Payment/subscription
- [ ] AI/symptom/medical safety
- [ ] Admin CRUD
- [ ] Deploy/env
- [ ] CSS/layout
- [ ] None

## Test evidence
- npm run lint: pass
- npm run build: pass
- E2E/manual: ...

## Docs
- Updated: ...
- Not needed because: ...
```

### 24.5. PR size

PR nên nhỏ vừa review được. Nếu diff quá lớn, tách:

- behavior-preserving refactor;
- behavior fix;
- CSS update;
- test update;
- docs update.

Không gom auth/payment/API/CSS/route trong một PR nếu không bắt buộc.

---

## 25. Code review standards

### 25.1. Reviewer phải kiểm tra nhiều hơn style

Reviewer cần kiểm:

- đúng layer chưa;
- scope có lan không;
- API có qua service không;
- route/access có đúng không;
- loading/error/empty có đủ không;
- security/safety có bị ảnh hưởng không;
- test/evidence có đủ không;
- docs có cần cập nhật không;
- có tạo nợ kỹ thuật mới không.

### 25.2. Review comment phải cụ thể

Không nên:

```txt
Code xấu, sửa đi.
```

Nên:

```txt
Component này đang gọi fetch trực tiếp. Theo API boundary, vui lòng chuyển endpoint vào endpoints.js, tạo domain service và để component gọi qua hook.
```

### 25.3. Khi nào reviewer phải block

Block nếu:

- có secret/token;
- bypass auth/role/premium;
- API direct trong UI;
- mock y tế không nhãn;
- lint/build fail;
- payment/auth/AI đổi mà thiếu test/evidence;
- PR quá lớn không thể review an toàn.

### 25.4. Khi nào reviewer nên yêu cầu chia PR

- PR vừa refactor vừa đổi behavior.
- PR đổi nhiều domain.
- PR đổi CSS global lớn và logic API cùng lúc.
- PR tách page lớn nhưng cũng đổi route/access.
- PR update snapshot hàng loạt không giải thích.

### 25.5. Review không nên yêu cầu style cá nhân nếu không nằm trong chuẩn

Nếu chỉ là preference cá nhân và không ảnh hưởng maintainability, không nên block. Dùng chuẩn trong tài liệu này để thống nhất.

---

## 26. Logging và observability standards

### 26.1. Không dùng console log bừa bãi

Không để `console.log` trong production code nếu chứa dữ liệu runtime nhạy cảm.

Có thể dùng trong dev tạm thời nhưng phải xóa trước merge.

### 26.2. Không log dữ liệu nhạy cảm

Không log:

- auth token;
- symptoms;
- patient profile;
- medication;
- payment raw response nếu chứa thông tin nhạy cảm;
- full API payload có PII.

### 26.3. Error logging an toàn

Nếu có error tracking sau này, log nên mask dữ liệu:

```js
logError('payment_status_failed', {
  orderCode: maskOrderCode(orderCode),
  statusCode: error.status,
});
```

Không log full request/response.

### 26.4. User-facing error khác developer error

User cần message dễ hiểu. Developer cần context trong safe logs/test evidence. Không hiển thị stack trace cho user.

---

## 27. Dependency standards

### 27.1. Trước khi thêm package mới

PR phải trả lời:

- package giải quyết vấn đề gì;
- có thể dùng native API hoặc package hiện có không;
- bundle size ra sao;
- package có maintained không;
- license có phù hợp không;
- có ảnh hưởng security không;
- import có tree-shaking không.

### 27.2. Không thêm dependency cho việc nhỏ

Không thêm package chỉ để:

- format date đơn giản nếu `Intl` đủ;
- debounce đơn giản có thể tự viết;
- classnames nếu repo chưa cần;
- utility nhỏ một dòng.

### 27.3. Dependency nặng phải lazy hoặc isolated

Map/chat/editor/chart library nên được lazy load nếu chỉ dùng ở route cụ thể.

### 27.4. Xóa dependency không dùng

Khi thấy package không dùng:

1. grep import;
2. kiểm tra dynamic import;
3. xóa khỏi package;
4. chạy install/build;
5. cập nhật docs nếu package liên quan setup.

---

## 28. Comment, TODO và deprecation standards

### 28.1. Comment giải thích vì sao

Tốt:

```js
// Keep same-origin requests so Vite/Vercel proxy can switch backend per environment.
```

Không tốt:

```js
// Set loading true
setLoading(true);
```

### 28.2. TODO phải có owner hoặc điều kiện

Tốt:

```js
// TODO(FE-BE contract): replace mock facility ranking when /api/facility-recommendations is available.
```

Không tốt:

```js
// TODO fix later
```

### 28.3. Deprecated file/function

```js
/**
 * @deprecated Prefer importing from '@/features/admin/ai-configs'.
 * Kept as compatibility export during feature-first migration.
 * Remove after all legacy imports are migrated.
 */
export { aiConfigApi } from '@/features/admin/ai-configs';
```

Deprecated code không được thêm logic mới.

---

## 29. Checklist trước khi mở PR

Developer tự kiểm trước khi mở PR:

- [ ] PR có một mục tiêu chính.
- [ ] Scope không lan sang nhiều domain không liên quan.
- [ ] Không gọi API trực tiếp trong component/page.
- [ ] Endpoint mới nằm trong endpoint registry.
- [ ] API UI có loading/error/empty state.
- [ ] Form có validation/submitting/error rõ.
- [ ] Không thêm secret/token/API key.
- [ ] Không log PII/medical data.
- [ ] Không thêm mock/demo không nhãn.
- [ ] Không bypass auth/role/premium.
- [ ] CSS feature không thêm vào global nếu không cần.
- [ ] Accessibility cơ bản đã kiểm.
- [ ] Lint/build đã chạy hoặc ghi rõ lý do không chạy được.
- [ ] Test liên quan đã chạy hoặc có manual evidence.
- [ ] Docs đã cập nhật nếu cần.

## 30. Checklist reviewer

Reviewer kiểm:

- [ ] PR title/description rõ.
- [ ] Diff đủ nhỏ để review.
- [ ] Boundary đúng.
- [ ] API layer đúng.
- [ ] State đặt đúng nơi.
- [ ] Component props rõ.
- [ ] Loading/error/empty đầy đủ.
- [ ] Security/safety không bị ảnh hưởng.
- [ ] Test/evidence đủ theo rủi ro.
- [ ] Docs không bị stale.
- [ ] Không có blocker trong phần 2.

## 31. Checklist sau merge

Owner kiểm:

- [ ] CI main pass.
- [ ] Preview deploy hoạt động nếu có.
- [ ] Route/flow bị ảnh hưởng smoke test ok.
- [ ] Task status cập nhật.
- [ ] Follow-up được tạo nếu có nợ kỹ thuật.
- [ ] Team được thông báo nếu thay đổi convention/process.

---

## 32. Rule cards áp dụng khi review

Các rule card dưới đây có thể copy vào PR comment hoặc checklist issue. Mỗi rule có mức độ ưu tiên để reviewer biết khi nào cần block.

### CS-01. Không gọi API trực tiếp trong component/page

**Mức độ:** Blocker  
**Nhóm:** API Layer

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Component gọi `fetch` hoặc hard-code `/api/...` trong JSX/page.

#### Quy định bắt buộc

Tạo endpoint trong `endpoints.js`, domain service, hook feature rồi component gọi hook.

#### File/thư mục cần kiểm tra

`src/pages, src/components, src/features, src/services`

#### Ví dụ review comment

```txt
Rule CS-01: Không gọi API trực tiếp trong component/page. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-02. Endpoint phải tập trung trong endpoint registry

**Mức độ:** High  
**Nhóm:** API Layer

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

URL backend rải rác khiến đổi contract khó kiểm soát.

#### Quy định bắt buộc

Định nghĩa URL trong `ENDPOINTS`, service import từ đó.

#### File/thư mục cần kiểm tra

`src/services/endpoints.js, src/shared/api/endpoints.js`

#### Ví dụ review comment

```txt
Rule CS-02: Endpoint phải tập trung trong endpoint registry. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-03. Không expose provider secret ở frontend

**Mức độ:** Blocker  
**Nhóm:** Security

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`VITE_ANTHROPIC_KEY` hoặc provider key nằm trong client bundle.

#### Quy định bắt buộc

Frontend gọi backend gateway, backend giữ secret.

#### File/thư mục cần kiểm tra

`.env*, src/services, src/features/chatbot`

#### Ví dụ review comment

```txt
Rule CS-03: Không expose provider secret ở frontend. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-04. Mọi API UI phải có loading/error/empty state

**Mức độ:** High  
**Nhóm:** UX/API

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

User thấy blank UI hoặc tưởng request thành công.

#### Quy định bắt buộc

Tạo state rõ trong hook/container và render fallback.

#### File/thư mục cần kiểm tra

`pages/features có API call`

#### Ví dụ review comment

```txt
Rule CS-04: Mọi API UI phải có loading/error/empty state. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-05. Form phải disable submit khi submitting

**Mức độ:** High  
**Nhóm:** Forms

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

User click nhiều lần tạo duplicate request.

#### Quy định bắt buộc

Dùng `submitting`, disable button, loading label.

#### File/thư mục cần kiểm tra

`Auth/Profile/Admin/Payment forms`

#### Ví dụ review comment

```txt
Rule CS-05: Form phải disable submit khi submitting. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-06. Không log dữ liệu y tế/PII/token

**Mức độ:** Blocker  
**Nhóm:** Security

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`console.log` chứa symptom, profile, token, payment payload.

#### Quy định bắt buộc

Xóa log hoặc mask dữ liệu; dùng fake data khi debug.

#### File/thư mục cần kiểm tra

`Toàn bộ src`

#### Ví dụ review comment

```txt
Rule CS-06: Không log dữ liệu y tế/PII/token. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-07. Demo/mock y tế phải gắn nhãn hoặc ẩn production

**Mức độ:** Blocker  
**Nhóm:** Medical Safety

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Records/medication/mock recommendations hiển thị như thật.

#### Quy định bắt buộc

Banner demo, feature flag hoặc ẩn nav production.

#### File/thư mục cần kiểm tra

`records, medication, hospital recommendations`

#### Ví dụ review comment

```txt
Rule CS-07: Demo/mock y tế phải gắn nhãn hoặc ẩn production. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-08. Page lớn không tiếp tục phình logic

**Mức độ:** High  
**Nhóm:** Maintainability

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Thêm logic vào file > 800 dòng.

#### Quy định bắt buộc

Tách section/component/hook/model trước khi thêm logic lớn.

#### File/thư mục cần kiểm tra

`src/pages, src/features`

#### Ví dụ review comment

```txt
Rule CS-08: Page lớn không tiếp tục phình logic. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-09. CSS feature không thêm vào global

**Mức độ:** High  
**Nhóm:** CSS

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`global.css` tăng vì selector của một page.

#### Quy định bắt buộc

Đặt CSS cạnh feature hoặc shared UI nếu dùng chung.

#### File/thư mục cần kiểm tra

`src/styles/global.css, features/*`

#### Ví dụ review comment

```txt
Rule CS-09: CSS feature không thêm vào global. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-10. Component props phải rõ contract

**Mức độ:** Medium  
**Nhóm:** Components

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Truyền `props`, object lớn hoặc callback mơ hồ.

#### Quy định bắt buộc

Destructure props, đặt tên domain rõ.

#### File/thư mục cần kiểm tra

`components/features`

#### Ví dụ review comment

```txt
Rule CS-10: Component props phải rõ contract. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-11. Hook không trộn nhiều domain

**Mức độ:** High  
**Nhóm:** Hooks

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Một hook quản lý users, doctors, payment, facilities cùng lúc.

#### Quy định bắt buộc

Tách hook theo domain/section.

#### File/thư mục cần kiểm tra

`features/*/hooks`

#### Ví dụ review comment

```txt
Rule CS-11: Hook không trộn nhiều domain. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-12. Normalize response ở service/model

**Mức độ:** High  
**Nhóm:** API/Data

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

JSX tự xử lý nhiều shape backend.

#### Quy định bắt buộc

Tạo `normalizeXRecord` và test nếu quan trọng.

#### File/thư mục cần kiểm tra

`services, features/*/model`

#### Ví dụ review comment

```txt
Rule CS-12: Normalize response ở service/model. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-13. Route mới phải có metadata đầy đủ

**Mức độ:** High  
**Nhóm:** Routing

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Route hard-code ngoài `routes.js` hoặc thiếu access/title.

#### Quy định bắt buộc

Thêm route id/path/title/access/navigation vào metadata.

#### File/thư mục cần kiểm tra

`src/router, src/app/router`

#### Ví dụ review comment

```txt
Rule CS-13: Route mới phải có metadata đầy đủ. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-14. Alias không được bypass access

**Mức độ:** Blocker  
**Nhóm:** Routing/Auth

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Alias private route vào thẳng content.

#### Quy định bắt buộc

Tất cả alias đi qua resolve/access flow.

#### File/thư mục cần kiểm tra

`router/routes, router/access`

#### Ví dụ review comment

```txt
Rule CS-14: Alias không được bypass access. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-15. Payment flow phải xử lý missing/pending/cancel/fail

**Mức độ:** High  
**Nhóm:** Payment

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Chỉ test happy path success.

#### Quy định bắt buộc

Tạo status resolver và UI cho từng trạng thái.

#### File/thư mục cần kiểm tra

`payment pages/services/tests`

#### Ví dụ review comment

```txt
Rule CS-15: Payment flow phải xử lý missing/pending/cancel/fail. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-16. Delete/destructive action phải confirm

**Mức độ:** High  
**Nhóm:** Admin/UX

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Xóa user/facility/plan ngay khi click.

#### Quy định bắt buộc

Confirm dialog có title, description, action loading.

#### File/thư mục cần kiểm tra

`admin CRUD components`

#### Ví dụ review comment

```txt
Rule CS-16: Delete/destructive action phải confirm. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-17. Icon-only button phải có accessible name

**Mức độ:** High  
**Nhóm:** Accessibility

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Button chỉ có icon, screen reader không hiểu.

#### Quy định bắt buộc

Thêm `aria-label` cụ thể theo object.

#### File/thư mục cần kiểm tra

`shared/ui, tables, dialogs`

#### Ví dụ review comment

```txt
Rule CS-17: Icon-only button phải có accessible name. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-18. Không dùng div giả button

**Mức độ:** High  
**Nhóm:** Accessibility

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`div onClick` không keyboard accessible.

#### Quy định bắt buộc

Dùng `button` hoặc `a` đúng semantic.

#### File/thư mục cần kiểm tra

`components/features`

#### Ví dụ review comment

```txt
Rule CS-18: Không dùng div giả button. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-19. Memoization dùng theo nhu cầu thực

**Mức độ:** Low  
**Nhóm:** Performance

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Dùng `useMemo` cho mọi biến nhỏ gây nhiễu.

#### Quy định bắt buộc

Chỉ memo khi list/tính toán/props cần.

#### File/thư mục cần kiểm tra

`features/components`

#### Ví dụ review comment

```txt
Rule CS-19: Memoization dùng theo nhu cầu thực. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-20. Search gọi API phải debounce

**Mức độ:** Medium  
**Nhóm:** Performance/API

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Mỗi phím gọi API.

#### Quy định bắt buộc

Dùng `useDebounce`, chỉ request khi input ổn định.

#### File/thư mục cần kiểm tra

`search/filter hooks`

#### Ví dụ review comment

```txt
Rule CS-20: Search gọi API phải debounce. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-21. Không mutate state trực tiếp

**Mức độ:** High  
**Nhóm:** State

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`array.push/splice` rồi set cùng reference.

#### Quy định bắt buộc

Dùng immutable update.

#### File/thư mục cần kiểm tra

`components/hooks`

#### Ví dụ review comment

```txt
Rule CS-21: Không mutate state trực tiếp. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-22. Không lưu derived state nếu có thể tính

**Mức độ:** Medium  
**Nhóm:** State

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Lưu filtered/sorted list rồi sync bằng effect.

#### Quy định bắt buộc

Dùng `useMemo` từ source state.

#### File/thư mục cần kiểm tra

`components/hooks`

#### Ví dụ review comment

```txt
Rule CS-22: Không lưu derived state nếu có thể tính. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-23. Env phải qua config module

**Mức độ:** Medium  
**Nhóm:** Config

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`import.meta.env` rải rác nhiều file.

#### Quy định bắt buộc

Tạo `appConfig` và validation.

#### File/thư mục cần kiểm tra

`shared/config, services`

#### Ví dụ review comment

```txt
Rule CS-23: Env phải qua config module. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-24. Không hard-code IP production trong source

**Mức độ:** Blocker  
**Nhóm:** Deploy/Security

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Vercel/vite/env fallback trỏ IP cố định.

#### Quy định bắt buộc

Quản lý qua environment/platform config.

#### File/thư mục cần kiểm tra

`.env*, vite.config.js, vercel.json`

#### Ví dụ review comment

```txt
Rule CS-24: Không hard-code IP production trong source. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-25. Test name mô tả behavior

**Mức độ:** Low  
**Nhóm:** Testing

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

`test("case 1")` không rõ ý nghĩa.

#### Quy định bắt buộc

Đặt tên theo hành vi user/system.

#### File/thư mục cần kiểm tra

`tests/e2e, tests/unit`

#### Ví dụ review comment

```txt
Rule CS-25: Test name mô tả behavior. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-26. Không update snapshot/test chỉ để pass

**Mức độ:** High  
**Nhóm:** Testing

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

UI hỏng nhưng snapshot được accept.

#### Quy định bắt buộc

Xác minh behavior, ghi lý do update test.

#### File/thư mục cần kiểm tra

`tests/e2e/visual`

#### Ví dụ review comment

```txt
Rule CS-26: Không update snapshot/test chỉ để pass. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-27. Không dùng dữ liệu thật trong test/fixture

**Mức độ:** Blocker  
**Nhóm:** Testing/Security

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Fixture chứa PII/medical data thật.

#### Quy định bắt buộc

Dùng fake data rõ ràng.

#### File/thư mục cần kiểm tra

`tests, fixtures, docs screenshots`

#### Ví dụ review comment

```txt
Rule CS-27: Không dùng dữ liệu thật trong test/fixture. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-28. Docs phải cập nhật khi route/API đổi

**Mức độ:** Medium  
**Nhóm:** Docs

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Code đổi nhưng docs hướng dẫn sai.

#### Quy định bắt buộc

Cập nhật docs cùng PR hoặc follow-up có owner.

#### File/thư mục cần kiểm tra

`docs, README`

#### Ví dụ review comment

```txt
Rule CS-28: Docs phải cập nhật khi route/API đổi. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-29. Deprecated compatibility không chứa logic mới

**Mức độ:** Medium  
**Nhóm:** Migration

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

File re-export cũ được thêm logic mới.

#### Quy định bắt buộc

Chỉ re-export và comment deprecation.

#### File/thư mục cần kiểm tra

`services compatibility, old paths`

#### Ví dụ review comment

```txt
Rule CS-29: Deprecated compatibility không chứa logic mới. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

### CS-30. PR không trộn refactor và behavior change nếu không cần

**Mức độ:** High  
**Nhóm:** Process

#### Mục tiêu

Đảm bảo code trong repo giữ boundary rõ, dễ review, ít regression và phù hợp với sản phẩm sức khỏe.

#### Vấn đề thường gặp

Một PR vừa tách file vừa đổi API/UI behavior.

#### Quy định bắt buộc

Chia PR theo mục tiêu.

#### File/thư mục cần kiểm tra

`mọi PR`

#### Ví dụ review comment

```txt
Rule CS-30: PR không trộn refactor và behavior change nếu không cần. Vui lòng điều chỉnh theo coding standards để PR không tạo nợ kỹ thuật hoặc rủi ro production.
```

#### Cách kiểm tra

- Review diff trực tiếp.
- Grep keyword liên quan nếu cần.
- Chạy lint/build/test liên quan.
- Kiểm tra UI/manual evidence nếu rule ảnh hưởng UX.

#### Rủi ro nếu bỏ qua

- Tăng nợ kỹ thuật.
- Khó onboarding/review.
- Có thể gây lỗi production hoặc hiểu nhầm với domain y tế.

---

## 33. Mẫu code chuẩn dùng lại

### 33.1. Mẫu feature hook có loading/error/retry

```js
import { useCallback, useEffect, useState } from 'react';
import { getSafeApiErrorMessage } from '@/shared/api';
import { usersApi } from '../services/usersApi';

export function useAdminUsers(initialFilters = {}) {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await usersApi.list(filters);
      setUsers(result.items ?? []);
    } catch (requestError) {
      setError(getSafeApiErrorMessage(requestError, 'Không thể tải danh sách người dùng.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    filters,
    loading,
    error,
    setFilters,
    reload: loadUsers,
  };
}
```

### 33.2. Mẫu section component

```jsx
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { useAdminUsers } from './hooks/useAdminUsers';
import { AdminUsersTable } from './components/AdminUsersTable';

export function AdminUsersSection() {
  const { users, loading, error, reload } = useAdminUsers();

  if (loading) {
    return <LoadingState message="Đang tải danh sách người dùng..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <Card>
      <div className="admin-users-section__header">
        <h2>Người dùng</h2>
        <Button onClick={reload}>Tải lại</Button>
      </div>

      {users.length === 0 ? (
        <EmptyState message="Chưa có người dùng phù hợp." />
      ) : (
        <AdminUsersTable users={users} />
      )}
    </Card>
  );
}
```

### 33.3. Mẫu form validation

```js
export function validateDoctorInvitationForm(form) {
  const errors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ tên.';
  }

  if (!form.email.trim()) {
    errors.email = 'Vui lòng nhập email.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Email không hợp lệ.';
  }

  if (!form.departmentId) {
    errors.departmentId = 'Vui lòng chọn chuyên khoa.';
  }

  return errors;
}
```

### 33.4. Mẫu safe error state

```jsx
function ApiErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="api-error-message">
      <p>{message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}</p>
      {onRetry ? <Button onClick={onRetry}>Thử lại</Button> : null}
    </div>
  );
}
```

### 33.5. Mẫu confirm destructive action

```jsx
<ConfirmDialog
  open={confirmDeleteOpen}
  title="Xóa cơ sở y tế?"
  description="Hành động này có thể ảnh hưởng dữ liệu hiển thị cho người dùng. Vui lòng xác nhận trước khi tiếp tục."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  tone="danger"
  loading={deleting}
  onConfirm={handleConfirmDelete}
  onClose={handleCloseConfirmDelete}
/>
```

---

## 34. Onboarding checklist cho developer mới

Trong 3 ngày đầu, developer mới cần hoàn thành:

### Ngày 1 — Đọc và chạy dự án

- [ ] Đọc tài liệu tổng quan dự án.
- [ ] Đọc tài liệu cấu trúc code và luồng hoạt động.
- [ ] Đọc coding standards này.
- [ ] Chạy app local.
- [ ] Chạy `npm run lint` và `npm run build` nếu môi trường cho phép.
- [ ] Xác định được route metadata nằm ở đâu.
- [ ] Xác định được API service layer nằm ở đâu.

### Ngày 2 — Đọc code theo flow

- [ ] Trace flow login.
- [ ] Trace flow symptom analysis.
- [ ] Trace flow pricing/payment result.
- [ ] Trace admin route và section rendering.
- [ ] Ghi lại 3 câu hỏi hoặc điểm chưa rõ.

### Ngày 3 — Làm task nhỏ

- [ ] Chọn task P2/P3 hoặc UI nhỏ ít rủi ro.
- [ ] Tạo branch đúng convention.
- [ ] Mở PR có description/test evidence.
- [ ] Nhận review và sửa theo coding standards.

Developer chưa nên tự xử lý task auth/payment/AI/env/admin large refactor nếu chưa pass onboarding review.

---

## 35. Kết luận

Coding standards không nhằm làm đội ngũ chậm lại. Mục tiêu là giảm lỗi lặp lại, giảm tranh luận cảm tính, giúp nhân viên mới làm đúng ngay từ đầu và giúp reviewer có tiêu chuẩn rõ để bảo vệ chất lượng repo.

Với MediMate AI, các quy ước về security, medical safety, API boundary, route access, loading/error state và demo/mock phải được xem là tiêu chuẩn production, không phải đề xuất tùy chọn.

Khi có tình huống chưa được tài liệu này bao phủ, áp dụng nguyên tắc:

```txt
An toàn hơn -> rõ ràng hơn -> dễ test hơn -> dễ maintain hơn -> tối ưu hơn
```

Nếu vẫn không chắc, tạo ADR hoặc hỏi tech lead trước khi biến quyết định thành pattern mới trong repo.
