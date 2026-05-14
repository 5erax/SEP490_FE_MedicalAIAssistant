import { useEffect, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { getStoredAuth, medicalDepartmentsApi } from "../services/api";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

const EMPTY_FORM = { departmentName: "", description: "" };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const auth = getStoredAuth();

  async function loadDepartments() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await medicalDepartmentsApi.list();
      setDepartments(response.data ?? []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    medicalDepartmentsApi.list()
      .then((response) => {
        if (active) setDepartments(response.data ?? []);
      })
      .catch((error) => {
        if (active) setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function startEdit(department) {
    setEditingId(department.id);
    setForm({
      departmentName: department.departmentName ?? "",
      description: department.description ?? "",
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = editingId
        ? await medicalDepartmentsApi.update(editingId, form)
        : await medicalDepartmentsApi.create(form);
      setMessage({
        type: "success",
        text: response.message || (editingId ? "Đã cập nhật chuyên khoa." : "Đã tạo chuyên khoa."),
      });
      resetForm();
      await loadDepartments();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      setMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      await loadDepartments();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="api-page">
        <div className="container">
          <div className="api-heading">
            <p className="eyebrow">Medical Departments</p>
            <h1>Danh mục chuyên khoa từ backend.</h1>
            <p>Danh sách public dùng GET /api/medical-departments. Tạo, sửa, xóa dùng JWT nếu backend yêu cầu quyền.</p>
          </div>

          <div className="api-grid">
            <section className="api-panel">
              <div className="panel-title-row">
                <h2>Danh sách chuyên khoa</h2>
                <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
              </div>
              <ApiMessage message={message} />
              {loading ? (
                <p className="muted-text">Đang tải dữ liệu...</p>
              ) : (
                <div className="record-list">
                  {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa nào.</p>}
                  {departments.map((department) => (
                    <article className="record-card" key={department.id}>
                      <div>
                        <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                        <p>{department.description || "Chưa có mô tả."}</p>
                        <small>{department.id}</small>
                      </div>
                      <div className="record-actions">
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => startEdit(department)}>
                          Sửa
                        </button>
                        <button className="btn btn-dark btn-small" type="button" onClick={() => handleDelete(department.id)}>
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <form className="api-panel api-form" onSubmit={handleSubmit}>
              <h2>{editingId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
              {!auth && (
                <div className="api-message warning">
                  Bạn chưa đăng nhập. Backend có thể từ chối các thao tác ghi.
                </div>
              )}
              <label>
                Tên chuyên khoa
                <input
                  value={form.departmentName}
                  onChange={(event) => setForm({ ...form, departmentName: event.target.value })}
                  placeholder="Ví dụ: Tim mạch"
                  required
                />
              </label>
              <label>
                Mô tả
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Mô tả ngắn về chuyên khoa"
                />
              </label>
              <div className="hero-actions compact-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo mới"}
                </button>
                {editingId && (
                  <button className="btn btn-ghost" type="button" onClick={resetForm}>
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
