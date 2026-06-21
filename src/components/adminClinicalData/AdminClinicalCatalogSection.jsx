import { useEffect, useMemo, useState } from "react";

function unwrapItems(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getChapterCode(item, chapterById) {
  return item.chapterCode || chapterById.get(item.chapterId)?.chapterCode || "";
}

export default function AdminClinicalCatalogSection({ config, icdChapters = [], service }) {
  const emptyForm = Object.fromEntries(config.fields.map((field) => [field.name, ""]));
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [selectedIcdCode, setSelectedIcdCode] = useState("");

  const chapterById = useMemo(() => {
    return new Map(icdChapters.map((chapter) => [chapter.id, chapter]));
  }, [icdChapters]);

  const icdOptions = useMemo(() => {
    const options = new Map();
    icdChapters.forEach((chapter) => {
      if (chapter.chapterCode) options.set(chapter.chapterCode, chapter.chapterName || chapter.chapterCode);
    });
    items.forEach((item) => {
      const code = getChapterCode(item, chapterById);
      if (code && !options.has(code)) options.set(code, code);
    });
    return Array.from(options.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((left, right) => left.code.localeCompare(right.code, "vi"));
  }, [chapterById, icdChapters, items]);

  const filteredItems = useMemo(() => {
    if (!selectedIcdCode) return items;
    return items.filter((item) => getChapterCode(item, chapterById) === selectedIcdCode);
  }, [chapterById, items, selectedIcdCode]);

  async function loadItems() {
    setStatus("loading");
    setMessage("");
    try {
      setItems(unwrapItems(await service.list()));
      setStatus("ready");
    } catch {
      setMessage(`Không thể tải ${config.pluralLabel}. Vui lòng thử lại.`);
      setStatus("error");
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(loadItems, 0);
    return () => window.clearTimeout(handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const payload = Object.fromEntries(config.fields.map((field) => [
        field.name,
        field.serialize ? field.serialize(form[field.name]) : form[field.name],
      ]));
      if (editingId) await service.update(editingId, payload);
      else await service.create(payload);
      setMessage(editingId ? `Đã cập nhật ${config.singularLabel}.` : `Đã tạo ${config.singularLabel}.`);
      resetForm();
      await loadItems();
    } catch (error) {
      setMessage(error.message || `Không thể lưu ${config.singularLabel}.`);
      setStatus("ready");
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm(Object.fromEntries(config.fields.map((field) => [field.name, item[field.name] ?? ""])));
  }

  async function remove(item) {
    if (!window.confirm(`Xóa ${config.singularLabel} này?`)) return;
    try {
      await service.remove(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage(`Đã xóa ${config.singularLabel}.`);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setMessage(error.message || `Không thể xóa ${config.singularLabel}.`);
    }
  }

  return (
    <section className="admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div><p className="eyebrow">Dữ liệu lâm sàng</p><h2>{config.title}</h2></div>
          <button className="btn btn-ghost btn-small" type="button" onClick={loadItems}>Tải lại</button>
        </div>
        {message && <div className="api-message" role="status">{message}</div>}
        <div className="admin-toolbar">
          <label className="clean-field">
            <span>ICD Code</span>
            <select value={selectedIcdCode} onChange={(event) => setSelectedIcdCode(event.target.value)}>
              <option value="">Tất cả ICD</option>
              {icdOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} - {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {status === "loading" ? <p className="muted-text">Đang tải...</p> : (
          <div className="admin-table-list">
            {filteredItems.length === 0 && <p className="muted-text">Chưa có {config.pluralLabel}.</p>}
            {filteredItems.map((item) => {
              const chapterCode = getChapterCode(item, chapterById);
              const createdAt = formatDateTime(item.createdAt);
              return (
                <article className="admin-user-row" key={item.id}>
                  <div>
                    <div className="admin-badge-stack">
                      <span>{chapterCode || "Chưa có ICD"}</span>
                      {createdAt && <small>Created At: {createdAt}</small>}
                    </div>
                    <strong>{item[config.primaryField] || "Chưa có nội dung"}</strong>
                    <span>{item[config.secondaryField] || "Chưa có mô tả."}</span>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => edit(item)}>Sửa</button>
                    <button className="btn btn-dark btn-small" type="button" onClick={() => remove(item)}>Xóa</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <form className="admin-panel clean-form" onSubmit={submit}>
        <div className="panel-title-row"><div><p className="eyebrow">{editingId ? "Cập nhật" : "Tạo mới"}</p><h2>{config.formTitle}</h2></div>{editingId && <button className="btn btn-ghost btn-small" type="button" onClick={resetForm}>Hủy sửa</button>}</div>
        {config.fields.map((field) => (
          <label className="clean-field" key={field.name}>
            <span>{field.label}</span>
            {field.multiline ? <textarea rows={4} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} /> : <input type={field.type || "text"} min={field.min} step={field.step} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} />}
          </label>
        ))}
        <button className="btn btn-primary" type="submit" disabled={status === "saving"}>{status === "saving" ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo mới"}</button>
      </form>
    </section>
  );
}
