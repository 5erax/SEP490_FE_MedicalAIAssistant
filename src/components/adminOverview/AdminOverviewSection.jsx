import {
  BrainCircuit,
  MoreVertical,
  Stethoscope,
  Users,
} from "lucide-react";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminOverviewSection({
  activeAIConfigs,
  activeDoctors,
  aiConfigTotalCount,
  departmentsCount,
  disabledAIConfigs,
  doctorTotalCount,
  pageTotalCount,
  pendingUsers,
  rolesLabel,
  runningAIFeatures,
  onOpenSection,
}) {
  const approvalRate = pageTotalCount
    ? Math.round(((pageTotalCount - pendingUsers) / pageTotalCount) * 100)
    : 100;
  const doctorActivationRate = doctorTotalCount
    ? Math.round((activeDoctors / doctorTotalCount) * 100)
    : 0;
  const aiHealthScore = aiConfigTotalCount
    ? Math.round((activeAIConfigs / aiConfigTotalCount) * 100)
    : 0;
  const inactiveDoctors = Math.max(0, doctorTotalCount - activeDoctors);
  const managementLoad = pendingUsers + disabledAIConfigs + inactiveDoctors;
  const performanceBars = [
    { label: "User", value: approvalRate, accent: "mint" },
    { label: "Bác sĩ", value: doctorActivationRate, accent: "teal" },
    { label: "AI", value: aiHealthScore, accent: "coral" },
    { label: "Khoa", value: Math.min(100, departmentsCount * 8), accent: "sand" },
    { label: "Feature", value: Math.min(100, runningAIFeatures * 18), accent: "mint" },
    { label: "Tải", value: Math.max(12, Math.min(100, 100 - managementLoad * 8)), accent: "teal" },
  ];
  const operations = [
    {
      title: `${pendingUsers} tài khoản cần duyệt`,
      time: "Ưu tiên hôm nay",
      tone: "warning",
      section: "users",
      icon: <Users size={16} />,
    },
    {
      title: `${disabledAIConfigs} AI config đang tắt`,
      time: "Kiểm tra prompt/model",
      tone: "info",
      section: "ai-configs",
      icon: <BrainCircuit size={16} />,
    },
    {
      title: `${inactiveDoctors} bác sĩ chưa active`,
      time: "Cập nhật hồ sơ nhân sự",
      tone: "success",
      section: "doctors",
      icon: <Stethoscope size={16} />,
    },
  ];

  return (
    <section className="admin-dashboard-grid">
      <div className="admin-panel admin-performance-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Performance Over Time</p>
            <h2>Hiệu suất vận hành</h2>
            <span className="admin-panel-date">Cập nhật theo dữ liệu trang hiện tại</span>
          </div>
          <div className="admin-panel-tools">
            <span>Short</span>
            <span>Filter</span>
            <button type="button" aria-label="Tùy chọn"><MoreVertical size={16} /></button>
          </div>
        </div>
        <div className="admin-overview-metrics">
          <article>
            <span>Approval rate</span>
            <strong>{approvalRate}%</strong>
            <small className="trend-up">+{Math.max(0, approvalRate - 80)}%</small>
          </article>
          <article>
            <span>Doctor active</span>
            <strong>{activeDoctors}/{doctorTotalCount}</strong>
            <small className="trend-up">{doctorActivationRate}%</small>
          </article>
          <article>
            <span>AI enabled</span>
            <strong>{activeAIConfigs}</strong>
            <small className={disabledAIConfigs ? "trend-down" : "trend-up"}>{disabledAIConfigs} off</small>
          </article>
          <article>
            <span>Departments</span>
            <strong>{departmentsCount}</strong>
            <small className="trend-up">Catalog</small>
          </article>
        </div>
      </div>

      <div className="admin-panel admin-chart-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Campaign Performance</p>
            <h2>Chỉ số quản trị</h2>
            <span className="admin-panel-date">{managementLoad} mục cần xử lý</span>
          </div>
          <span className="soft-badge">Live</span>
        </div>
        <div className="admin-bar-chart" aria-label="Biểu đồ hiệu suất quản trị">
          {performanceBars.map((bar) => (
            <div className={`admin-bar admin-bar-${bar.accent}`} key={bar.label}>
              <span style={{ height: `${Math.max(14, bar.value)}%` }}>
                <strong>{bar.value}%</strong>
              </span>
              <small>{bar.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-panel admin-schedule-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Operations Queue</p>
            <h2>Lịch vận hành</h2>
          </div>
          <span className="soft-badge">{rolesLabel}</span>
        </div>
        <div className="admin-week-strip">
          {WEEK_DAYS.map((day, index) => (
            <button className={index === 4 ? "active" : ""} type="button" key={day}>
              <span>{day}</span>
              <strong>{15 + index}</strong>
            </button>
          ))}
        </div>
        <div className="admin-operation-list">
          {operations.map((item) => (
            <button
              className={`admin-operation admin-operation-${item.tone}`}
              type="button"
              key={item.title}
              onClick={() => onOpenSection(item.section)}
            >
              <span className="admin-operation-icon">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.time}</small>
              </div>
              <MoreVertical size={16} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
