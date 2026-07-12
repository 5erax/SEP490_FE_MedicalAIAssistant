import { useEffect, useMemo, useRef, useState } from "react";
import { FileHeart, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { DataTable, Dialog, EmptyState, ErrorState, LoadingState } from "../ui";
import { patientProfilesApi, usersApi } from "../../services/api";

const PAGE_SIZE = 10;
const EMPTY_FORM = { userId: "", bloodType: "", height: "", weight: "", allergyNote: "", chronicDiseases: [] };
const EMPTY_DISEASE = { id: "", diseaseName: "", from: "", to: "", note: "" };
const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function getItems(response) {
  return response?.data?.items ?? [];
}

function getUserLabel(user) {
  return user?.displayName || user?.name || user?.email || user?.userId || user?.id || "Người dùng chưa có tên";
}

function toForm(profile) {
  return {
    userId: profile?.userId || "",
    bloodType: profile?.bloodType || "",
    height: profile?.height ?? "",
    weight: profile?.weight ?? "",
    allergyNote: profile?.allergyNote || "",
    chronicDiseases: (profile?.chronicDiseases || []).map((item) => ({
      id: item.id || "",
      diseaseName: item.diseaseName || "",
      from: item.from ? String(item.from).slice(0, 10) : "",
      to: item.to ? String(item.to).slice(0, 10) : "",
      note: item.note || "",
    })),
  };
}

function validate(form, editing) {
  const errors = {};
  if (!editing && !form.userId) errors.userId = "Chọn người dùng cần tạo hồ sơ.";
  const height = form.height === "" ? null : Number(form.height);
  const weight = form.weight === "" ? null : Number(form.weight);
  if (height !== null && (!Number.isFinite(height) || height < 40 || height > 250)) errors.height = "Chiều cao phải từ 40 đến 250 cm.";
  if (weight !== null && (!Number.isFinite(weight) || weight < 2 || weight > 500)) errors.weight = "Cân nặng phải từ 2 đến 500 kg.";
  form.chronicDiseases.forEach((item, index) => {
    if (!item.diseaseName.trim()) errors[`disease-${index}`] = "Nhập tên bệnh hoặc xóa dòng này.";
    if (item.from && item.to && item.from > item.to) errors[`disease-date-${index}`] = "Ngày kết thúc phải sau ngày bắt đầu.";
  });
  return errors;
}

function serialize(form, editing) {
  const values = {
    bloodType: form.bloodType || null,
    height: form.height === "" ? null : Number(form.height),
    weight: form.weight === "" ? null : Number(form.weight),
    allergyNote: form.allergyNote.trim() || null,
    chronicDiseases: form.chronicDiseases.map((item) => ({
      ...(editing && item.id ? { id: item.id } : {}),
      diseaseName: item.diseaseName.trim() || null,
      from: item.from || null,
      to: item.to || null,
      note: item.note.trim() || null,
    })),
  };
  return editing ? values : { userId: form.userId, ...values };
}

export default function AdminPatientProfilesSection({ confirmAction, showToast }) {
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, profile: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const createButtonRef = useRef(null);
  const firstFieldRef = useRef(null);

  const userById = useMemo(() => new Map(users.map((user) => [String(user.userId || user.id), user])), [users]);
  const existingUserIds = useMemo(() => new Set(profiles.map((profile) => String(profile.userId))), [profiles]);
  const availableUsers = users.filter((user) => !existingUserIds.has(String(user.userId || user.id)));
  const visibleProfiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return profiles;
    return profiles.filter((profile) => {
      const user = userById.get(String(profile.userId));
      return [profile.id, profile.userId, profile.bloodType, getUserLabel(user), user?.email]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [profiles, search, userById]);

  async function load(pageNumber = pageInfo.pageNumber) {
    setLoading(true);
    setError("");
    try {
      const [profileResponse, userResponse] = await Promise.all([
        patientProfilesApi.list(pageNumber, PAGE_SIZE),
        usersApi.list(1, 100),
      ]);
      const data = profileResponse.data ?? {};
      setProfiles(data.items ?? []);
      setUsers(getItems(userResponse));
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? data.items?.length ?? 0,
        totalPages: Math.max(1, data.totalPages ?? 1),
      });
    } catch {
      setError("Không thể tải hồ sơ bệnh nhân. Kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([patientProfilesApi.list(1, PAGE_SIZE), usersApi.list(1, 100)])
      .then(([profileResponse, userResponse]) => {
        if (!active) return;
        const data = profileResponse.data ?? {};
        setProfiles(data.items ?? []);
        setUsers(getItems(userResponse));
        setPageInfo({
          pageNumber: data.pageNumber ?? 1,
          pageSize: data.pageSize ?? PAGE_SIZE,
          totalCount: data.totalCount ?? data.items?.length ?? 0,
          totalPages: Math.max(1, data.totalPages ?? 1),
        });
      })
      .catch(() => {
        if (active) setError("Không thể tải hồ sơ bệnh nhân. Kiểm tra kết nối và thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setDialog({ open: true, profile: null });
  }

  function openEdit(profile) {
    setForm(toForm(profile));
    setErrors({});
    setDialog({ open: true, profile });
  }

  function closeDialog() {
    if (saving) return;
    setDialog({ open: false, profile: null });
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function updateDisease(index, key, value) {
    setForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
    setErrors((current) => ({ ...current, [`disease-${index}`]: "", [`disease-date-${index}`]: "" }));
  }

  async function save(event) {
    event.preventDefault();
    const editing = Boolean(dialog.profile?.id);
    const nextErrors = validate(form, editing);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => document.querySelector('.patient-profile-dialog [aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      const payload = serialize(form, editing);
      const response = editing
        ? await patientProfilesApi.update(dialog.profile.id, payload)
        : await patientProfilesApi.create(payload);
      showToast({ type: "success", title: editing ? "Đã cập nhật hồ sơ" : "Đã tạo hồ sơ", message: response.message || "Dữ liệu hồ sơ bệnh nhân đã được đồng bộ." });
      setDialog({ open: false, profile: null });
      await load(editing ? pageInfo.pageNumber : 1);
    } catch (saveError) {
      showToast({ type: "error", title: "Không thể lưu hồ sơ", message: saveError.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(profile) {
    const accepted = await confirmAction({
      title: "Xóa hồ sơ bệnh nhân?",
      message: "Hành động này xóa hồ sơ sức khỏe khỏi danh sách quản trị. Dữ liệu tài khoản người dùng không bị xóa.",
      confirmLabel: "Xóa hồ sơ",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await patientProfilesApi.remove(profile.id);
      showToast({ type: "success", title: "Đã xóa hồ sơ", message: "Danh sách hồ sơ bệnh nhân đã được cập nhật." });
      await load(pageInfo.pageNumber);
    } catch (removeError) {
      showToast({ type: "error", title: "Không thể xóa hồ sơ", message: removeError.message });
    }
  }

  const columns = [
    { key: "patient", header: "Bệnh nhân", render: (profile) => { const user = userById.get(String(profile.userId)); return <div className="patient-profile-person"><strong>{getUserLabel(user)}</strong><small>{user?.email || profile.userId}</small></div>; } },
    { key: "metrics", header: "Chỉ số", render: (profile) => <div className="patient-profile-metrics"><span>{profile.bloodType || "Chưa rõ nhóm máu"}</span><small>{profile.height ? `${profile.height} cm` : "-- cm"} · {profile.weight ? `${profile.weight} kg` : "-- kg"}</small></div> },
    { key: "conditions", header: "Bệnh nền", render: (profile) => <span>{profile.chronicDiseases?.length || 0} mục</span> },
    { key: "status", header: "Trạng thái", render: (profile) => <span className={`patient-profile-status ${profile.isProfileCompleted ? "complete" : "incomplete"}`}>{profile.isProfileCompleted ? "Đã hoàn thiện" : "Chưa hoàn thiện"}</span> },
    { key: "updated", header: "Cập nhật", render: (profile) => <span>{new Date(profile.updatedAt || profile.createdAt).toLocaleDateString("vi-VN")}</span> },
    { key: "actions", header: "Thao tác", render: (profile) => <div className="record-actions"><button className="btn btn-ghost btn-small" type="button" onClick={() => openEdit(profile)}><Pencil size={14} /> Sửa</button><button className="btn btn-dark btn-small" type="button" onClick={() => remove(profile)}><Trash2 size={14} /> Xóa</button></div> },
  ];

  return (
    <section className="admin-panel patient-profile-admin-panel">
      <div className="panel-title-row patient-profile-heading">
        <div><p className="eyebrow">Dữ liệu sức khỏe nhạy cảm</p><h2>Hồ sơ bệnh nhân</h2><p className="muted-text">Quản lý thông tin sức khỏe nền theo đúng dữ liệu PatientProfile từ backend.</p></div>
        <div className="record-actions"><button className="btn btn-ghost btn-small" type="button" onClick={() => load(pageInfo.pageNumber)}><RefreshCw size={15} /> Đồng bộ</button><button ref={createButtonRef} className="btn btn-primary btn-small" type="button" onClick={openCreate}><Plus size={15} /> Tạo hồ sơ</button></div>
      </div>

      <div className="patient-profile-toolbar"><label><Search size={16} aria-hidden="true" /><span className="sr-only">Tìm hồ sơ bệnh nhân</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email, mã người dùng..." /></label><span>{pageInfo.totalCount} hồ sơ</span></div>

      {loading ? <LoadingState label="Đang tải hồ sơ bệnh nhân..." /> : error ? <ErrorState title="Không thể tải hồ sơ bệnh nhân" description={error} action={<button className="btn btn-primary" type="button" onClick={() => load(pageInfo.pageNumber)}>Thử lại</button>} /> : visibleProfiles.length ? <><DataTable caption="Danh sách hồ sơ bệnh nhân" className="patient-profile-table" columns={columns} rows={visibleProfiles} rowHeaderKey="patient" getRowKey={(profile) => profile.id} /><div className="patient-profile-pagination"><button type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => load(pageInfo.pageNumber - 1)}>Trước</button><span>Trang {pageInfo.pageNumber}/{pageInfo.totalPages}</span><button type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => load(pageInfo.pageNumber + 1)}>Sau</button></div></> : <EmptyState icon={<FileHeart size={24} />} title="Chưa có hồ sơ bệnh nhân" description={search ? "Không có hồ sơ phù hợp từ khóa." : "Tạo hồ sơ đầu tiên cho một tài khoản bệnh nhân."} action={!search && <button className="btn btn-primary" type="button" onClick={openCreate}>Tạo hồ sơ</button>} />}

      {dialog.open && <Dialog backdropClassName="modal-backdrop" className="modal-card patient-profile-dialog" labelledBy="patient-profile-dialog-title" describedBy="patient-profile-dialog-description" onClose={closeDialog} initialFocusRef={firstFieldRef} restoreFocusRef={createButtonRef}>
        <form onSubmit={save} noValidate>
          <header className="patient-profile-dialog-head"><div><p className="eyebrow">{dialog.profile ? "Chỉnh sửa" : "Tạo mới"}</p><h2 id="patient-profile-dialog-title">{dialog.profile ? "Cập nhật hồ sơ bệnh nhân" : "Tạo hồ sơ bệnh nhân"}</h2><p id="patient-profile-dialog-description">Chỉ nhập dữ liệu sức khỏe đã được xác minh.</p></div><button type="button" aria-label="Đóng hộp thoại" onClick={closeDialog}><X size={19} /></button></header>
          <div className="patient-profile-form-grid">
            <label className="clean-field wide"><span>Người dùng</span><select ref={firstFieldRef} value={form.userId} disabled={Boolean(dialog.profile)} aria-invalid={Boolean(errors.userId)} onChange={(event) => updateField("userId", event.target.value)}><option value="">Chọn tài khoản</option>{(dialog.profile ? users : availableUsers).map((user) => { const id = user.userId || user.id; return <option key={id} value={id}>{getUserLabel(user)}{user.email ? ` · ${user.email}` : ""}</option>; })}</select>{errors.userId && <small role="alert">{errors.userId}</small>}</label>
            <label className="clean-field"><span>Nhóm máu</span><select value={form.bloodType} onChange={(event) => updateField("bloodType", event.target.value)}>{BLOOD_TYPES.map((type) => <option key={type || "unknown"} value={type}>{type || "Chưa rõ"}</option>)}</select></label>
            <label className="clean-field"><span>Chiều cao (cm)</span><input type="number" min="40" max="250" step="0.1" value={form.height} aria-invalid={Boolean(errors.height)} onChange={(event) => updateField("height", event.target.value)} />{errors.height && <small role="alert">{errors.height}</small>}</label>
            <label className="clean-field"><span>Cân nặng (kg)</span><input type="number" min="2" max="500" step="0.1" value={form.weight} aria-invalid={Boolean(errors.weight)} onChange={(event) => updateField("weight", event.target.value)} />{errors.weight && <small role="alert">{errors.weight}</small>}</label>
            <label className="clean-field wide"><span>Ghi chú dị ứng</span><textarea rows={3} maxLength={1000} value={form.allergyNote} onChange={(event) => updateField("allergyNote", event.target.value)} placeholder="Thuốc, thực phẩm hoặc tác nhân gây dị ứng..." /></label>
          </div>
          <section className="patient-disease-section"><div><div><h3>Bệnh nền</h3><p>Thêm thời gian và ghi chú khi có dữ liệu.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, chronicDiseases: [...current.chronicDiseases, { ...EMPTY_DISEASE }] }))}><Plus size={15} /> Thêm bệnh</button></div>{form.chronicDiseases.map((item, index) => <article key={item.id || index}><label className="clean-field wide"><span>Tên bệnh</span><input value={item.diseaseName} aria-invalid={Boolean(errors[`disease-${index}`])} onChange={(event) => updateDisease(index, "diseaseName", event.target.value)} />{errors[`disease-${index}`] && <small role="alert">{errors[`disease-${index}`]}</small>}</label><label className="clean-field"><span>Từ ngày</span><input type="date" value={item.from} aria-invalid={Boolean(errors[`disease-date-${index}`])} onChange={(event) => updateDisease(index, "from", event.target.value)} /></label><label className="clean-field"><span>Đến ngày</span><input type="date" value={item.to} aria-invalid={Boolean(errors[`disease-date-${index}`])} onChange={(event) => updateDisease(index, "to", event.target.value)} />{errors[`disease-date-${index}`] && <small role="alert">{errors[`disease-date-${index}`]}</small>}</label><label className="clean-field wide"><span>Ghi chú</span><textarea rows={2} value={item.note} onChange={(event) => updateDisease(index, "note", event.target.value)} /></label><button type="button" className="patient-disease-remove" aria-label={`Xóa bệnh nền ${index + 1}`} onClick={() => setForm((current) => ({ ...current, chronicDiseases: current.chronicDiseases.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /> Xóa mục</button></article>)}</section>
          <footer className="patient-profile-dialog-actions"><button type="button" className="btn btn-ghost" onClick={closeDialog} disabled={saving}>Hủy</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : dialog.profile ? "Lưu thay đổi" : "Tạo hồ sơ"}</button></footer>
        </form>
      </Dialog>}
    </section>
  );
}
