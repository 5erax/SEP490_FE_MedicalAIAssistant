# Chiến lược styling và design system

## 1. Lựa chọn đề xuất

Sử dụng:

- CSS custom properties cho design token.
- CSS Cascade Layers cho thứ tự ưu tiên rõ ràng.
- CSS Modules cho component/feature style.
- Một tập nhỏ layout primitive và utility dùng chung.
- `clsx` cho class theo trạng thái.
- `class-variance-authority` chỉ khi component variant trở nên phức tạp.

Không rewrite sang Tailwind, Sass hoặc CSS-in-JS.

## 2. Các lớp style

```css
@layer reset, tokens, base, layouts, components, utilities, overrides;
```

| Layer | Nội dung |
|---|---|
| `reset` | Box sizing, margin mặc định, media behavior |
| `tokens` | Color, typography, spacing, radius, shadow, motion, z-index |
| `base` | `body`, heading, link, form control và focus mặc định |
| `layouts` | Stack, cluster, grid, container, sidebar, page shell |
| `components` | Button, Field, Card, Dialog, Alert, Table, Badge |
| `utilities` | Visually hidden, text truncate, display helpers giới hạn |
| `overrides` | Tích hợp thư viện ngoài và migration tạm thời |

`overrides` không được dùng làm nơi sửa nhanh vĩnh viễn.

## 3. Cấu trúc style

```text
shared/styles/
├── index.css
├── reset.css
├── tokens.css
├── themes.css
├── base.css
├── layouts.css
├── utilities.css
└── third-party.css

shared/components/ui/Button/
├── Button.jsx
├── Button.module.css
└── Button.test.jsx

features/facility-search/components/FacilityCard/
├── FacilityCard.jsx
├── FacilityCard.module.css
└── FacilityCard.test.jsx
```

## 4. Design token

Token phải mang ý nghĩa, không chỉ mô tả màu:

```css
:root {
  --color-surface-page: ...;
  --color-surface-card: ...;
  --color-text-primary: ...;
  --color-text-muted: ...;
  --color-action-primary: ...;
  --color-status-danger: ...;
  --color-status-warning: ...;
  --space-1: ...;
  --space-2: ...;
  --radius-control: ...;
  --shadow-overlay: ...;
  --motion-duration-fast: ...;
}
```

Không dùng `--blue-500` trực tiếp trong feature. Primitive palette có thể tồn
tại nội bộ, nhưng component phải dùng semantic token.

Token tối thiểu:

- Color: background, surface, border, text, action, focus và status.
- Typography: family, size, line-height, weight.
- Spacing: thang 4 hoặc 8 px nhất quán.
- Radius, shadow, motion, breakpoint và z-index.
- Control size và touch target tối thiểu.

## 5. Style của component

Với CSS Modules:

```jsx
import clsx from "clsx";
import styles from "./Alert.module.css";

export function Alert({ tone = "info", className, ...props }) {
  return (
    <div
      className={clsx(styles.root, styles[tone], className)}
      {...props}
    />
  );
}
```

Tên class trong module ngắn và theo vai trò:

- `.root`
- `.header`
- `.content`
- `.actions`
- `.icon`
- `.danger`

Không cần BEM dài vì CSS Modules đã tạo scope.

## 6. Dynamic style

Inline style chỉ được dùng cho giá trị thật sự động:

```jsx
<div
  className={styles.progress}
  style={{ "--progress": `${progress}%` }}
/>
```

```css
.progress {
  inline-size: var(--progress);
}
```

Không dùng inline style cho màu, spacing, typography hoặc layout cố định.
Không chèn `<style>{styles}</style>` trong page.

## 7. Variant và state

Ưu tiên:

- Variant bằng prop rõ nghĩa: `tone`, `size`, `variant`.
- State phản ánh qua native attribute: `disabled`, `aria-invalid`,
  `aria-expanded`, `aria-busy`.
- State phức tạp dùng `data-state`, `data-status`.

```css
.root[data-status="error"] {
  border-color: var(--color-status-danger);
}
```

Không tạo class tùy ý từ dữ liệu backend.

## 8. Responsive design

- Mobile-first.
- Component chịu trách nhiệm layout nội bộ.
- Page shell chịu trách nhiệm vùng nội dung và sidebar.
- Breakpoint chỉ dùng token đã chuẩn hóa.
- Ưu tiên container query cho component tái sử dụng khi thực sự cần.
- Map/list phải có parity; không ẩn tác vụ quan trọng chỉ vì màn hình nhỏ.

Viewport kiểm tra tối thiểu: 320, 375, 768, 1024 và 1440 px.

## 9. Accessibility trong style

- Focus ring dùng semantic token và luôn nhìn thấy.
- Màu không phải dấu hiệu duy nhất của error/urgency.
- Hỗ trợ `prefers-reduced-motion`.
- Không vô hiệu hóa zoom hoặc ép font-size quá nhỏ.
- Touch target tối thiểu 44 x 44 px cho tác vụ chính.
- Light/dark/high-contrast phải thay token, không override từng component.

## 10. Quy tắc chống CSS drift

- Không hard-code màu mới ngoài `tokens.css` nếu không có lý do được review.
- Không dùng `!important` ngoài utility/accessibility hoặc third-party override.
- Không dùng selector page để sửa component con từ xa.
- Không selector sâu hơn ba cấp.
- Không import CSS feature vào global entry.
- Component import stylesheet của chính nó.
- Xóa style legacy sau khi vertical slice đã migration và visual test đạt.

## 11. Style hướng hình ảnh đề xuất

MediMate nên dùng phong cách **calm clinical guidance**:

- Nền sáng, tương phản rõ, khoảng trắng rộng.
- Màu chủ đạo xanh/teal dịu; danger/warning chỉ dành cho trạng thái.
- Card và form đơn giản, ít hiệu ứng trang trí.
- Typography rõ ràng, ưu tiên khả năng đọc hơn mật độ.
- Icon hỗ trợ nhãn, không thay thế toàn bộ chữ.
- Motion ngắn và có mục đích: điều hướng, feedback, progress.
- Nội dung Patient thân thiện; workspace Staff/Admin có mật độ cao hơn nhưng
  vẫn dùng cùng token và primitive.

Không dùng glassmorphism dày, gradient trang trí quá mức hoặc animation liên tục
trong luồng y tế.
