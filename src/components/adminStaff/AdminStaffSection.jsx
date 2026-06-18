function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminStaffSection({
  form,
  message,
  saving,
  onChange,
  onSubmit,
}) {
  return (
    <section className="admin-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Nhân sự</p>
          <h2>Tạo tài khoản staff</h2>
        </div>
        <span className="soft-badge">Tài khoản nội bộ</span>
      </div>
      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}
      <form className="clean-form" onSubmit={onSubmit}>
        <div className="form-two-cols">
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} required />
          </Field>
          <Field label="Username">
            <input value={form.userName} onChange={(event) => onChange("userName", event.target.value)} required />
          </Field>
          <Field label="Tên hiển thị">
            <input value={form.displayName} onChange={(event) => onChange("displayName", event.target.value)} required />
          </Field>
          <Field label="Địa chỉ">
            <input value={form.address} onChange={(event) => onChange("address", event.target.value)} />
          </Field>
          <Field label="Mật khẩu">
            <input type="password" value={form.password} onChange={(event) => onChange("password", event.target.value)} required />
          </Field>
          <Field label="Nhập lại mật khẩu">
            <input type="password" value={form.confirmPassword} onChange={(event) => onChange("confirmPassword", event.target.value)} required />
          </Field>
          <Field label="Giới tính">
            <select value={form.gender} onChange={(event) => onChange("gender", event.target.value)}>
              <option value="1">Nam</option>
              <option value="2">Nữ</option>
            </select>
          </Field>
          <Field label="Ngày sinh">
            <input type="date" value={form.dateOfBirth} onChange={(event) => onChange("dateOfBirth", event.target.value)} />
          </Field>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Đang tạo..." : "Tạo tài khoản staff"}
        </button>
      </form>
    </section>
  );
}
