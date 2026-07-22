import {
  ArrowRight,
  BrainCircuit,
  Building2,
  Database,
  Stethoscope,
  Users,
} from "lucide-react";

export default function AdminOverviewSection({
  aiConfigsLoading,
  aiConfigTotalCount,
  doctorsLoading,
  doctorTotalCount,
  facilitiesLoading,
  facilityTotalCount,
  usersLoading,
  userTotalCount,
  onOpenSection,
}) {
  const metrics = [
    {
      label: "Tài khoản",
      description: "Tổng số tài khoản do API người dùng trả về.",
      value: userTotalCount,
      loading: usersLoading,
      section: "users",
      icon: Users,
    },
    {
      label: "Bác sĩ",
      description: "Tổng số hồ sơ bác sĩ trong hệ thống.",
      value: doctorTotalCount,
      loading: doctorsLoading,
      section: "doctors",
      icon: Stethoscope,
    },
    {
      label: "Cấu hình AI",
      description: "Tổng số cấu hình prompt và mô hình AI.",
      value: aiConfigTotalCount,
      loading: aiConfigsLoading,
      section: "ai-configs",
      icon: BrainCircuit,
    },
    {
      label: "Cơ sở y tế",
      description: "Tổng số cơ sở y tế đã được quản lý.",
      value: facilityTotalCount,
      loading: facilitiesLoading,
      section: "facilities",
      icon: Building2,
    },
  ];

  return (
    <section className="admin-overview" aria-labelledby="admin-overview-title">
      <header className="admin-overview-heading">
        <div>
          <p className="eyebrow">Tổng quan quản trị</p>
          <h2 id="admin-overview-title">Dữ liệu hệ thống đã xác nhận</h2>
          <p>
            Các tổng số dưới đây lấy trực tiếp từ API phân trang. Trạng thái chi tiết được hiển thị tại từng trang quản lý.
          </p>
        </div>
        <span><Database size={18} aria-hidden="true" /> Nguồn dữ liệu API</span>
      </header>

      <div className="admin-overview-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              className="admin-overview-card"
              type="button"
              key={metric.section}
              onClick={() => onOpenSection(metric.section)}
              aria-label={`Mở trang ${metric.label}`}
            >
              <span className="admin-overview-card-icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="admin-overview-card-copy">
                <small>{metric.label}</small>
                <strong>{metric.loading ? "Đang tải" : metric.value}</strong>
                <span>{metric.description}</span>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <aside className="admin-overview-scope" aria-label="Phạm vi số liệu">
        <strong>Phạm vi số liệu</strong>
        <p>
          Tổng quan không tạo điểm số, xu hướng, lịch vận hành hoặc cảnh báo từ dữ liệu của riêng trang hiện tại.
          Hãy mở từng khu vực để xem trạng thái và thao tác có sẵn từ backend.
        </p>
      </aside>
    </section>
  );
}
