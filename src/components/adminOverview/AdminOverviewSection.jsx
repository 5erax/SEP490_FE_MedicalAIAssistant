import {
  ArrowUpRight,
  BrainCircuit,
  Building2,
  Database,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  PaymentStatusChartCard,
  RevenueChartCard,
  UserGrowthPlaceholderCard,
} from "./OverviewCharts";

const OVERVIEW_METRICS = [
  {
    label: "Tài khoản người dùng",
    shortLabel: "Tài khoản",
    description: "Tài khoản hiện có trong hệ thống.",
    section: "users",
    icon: Users,
  },
  {
    label: "Hồ sơ bác sĩ",
    shortLabel: "Bác sĩ",
    description: "Hồ sơ bác sĩ đã được ghi nhận.",
    section: "doctors",
    icon: Stethoscope,
  },
  {
    label: "Cấu hình AI",
    shortLabel: "Cấu hình AI",
    description: "Cấu hình prompt và mô hình hiện có.",
    section: "ai-configs",
    icon: BrainCircuit,
  },
  {
    label: "Cơ sở y tế",
    shortLabel: "Cơ sở y tế",
    description: "Cơ sở y tế đang được quản lý.",
    section: "facilities",
    icon: Building2,
  },
];

function getAdminPath(section) {
  return `/app/admin/${section}`;
}

export default function AdminOverviewSection({
  aiConfigsError,
  aiConfigsLoading,
  aiConfigTotalCount,
  doctorsError,
  doctorsLoading,
  doctorTotalCount,
  facilitiesError,
  facilitiesLoading,
  facilityTotalCount,
  usersError,
  usersLoading,
  userTotalCount,
  onOpenSection,
  onRetryMetric,
  payments = [],
  paymentsError = "",
  paymentsLoading = false,
  onRetryPayments,
}) {
  const metricState = {
    users: { value: userTotalCount, loading: usersLoading, error: usersError },
    doctors: { value: doctorTotalCount, loading: doctorsLoading, error: doctorsError },
    "ai-configs": { value: aiConfigTotalCount, loading: aiConfigsLoading, error: aiConfigsError },
    facilities: { value: facilityTotalCount, loading: facilitiesLoading, error: facilitiesError },
  };

  return (
    <section className="admin-overview" aria-labelledby="admin-overview-title">
      <header className="admin-overview-heading">
        <div className="admin-overview-heading-copy">
          <p className="eyebrow">Tổng quan quản trị</p>
          <h2 id="admin-overview-title">Thông tin cốt lõi của hệ thống</h2>
          <p>
            Theo dõi số lượng bản ghi hiện có và mở nhanh khu vực bạn cần quản lý.
          </p>
        </div>

        <div className="admin-overview-source">
          <span className="admin-overview-source-icon" aria-hidden="true">
            <Database size={19} />
          </span>
          <span>
            <small>Nguồn dữ liệu</small>
            <strong>Dữ liệu quản trị</strong>
          </span>
        </div>
      </header>

      <div className="admin-overview-grid" aria-label="Số lượng dữ liệu quản trị">
        {OVERVIEW_METRICS.map((metric, index) => {
          const Icon = metric.icon;
          const state = metricState[metric.section];
          return (
            <a
              className="admin-overview-card"
              href={getAdminPath(metric.section)}
              key={metric.section}
              onClick={(event) => {
                event.preventDefault();
                if (state.error) onRetryMetric(metric.section);
                else onOpenSection(metric.section);
              }}
              aria-label={state.error
                ? `Thử tải lại số lượng ${metric.shortLabel}`
                : `Mở trang ${metric.shortLabel}`}
              aria-busy={state.loading}
            >
              <span className="admin-overview-card-top">
                <span className="admin-overview-card-icon">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="admin-overview-card-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>

              <span className="admin-overview-card-copy">
                <small>{metric.label}</small>
                <strong>
                  {state.loading ? (
                    <>
                      <span className="admin-overview-loading" aria-hidden="true">—</span>
                      <span className="sr-only">Đang tải số lượng {metric.shortLabel}</span>
                    </>
                  ) : state.error ? "Không khả dụng" : state.value}
                </strong>
                <span>{state.error ? "Chưa tải được số liệu từ hệ thống." : metric.description}</span>
              </span>

              <span className="admin-overview-card-action">
                {state.error ? "Thử tải lại" : "Xem danh sách"}
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
            </a>
          );
        })}
      </div>

      <div className="admin-overview-charts">
        <RevenueChartCard
          loading={paymentsLoading}
          error={paymentsError}
          payments={payments}
          onRetry={onRetryPayments}
        />
        <UserGrowthPlaceholderCard />
        <PaymentStatusChartCard
          loading={paymentsLoading}
          error={paymentsError}
          payments={payments}
          onRetry={onRetryPayments}
        />
      </div>

      <aside className="admin-overview-scope" aria-label="Phạm vi dữ liệu tổng quan">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Chỉ hiển thị dữ liệu đã có</strong>
          <p>
            Các con số trên phản ánh dữ liệu hiện có trong hệ thống. MediMate không tự suy
            đoán hiệu suất, xu hướng hoặc cảnh báo vận hành.
          </p>
        </div>
      </aside>
    </section>
  );
}
