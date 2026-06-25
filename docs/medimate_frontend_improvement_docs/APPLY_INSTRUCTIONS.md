# Cách áp dụng bộ docs Improvement / Bug Fix vào repo MediMate frontend

Bộ này bổ sung nhóm tài liệu mới tại:

```text
docs/improvement/
```

Mục tiêu: dùng khi team muốn nâng cấp web, cải tiến UI/UX, bắt lỗi đang tồn tại, sửa bug production và quản lý technical debt.

## 1. Tạo branch riêng

```bash
git checkout main
git pull origin main
git checkout -b docs/frontend-improvement-playbooks
```

## 2. Copy file vào repo

Copy toàn bộ thư mục `docs/improvement` từ gói này vào repo.

PowerShell:

```powershell
Copy-Item -Path .\docs -Destination . -Recurse -Force
```

Bash:

```bash
cp -r docs .
```

## 3. Kiểm tra link Markdown

```bash
git diff -- docs/improvement
```

## 4. Commit

```bash
git add docs/improvement
git commit -m "docs: add frontend improvement and bug fix playbooks"
git push -u origin docs/frontend-improvement-playbooks
```

## 5. Cách dùng sau khi merge

- Khi muốn nâng cấp web: bắt đầu từ `docs/improvement/upgrade-improvement-playbook.md`.
- Khi muốn audit lỗi toàn hệ thống: dùng `docs/improvement/quality-audit-matrix.md`.
- Khi gặp bug: dùng `docs/improvement/bug-hunting-playbook.md` và `production-bug-fix-workflow.md`.
- Khi tối ưu hiệu năng: dùng `performance-optimization-playbook.md`.
- Khi xử lý nợ kỹ thuật: dùng `technical-debt-register.md`.
- Khi cần đề xuất thêm docs/team process: dùng `recommended-docs-roadmap.md`.
