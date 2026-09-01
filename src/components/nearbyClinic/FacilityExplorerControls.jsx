import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, LocateFixed, Map, Search, SlidersHorizontal } from "lucide-react";
import { NEARBY_RADII } from "../../utils/nearbyFacilities";

export default function FacilityExplorerControls({ search, onSearch, suggestions, onSuggestion,
  departments, departmentsLoading, selectedDepartmentId, selectedType, typeOptions, radiusKm,
  filtersOpen, onOpenFilters, onCloseFilters, onApplyFilters, hasLocation, locating, onLocate,
  locationError, accuracy, loading, departmentName, compactSearch = false, locationOptional = false, onShowMap }) {
  const [focused, setFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const filterHeadingRef = useRef(null);
  const searchRef = useRef(null);
  const filterButtonRef = useRef(null);
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (filtersOpen) filterHeadingRef.current?.focus();
    else if (wasOpenRef.current) filterButtonRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = filtersOpen;
  }, [filtersOpen]);
  const showSuggestions = focused && search.trim() && suggestions.length > 0;
  const department = departments.find((item) => item.id === selectedDepartmentId);
  const showSearch = !compactSearch || searchOpen || Boolean(search);
  const compactLocation = hasLocation || locationOptional;
  const choose = (facility) => { setFocused(false); setActiveIndex(-1); onSuggestion(facility); };
  if (filtersOpen) return <form className="explorer-filters" onSubmit={(event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const radius = values.get("radius");
    onApplyFilters({ departmentId: values.get("department"), type: values.get("type"), radius: radius === "nearest" || radius === "auto" ? radius : Number(radius) });
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
    <label>Phạm vi<select name="radius" defaultValue={radiusKm}>{radiusKm === "auto" && <option value="auto">Tự tìm phạm vi gần nhất</option>}<option value="nearest">Không giới hạn</option>{NEARBY_RADII.map((radius) => <option key={radius} value={radius}>Trong {radius} km</option>)}</select></label>
    {radiusKm === "auto" && <p className="explorer-muted">Hệ thống tự mở rộng phạm vi từ 1 đến tối đa 50 km và dừng ngay khi có kết quả. Hiển thị tối đa 5 cơ sở gần nhất để bạn dễ lựa chọn.</p>}
    {!hasLocation && <p className="explorer-muted">Phạm vi sẽ được áp dụng sau khi bạn cho phép sử dụng vị trí.</p>}
    <div className="explorer-filter-actions"><button className="explorer-primary" type="submit" disabled={departmentsLoading}>Áp dụng</button><button type="button" onClick={() => onApplyFilters({ departmentId: "all", type: "all", radius: "nearest" })}>Đặt lại</button></div>
  </form>;
  return <header className="explorer-controls">
    <h2 tabIndex={-1} className="explorer-screen-title">{departmentName ? `Nơi khám có ${departmentName}` : selectedDepartmentId !== "all" ? "Nơi khám có chuyên khoa đã chọn" : "Tìm cơ sở y tế"}</h2>
    <section className={`explorer-location${compactLocation ? " explorer-location-compact" : ""}`} aria-label="Vị trí tìm kiếm">
      <div className="explorer-location-heading">
        <span className="explorer-location-icon" aria-hidden="true">{hasLocation ? <Check size={20} /> : <LocateFixed size={20} />}</span>
        <div>
          {!compactLocation && <h3>Sắp xếp nơi khám gần bạn</h3>}
          <p id="explorer-location-status" role="status">{locating ? "Đang xác định vị trí và tìm cơ sở…" : hasLocation ? locationError ? "Đang dùng vị trí trước đó" : "Đã sắp xếp cơ sở từ gần đến xa theo vị trí của bạn" : locationOptional ? "Chưa dùng vị trí của bạn" : "Dùng vị trí để sắp xếp cơ sở từ gần đến xa và hiển thị các lựa chọn gần nhất trên bản đồ."}</p>
        </div>
      </div>
      <button className={compactLocation ? "explorer-location-update" : "explorer-location-button"} type="button" onClick={onLocate} disabled={locating} aria-busy={locating} aria-label={hasLocation ? "Cập nhật vị trí" : "Tìm và xem nơi khám gần tôi"} aria-describedby="explorer-location-status">
        {locating ? <LoaderCircle className="explorer-spinner" size={20} aria-hidden="true" /> : !compactLocation && <LocateFixed size={20} aria-hidden="true" />}
        {locating ? "Đang tìm…" : hasLocation ? "Cập nhật" : compactLocation ? "Tìm gần tôi" : "Tìm và xem nơi khám gần tôi"}
      </button>
      {locationError && <p className="explorer-notice" role="alert">{locationError}</p>}
      {!locationError && hasLocation && accuracy > 1000 && <p className="explorer-notice" role="status">Vị trí hiện tại có thể lệch khoảng {(accuracy / 1000).toFixed(1)} km. Bạn có thể bật vị trí chính xác trên thiết bị rồi chọn Cập nhật.</p>}
    </section>
    <div className="explorer-tools" aria-label="Tìm kiếm và cách xem">
      {compactSearch && <button type="button" aria-expanded={showSearch} aria-controls="explorer-search-area" onClick={() => {
        setSearchOpen(!showSearch);
        if (showSearch && search) onSearch({ target: { value: "" } });
        if (!showSearch) window.requestAnimationFrame(() => searchRef.current?.focus());
      }}><Search size={18} aria-hidden="true" />{showSearch ? "Đóng tìm kiếm" : "Tìm theo tên"}</button>}
      <button ref={filterButtonRef} type="button" onClick={onOpenFilters}><SlidersHorizontal size={18} aria-hidden="true" /> Bộ lọc</button>
      <button type="button" className="explorer-mobile-map-toggle" onClick={onShowMap}><Map size={18} aria-hidden="true" /> Bản đồ</button>
    </div>
    <div className="explorer-search" id="explorer-search-area" hidden={!showSearch} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
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
    {loading && <span className="sr-only" role="status">Đang cập nhật danh sách</span>}
  </header>;
}
