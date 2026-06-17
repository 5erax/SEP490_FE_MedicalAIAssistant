# Mock/Demo Inventory

Ngày kiểm tra: 2026-06-17

Inventory này theo dõi mock/demo có thể ảnh hưởng tới dữ liệu y tế, thuốc, cơ sở y tế hoặc trải nghiệm production. Mock mới trong các vùng này phải được thêm vào bảng trước khi merge.

## Production-Sensitive Items

| File | Route/surface | Loại mock/demo | Owner | Production policy | UI label/status |
| --- | --- | --- | --- | --- | --- |
| `src/pages/MedicalRecordPage.jsx` | `/records` | Hồ sơ y tế, chỉ số xét nghiệm và phân tích AI minh họa | Frontend team | Được hiển thị production chỉ khi có banner demo rõ; không lưu và không coi là hồ sơ thật | Có `backend-support-note` ở đầu page và disclaimer trong tab AI |
| `src/pages/MedicationScanPage.jsx` | `/medication` | Kết quả nhận diện thuốc và tương tác thuốc minh họa | Frontend team | Được hiển thị production chỉ khi có banner demo rõ; không dùng làm tư vấn thuốc thật | Có `backend-support-note` ở đầu page và `med-disclaimer` sau kết quả |
| `src/components/landing/SymptomDemoSection.jsx` | Landing `/#demo` | Preview phân tích triệu chứng để giới thiệu sản phẩm | Product + Frontend team | Chỉ là demo marketing; không được trình bày như chẩn đoán hoặc kết quả y khoa chắc chắn | Section dùng nhãn `Demo`/`Preview miễn phí` và safety note cạnh CTA |
| `src/pages/PatientWorkspacePage.jsx` | Patient workspace map card | Danh sách cơ sở y tế fallback với tọa độ/khoảng cách minh họa | Frontend team | Không trình bày như live nearby data; phải có note rõ khi backend map chưa cấp dữ liệu cá nhân hóa | Có `api-message warning` trong map card và label “khoảng cách minh họa” |
| `src/services/hospitalRecommendations.js` | Legacy assistant/map recommendation helper | Danh sách cơ sở y tế mock chờ backend map/facility endpoint | Frontend team | Không dùng như dữ liệu live; thay bằng backend facility/map API khi contract sẵn sàng | Service có TODO, hiện route map chính đang đọc backend active facilities |

## Regression Guards

- `tests/e2e/landing-production.spec.js` kiểm tra landing map không dùng dữ liệu cơ sở y tế giả, `/#demo` có safety note và `/records`/`/medication` có nhãn demo khi mở bằng premium auth giả lập.
- `tests/e2e/routes.spec.js` kiểm tra route guard cho patient, premium patient, staff và admin để tránh bypass route role/premium trong route smoke chính.

## Review Rules

- Không thêm mock y tế mới mà không có owner và production policy.
- Mock production-sensitive phải có banner hoặc copy demo rõ ngay trong UI.
- Không dùng mock làm fallback im lặng sau lỗi backend nếu người dùng có thể hiểu nhầm là dữ liệu thật.
- Không log nội dung triệu chứng, hồ sơ y tế, thuốc, token hoặc payload API chứa dữ liệu người dùng.

## Scanner

```powershell
rg -n "MOCK_|mock|demo|TODO|fake|sample|placeholder" src --glob "*.js" --glob "*.jsx"
```
