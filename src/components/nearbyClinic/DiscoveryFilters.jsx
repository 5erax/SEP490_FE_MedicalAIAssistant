import { useEffect, useRef, useState } from "react";
export default function DiscoveryFilters({ value, defaults, departments, types, hasLocation, onApply, onCancel }) {
  const [draft, setDraft] = useState(value);
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const change = (key) => (e) => setDraft((s) => ({ ...s, [key]: e.target.value }));
  return <form className="discovery-filters" onSubmit={(e) => { e.preventDefault(); onApply(draft); }}
    onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}>
    <button type="button" onClick={onCancel}>← Quay lại</button>
    <h2 ref={headingRef} tabIndex="-1">Điều chỉnh tìm kiếm</h2>
    <label>Chuyên khoa<select aria-label="Chuyên khoa" value={draft.departmentId} onChange={change("departmentId")}>
      <option value="all">Tất cả chuyên khoa</option>
      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select></label>
    <label>Loại cơ sở<select aria-label="Loại cơ sở" value={draft.type} onChange={change("type")}>
      {types.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <label>Phạm vi<select aria-label="Phạm vi" value={draft.mode} onChange={change("mode")}>
      <option value="all">Không giới hạn</option>
      <option value="auto" disabled={!hasLocation}>Tự tìm phạm vi có cơ sở</option>
      <option value="nearby" disabled={!hasLocation}>Chọn bán kính</option>
    </select></label>
    {draft.mode === "nearby" && <label>Bán kính<select aria-label="Bán kính" value={draft.radiusKm} onChange={change("radiusKm")}>
      {[5,10,15,20,25,50,100,250,500,1000].map((r) => <option key={r} value={r}>{r} km</option>)}
    </select></label>}
    {!hasLocation && <small className="discovery-note">Bạn vẫn có thể lọc cơ sở. Cần vị trí để so sánh khoảng cách và bán kính.</small>}
    <label>Sắp xếp<select aria-label="Sắp xếp" value={draft.sort} onChange={change("sort")}>
      <option value="name">Tên cơ sở A–Z</option>
      <option value="rating">Đánh giá cao trước</option>
      <option value="nearest" disabled={!hasLocation}>Khoảng cách gần → xa</option>
    </select></label>
    <div className="discovery-filter-actions">
      <button type="button" onClick={() => setDraft(defaults)}>Đặt lại</button>
      <button type="submit">Áp dụng</button>
    </div>
  </form>;
}
