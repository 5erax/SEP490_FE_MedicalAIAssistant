# Cách áp dụng bộ docs cập nhật vào repo MediMate frontend

GitHub connector không tạo được branch mới do lỗi quyền `403 Resource not accessible by integration`, nên bộ docs này được đóng gói để bạn áp dụng thủ công.

## 1. Tạo branch riêng

```bash
git checkout main
git pull origin main
git checkout -b 5era/update-frontend-production-docs
```

## 2. Copy file

Copy toàn bộ nội dung thư mục trong gói này vào root repo:

```bash
# Ví dụ nếu đã giải nén vào medimate_frontend_docs_update/
cp -r medimate_frontend_docs_update/* .
```

Trên PowerShell:

```powershell
Copy-Item -Path .\medimate_frontend_docs_update\* -Destination . -Recurse -Force
```

## 3. Kiểm tra diff

```bash
git diff -- docs README.md
```

## 4. Kiểm tra tối thiểu trước commit

```bash
npm run lint
npm run build
npm run test:e2e:routes
npm run test:e2e:a11y
```

Nếu thay đổi UI/snapshot hoặc muốn khóa regression rộng hơn:

```bash
npm run test:e2e:performance
npm run test:e2e:visual
```

## 5. Commit và tạo PR

```bash
git add README.md docs
git commit -m "docs: update frontend production standards"
git push -u origin 5era/update-frontend-production-docs
```

Sau đó mở Pull Request vào `main`.

## File trong gói

- `README.md`
- `docs/README.md`
- `docs/frontend-architecture/README.md`
- `docs/frontend-architecture/production-frontend-standards.md`
- `docs/frontend-architecture/developer-workflow.md`
- `docs/frontend-architecture/refactor-cleanup-guide.md`
- `docs/frontend-architecture/api-layer.md`
- `docs/quality/testing-baseline.md`

## Nguyên tắc áp dụng

Đây là docs chuẩn hóa cho repo hiện tại, không phải thay đổi source code. Các tiêu chí trong docs phải được dùng làm điều kiện review PR frontend sau khi merge.
