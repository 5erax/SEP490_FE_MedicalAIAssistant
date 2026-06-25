# Performance optimization playbook

Ngày cập nhật: **2026-06-26**.

Tài liệu này dùng khi web chậm, bundle lớn, route nặng hoặc cần cải thiện trải nghiệm tải.

## 1. Nguyên tắc

- Không tối ưu mù.
- Đo trước, sửa sau, đo lại.
- Ưu tiên route chính và route nặng.
- Không hy sinh accessibility để lấy điểm performance.
- Không thêm dependency performance nếu chưa chứng minh cần.

## 2. Performance targets hiện tại

Baseline local hiện tại:

| Metric | Budget |
| --- | --- |
| DOMContentLoaded | `< 5,000 ms` |
| Load | `< 8,000 ms` |
| LCP | `< 5,000 ms` |
| CLS | `< 0.25` |

Các route cần ưu tiên:

- Landing `/`
- Login `/login`
- Dashboard `/dashboard`
- Symptom `/symptom`
- Map `/map`
- Payment result
- Admin workspace
- Staff/Doctor workspace

## 3. Quy trình tối ưu

```text
Measure
  -> Identify bottleneck
  -> Choose strategy
  -> Implement small change
  -> Re-measure
  -> Add guard
```

## 4. Nguồn gây chậm phổ biến

| Nguồn | Dấu hiệu | Hướng xử lý |
| --- | --- | --- |
| Bundle lớn | Build warning, initial load chậm | Lazy-load route nặng |
| Map library | MapLibre chunk lớn | Import ở route `/map` בלבד |
| Admin workspace | nhiều section import eager | Split section/lazy route |
| Mock/demo data | bundle phình, data không thật | Xóa hoặc lazy import demo |
| Re-render | input lag, table chậm | memoize đúng chỗ, tách state |
| Network | loading lâu | cache/refetch strategy, data state |
| Images/assets | LCP chậm | size, lazy load, dimensions |
| Layout shift | CLS cao | reserve space, stable skeleton |

## 5. Bundle checklist

- [ ] Route nặng dùng `React.lazy`.
- [ ] Map chỉ load ở route cần map.
- [ ] Admin section không kéo toàn bộ form/table nếu không cần.
- [ ] Không import mock data lớn vào landing.
- [ ] Không import icon package toàn bộ nếu chỉ dùng vài icon.
- [ ] Không thêm UI framework lớn.
- [ ] Không duplicate dependency.
- [ ] Build warning được ghi vào backlog nếu chưa xử lý.

## 6. Render checklist

- [ ] State đặt ở scope nhỏ nhất.
- [ ] List lớn không render lại toàn bộ khi nhập filter nếu có thể tránh.
- [ ] Derived data dùng memo nếu tính toán đáng kể.
- [ ] Effect không gây loop.
- [ ] Polling có cleanup.
- [ ] Event listener có cleanup.
- [ ] Debounce không làm hỏng accessibility.
- [ ] Dialog/table/form không render section ẩn quá nặng.

## 7. Network checklist

- [ ] Không gọi API trùng khi mount.
- [ ] Không refetch toàn bộ admin data sau mutation nhỏ nếu có cách hẹp hơn.
- [ ] Error retry có kiểm soát.
- [ ] Không polling payment cancel nếu đã hủy.
- [ ] Không gọi list lớn để suy đoán current user.
- [ ] Search/filter có debounce hợp lý nếu backend call.
- [ ] Empty/error state không gọi lại vô hạn.

## 8. Visual stability checklist

- [ ] Skeleton giữ chiều cao gần đúng.
- [ ] Image/media có width/height hoặc container stable.
- [ ] Font load không làm shift lớn.
- [ ] Alert/toast không đẩy layout bất ngờ nếu không cần.
- [ ] Map container có chiều cao cố định/hợp lý.
- [ ] Admin table không thay width liên tục khi loading.

## 9. Route-specific strategies

### Landing

- Loại data giả/hard-code lớn khỏi bundle nếu không cần.
- Tối ưu hero LCP.
- Lazy-load section dưới fold nếu nặng.
- Không import map trực tiếp vào landing.

### Map

- Lazy-load MapLibre.
- Có loading/fallback.
- Chỉ render marker hợp lệ.
- Không tính toán distance phức tạp trên mỗi render nếu data lớn.
- List text fallback không phụ thuộc WebGL.

### Admin

- Tách section theo route/active tab nếu cần.
- Table responsive không tạo DOM quá nặng.
- Filter/search state tối giản.
- Modal/form chỉ mount khi dùng nếu nặng.

### Symptom/AI

- Không render toàn bộ history nếu không cần.
- Giữ draft local nhưng không log.
- Timeout/retry rõ, không loop.

## 10. Verification

Chạy:

```bash
npm run build
npm run test:e2e:performance
```

Nếu UI/layout đổi:

```bash
npm run test:e2e:a11y
npm run test:e2e:visual
```

## 11. Performance PR template

```md
## Performance issue

- Route:
- Baseline metric:
- Evidence:

## Change

...

## Result

- Before:
- After:

## Risk

- A11Y:
- UX:
- Browser:
- Bundle:

## Verification

- [ ] npm run build
- [ ] npm run test:e2e:performance
- [ ] npm run test:e2e:a11y
- [ ] npm run test:e2e:visual
```

## 12. Không được làm

- Xóa loading/error để nhanh hơn.
- Lazy-load thứ cần hiện ngay trên first paint nếu làm UX tệ hơn.
- Memoize mọi thứ không có bằng chứng.
- Virtualize list nhỏ.
- Tắt test vì chậm.
- Giảm accessibility để tăng điểm synthetic.
