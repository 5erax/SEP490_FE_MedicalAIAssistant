function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function getChapterId(chapter) {
  return chapter.id ?? chapter.icdChapterId ?? "";
}

function getChapterCode(chapter) {
  return chapter.chapterCode ?? chapter.code ?? chapter.icdCode ?? "";
}

function getChapterName(chapter) {
  return chapter.chapterName ?? chapter.name ?? chapter.title ?? "";
}

export default function AdminICDChaptersSection({
  chapters,
  editingChapterId,
  form,
  loading,
  message,
  saving,
  onDelete,
  onEdit,
  onFormChange,
  onReload,
  onReset,
  onSubmit,
  onView,
}) {
  return (
    <section className="admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">ICD Chapter</p>
            <h2>Danh mục ICD Chapter</h2>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
        </div>
        {message && <div className={`api-message ${message.type}`}>{message.text}</div>}
        {loading ? (
          <p className="muted-text">Đang tải ICD Chapter...</p>
        ) : (
          <div className="admin-table-list">
            {chapters.length === 0 && <p className="muted-text">Chưa có ICD Chapter.</p>}
            {chapters.map((chapter) => {
              const id = getChapterId(chapter);
              return (
                <article className="admin-user-row" key={id || getChapterCode(chapter)}>
                  <div>
                    <strong>{getChapterCode(chapter) || "Chưa có mã"}</strong>
                    <span>{getChapterName(chapter) || "Chưa đặt tên"}</span>
                    <small>{Object.keys(chapter.keywordWeights ?? {}).length} từ khóa · {id}</small>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => onView(chapter)}>Chi tiết</button>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(chapter)}>Sửa</button>
                    <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(chapter)}>Xóa</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <form className="admin-panel clean-form" onSubmit={onSubmit}>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">{editingChapterId ? "Update" : "Create"}</p>
            <h2>{editingChapterId ? "Cập nhật ICD Chapter" : "Tạo ICD Chapter"}</h2>
          </div>
          {editingChapterId && <button className="btn btn-ghost btn-small" type="button" onClick={onReset}>Hủy sửa</button>}
        </div>
        <Field label="Mã Chapter">
          <input
            value={form.chapterCode}
            onChange={(event) => onFormChange("chapterCode", event.target.value)}
            placeholder="Ví dụ: I"
            required
          />
        </Field>
        <Field label="Tên Chapter">
          <input
            value={form.chapterName}
            onChange={(event) => onFormChange("chapterName", event.target.value)}
            placeholder="Ví dụ: Certain infectious and parasitic diseases"
            required
          />
        </Field>
        <Field label="Trọng số từ khóa (JSON)">
          <textarea
            rows={10}
            value={form.keywordWeights}
            onChange={(event) => onFormChange("keywordWeights", event.target.value)}
            placeholder={'{"sốt": 5, "ho": 3}'}
            spellCheck="false"
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : editingChapterId ? "Lưu cập nhật" : "Tạo ICD Chapter"}
        </button>
      </form>
    </section>
  );
}
