import { Building2, ListFilter, MapPinned, Search } from "lucide-react";

export function MapSection() {
  return (
    <section id="map" className="section section-alt map-section">
      <div className="container map-preview-layout">
        <div className="map-preview-copy">
          <p className="eyebrow">Tìm cơ sở y tế</p>
          <h2 className="section-title">
            Mở bản đồ khi bạn cần tìm <em>cơ sở phù hợp</em>.
          </h2>
          <p className="section-copy">
            Công cụ bản đồ sử dụng danh sách cơ sở y tế từ hệ thống. Kết quả chỉ
            hiển thị vị trí khi cơ sở có tọa độ hợp lệ và không tự tạo khoảng cách,
            thời gian chờ hoặc khả năng đặt lịch.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/map">
              <MapPinned size={18} aria-hidden="true" /> Mở bản đồ cơ sở y tế
            </a>
            <a className="btn btn-ghost" href="/dashboard">
              <Search size={18} aria-hidden="true" /> Nhận gợi ý chuyên khoa
            </a>
          </div>
        </div>

        <ol className="map-preview-steps" aria-label="Các bước tìm cơ sở y tế">
          <li>
            <Search size={20} aria-hidden="true" />
            <div><strong>Tìm kiếm</strong><span>Nhập tên cơ sở hoặc khu vực cần tra cứu.</span></div>
          </li>
          <li>
            <ListFilter size={20} aria-hidden="true" />
            <div><strong>Lọc kết quả</strong><span>Thu hẹp danh sách theo thông tin hệ thống cung cấp.</span></div>
          </li>
          <li>
            <Building2 size={20} aria-hidden="true" />
            <div><strong>Xem thông tin thật</strong><span>Địa chỉ, liên hệ và vị trí chỉ xuất hiện khi có dữ liệu hợp lệ.</span></div>
          </li>
        </ol>
      </div>
    </section>
  );
}
