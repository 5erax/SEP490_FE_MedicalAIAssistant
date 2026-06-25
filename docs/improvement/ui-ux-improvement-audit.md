# UI/UX improvement audit

Ngày cập nhật: **2026-06-26**.

Tài liệu này dùng khi muốn nâng cấp giao diện, trải nghiệm, độ chuyên nghiệp và tính nhất quán của web.

## 1. Nguyên tắc

UI/UX improvement phải:

- Giúp user hoàn thành task nhanh và an toàn hơn.
- Không mở rộng product scope trái phép.
- Không che lỗi backend.
- Không thay accessibility bằng animation/visual polish.
- Có before/after evidence.
- Có acceptance criteria rõ.

## 2. Audit theo màn hình

Với mỗi màn hình, ghi:

```md
## Screen audit

- Route:
- Actor:
- Primary task:
- Secondary task:
- Main CTA:
- Risk:
- Current blockers:
- Proposed improvements:
```

## 3. Information architecture

- [ ] User hiểu đây là màn hình gì trong 5 giây.
- [ ] CTA chính rõ.
- [ ] CTA phụ không cạnh tranh CTA chính.
- [ ] Navigation active đúng.
- [ ] Breadcrumb/section title nếu cần.
- [ ] Empty state hướng dẫn bước tiếp theo.
- [ ] Error state hướng dẫn cách phục hồi.
- [ ] Copy không dùng thuật ngữ nội bộ quá mức.

## 4. Visual hierarchy

- [ ] Heading chính rõ.
- [ ] Section grouping hợp lý.
- [ ] Spacing nhất quán.
- [ ] Card/table/list có hierarchy.
- [ ] Button variants dùng nhất quán.
- [ ] Status badge dễ hiểu.
- [ ] Destructive action không giống primary action.
- [ ] Critical notice đủ nổi bật.

## 5. Content quality

- [ ] Tiếng Việt tự nhiên, không lẫn encoding lỗi.
- [ ] Không lẫn tiếng Anh không cần thiết.
- [ ] Error message có hướng xử lý.
- [ ] Loading copy ngắn và rõ.
- [ ] Medical copy không khẳng định chẩn đoán.
- [ ] Admin copy rõ hậu quả thao tác.
- [ ] Payment copy không gây hiểu sai trạng thái.
- [ ] Label form không mơ hồ.

## 6. Responsive quality

Viewport bắt buộc:

- 320
- 375
- 390
- 768
- 1024
- 1440

Kiểm tra:

- [ ] Header không tràn.
- [ ] Sidebar/drawer hợp lý.
- [ ] Table chuyển strategy ở mobile.
- [ ] Form không quá hẹp.
- [ ] Dialog không vượt viewport.
- [ ] Touch target đủ lớn.
- [ ] Map/list parity.
- [ ] Action menu không bị khuất.

## 7. Form UX

- [ ] Field order đúng logic.
- [ ] Required/optional rõ.
- [ ] Input format có hint.
- [ ] Validation realtime không gây phiền.
- [ ] Submit error không làm mất dữ liệu.
- [ ] Success state rõ.
- [ ] Dirty state nếu rời trang có nguy cơ mất dữ liệu.
- [ ] Focus đến lỗi đầu tiên.

## 8. Data surface UX

- [ ] Loading state không làm user tưởng crash.
- [ ] Empty state có CTA/recovery.
- [ ] Error state có retry/contact/support nếu phù hợp.
- [ ] Partial data state rõ.
- [ ] Pagination/filter/search dễ hiểu.
- [ ] Sort/filter state giữ sau refresh nếu cần.
- [ ] Table có caption hoặc context.
- [ ] Mobile card vẫn có đủ thông tin quan trọng.

## 9. Operator/Admin UX

- [ ] Bulk action không nguy hiểm.
- [ ] Delete/status change có confirm.
- [ ] List/filter/search phù hợp dữ liệu lớn.
- [ ] Form create/edit không quá dài một khối.
- [ ] Backend validation hiển thị tại field liên quan.
- [ ] Permission denied không blank.
- [ ] Admin không thấy data giả như production.
- [ ] Audit trail hoặc trạng thái cập nhật nếu product yêu cầu.

## 10. Patient/Medical UX

- [ ] Cảnh báo y tế rõ.
- [ ] Kết quả AI là định hướng, không chẩn đoán.
- [ ] Gợi ý chuyên khoa/cơ sở có nguồn hoặc giải thích hợp lý.
- [ ] Khi không đủ dữ liệu, UI nói rõ.
- [ ] Không tạo cảm giác đã đặt lịch nếu chưa có booking.
- [ ] Không gợi ý dùng thuốc nếu không có clinical source.
- [ ] Emergency path luôn dễ thấy.

## 11. UI improvement scoring

Chấm 1-5:

| Điểm | Ý nghĩa |
| --- | --- |
| 1 | Không dùng được hoặc gây hiểu nhầm |
| 2 | Dùng được nhưng nhiều lỗi |
| 3 | Đạt cơ bản |
| 4 | Tốt, nhất quán |
| 5 | Production-grade, polish tốt, accessible |

Nhóm chấm:

- Clarity.
- Consistency.
- Responsiveness.
- Accessibility.
- Error recovery.
- Task completion.
- Trust/safety.
- Visual polish.

## 12. Before/after template

```md
# UI/UX improvement evidence

## Before

- Screenshot:
- Problem:
- User impact:

## After

- Screenshot:
- Change:
- Why better:

## Verification

- Viewports:
- Keyboard:
- A11Y:
- Visual:
```

## 13. Không được làm

- Đổi toàn bộ theme khi task chỉ sửa một flow.
- Thêm animation che loading/error.
- Dùng placeholder như data thật.
- Giảm contrast để “đẹp hơn”.
- Xóa label để giao diện gọn.
- Che admin action quan trọng sau hover-only.
- Hiển thị chart/metric không có source.
