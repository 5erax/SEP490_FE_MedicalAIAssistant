import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { NEARBY_RADII } from "../../utils/nearbyFacilities";

export default function FacilityExplorerControls({ search, onSearch, suggestions, onSuggestion,
  departments, departmentsLoading, selectedDepartmentId, selectedType, typeOptions, radiusKm,
  filtersOpen, onOpenFilters, onCloseFilters, onApplyFilters, hasLocation, locating, onLocate,
  locationError, accuracy, nearbyError, onRetry, loading }) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const filterHeadingRef = useRef(null);
  const searchRef = useRef(null);
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (filtersOpen) filterHeadingRef.current?.focus();
    else if (wasOpenRef.current) searchRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = filtersOpen;
  }, [filtersOpen]);
  const showSuggestions = focused && search.trim() && suggestions.length > 0;
  const department = departments.find((item) => item.id === selectedDepartmentId);
  const choose = (facility) => { setFocused(false); setActiveIndex(-1); onSuggestion(facility); };
  if (filtersOpen) return <form className="explorer-filters" onSubmit={(event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onApplyFilters({ departmentId: values.get("department"), type: values.get("type"), radius: values.get("radius") === "nearest" ? "nearest" : Number(values.get("radius")) });
  }}>
    <button type="button" className="explorer-back" onClick={onCloseFilters}><ArrowLeft size={16} /> Quay lại</button>
    <h2 ref={filterHeadingRef} tabIndex={-1}>Bộ lọc cơ sở y tế</h2>
    <label>Chuyên khoa<select name="department" defaultValue={selectedDepartmentId || "all"} disabled={departmentsLoading}>
      <option value="all">Tất cả chuyên khoa</option>
      {!department && selectedDepartmentId && selectedDepartmentId !== "all" && <option value={selectedDepartmentId}>Chuyên khoa được gợi ý</option>}
      {departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
    </select></label>
    {departmentsLoading && <p role="status">Đang tải chuyên khoa…</p>}
    <label>Loại cơ sở<select name="type" defaultValue={selectedType}>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Phạm vi<select name="radius" defaultValue={radiusKm}><option value="nearest">Không giới hạn</option>{NEARBY_RADII.map((radius) => <option key={radius} value={radius}>Trong {radius} km</option>)}</select></label>
    {!hasLocation && <p className="explorer-muted">Phạm vi sẽ được áp dụng sau khi bạn cho phép sử dụng vị trí.</p>}
    <div className="explorer-filter-actions"><button className="explorer-primary" type="submit" disabled={departmentsLoading}>Áp dụng</button><button type="button" onClick={() => onApplyFilters({ departmentId: "all", type: "all", radius: "nearest" })}>Đặt lại</button></div>
  </form>;
  return <header className="explorer-controls">
    <h2>Tìm cơ sở y tế</h2>
    <div className="explorer-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <Search size={17} aria-hidden="true" />
      <label className="sr-only" htmlFor="explorer-search">Tìm tên bệnh viện, phòng khám</label>
      <input ref={searchRef} id="explorer-search" type="search" placeholder="Tên bệnh viện, phòng khám…" value={search}
        onChange={(event) => { onSearch(event); setActiveIndex(-1); setFocused(true); }} onFocus={() => setFocused(true)}
        role="combobox" aria-expanded={Boolean(showSuggestions)} aria-controls={showSuggestions ? "explorer-suggestions" : undefined} aria-autocomplete="list"
        aria-activedescendant={showSuggestions && suggestions[activeIndex] ? `explorer-option-${activeIndex}` : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setFocused(false); return; }
          if (!showSuggestions) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((value) => {
              if (value < 0) return event.key === "ArrowDown" ? 0 : suggestions.length - 1;
              return (value + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length;
            });
          }
          if (event.key === "Enter" && suggestions[activeIndex]) { event.preventDefault(); choose(suggestions[activeIndex]); }
        }} />
      {showSuggestions && <ul className="explorer-suggestions" id="explorer-suggestions" role="listbox">
        {suggestions.map((facility, index) => <li key={facility.facilityId} id={`explorer-option-${index}`} role="option" aria-selected={index === activeIndex}>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(facility)}>{facility.facilityName}<small>{facility.address}</small></button>
        </li>)}
      </ul>}
    </div>
    <div className="explorer-filter-row"><button type="button" className="explorer-filter-chip" onClick={onOpenFilters}>{department?.name || (selectedDepartmentId !== "all" ? "Chuyên khoa được gợi ý" : "Tất cả chuyên khoa")}</button><button type="button" onClick={onOpenFilters}><SlidersHorizontal size={16} aria-hidden="true" /> Bộ lọc</button></div>
    {(selectedType !== "all" || radiusKm !== "nearest") && <p className="explorer-active-filters">{selectedType !== "all" && <span>{typeOptions.find(([key]) => key === selectedType)?.[1]}</span>}{radiusKm !== "nearest" && <span>Trong {radiusKm} km{!hasLocation ? " · Chờ vị trí" : ""}</span>}</p>}
    <section className="explorer-location" aria-labelledby="explorer-location-title">
      <div className="explorer-location-heading">
        <span className="explorer-location-icon" aria-hidden="true">{hasLocation ? <Check size={22} /> : <LocateFixed size={22} />}</span>
        <div><h3 id="explorer-location-title">Vị trí của bạn</h3><p id="explorer-location-status" role="status">{locating ? "Đang xác định vị trí của bạn…" : hasLocation ? "Đã xác định vị trí · Sắp xếp gần → xa" : "Dùng vị trí để tìm cơ sở gần bạn."}</p></div>
      </div>
      <button className="explorer-location-button" type="button" onClick={onLocate} disabled={locating} aria-busy={locating} aria-describedby="explorer-location-status">
        {locating ? <LoaderCircle className="explorer-spinner" size={22} aria-hidden="true" /> : <LocateFixed size={22} aria-hidden="true" />}
        {locating ? "Đang định vị…" : hasLocation ? "Cập nhật vị trí" : "Dùng vị trí của tôi"}
      </button>
      {locationError && <p className="explorer-notice" role="alert">{locationError}</p>}
      {hasLocation && accuracy > 1000 && <p className="explorer-notice" role="status">Sai số vị trí khoảng {(accuracy / 1000).toFixed(1)} km. Hãy bật vị trí chính xác và định vị lại.</p>}
    </section>
    {nearbyError && <p className="explorer-notice" role="alert">{nearbyError} <button type="button" onClick={onRetry}>Thử lại</button></p>}
    {loading && <span className="sr-only" role="status">Đang cập nhật danh sách</span>}
  </header>;
}
