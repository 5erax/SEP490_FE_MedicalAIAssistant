import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Building2,
  Database,
  FileHeart,
  FlaskConical,
  HelpCircle,
  Layers,
  MessageSquareWarning,
  PackageCheck,
  ReceiptText,
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
  {
    label: "Chuyên khoa",
    shortLabel: "Chuyên khoa",
    description: "Tổng số chuyên khoa hiện có.",
    section: "departments",
    icon: Layers,
  },
  {
    label: "Chương ICD",
    shortLabel: "Chương ICD",
    description: "Tổng số chương ICD hiện có.",
    section: "icd-chapters",
    icon: BookOpen,
  },
  {
    label: "Câu hỏi lâm sàng",
    shortLabel: "Câu hỏi",
    description: "Tổng số câu hỏi lâm sàng hiện có.",
    section: "clinical-questions",
    icon: HelpCircle,
  },
  {
    label: "Chỉ số xét nghiệm",
    shortLabel: "Chỉ số XN",
    description: "Tổng số chỉ số xét nghiệm hiện có.",
    section: "lab-indicators",
    icon: FlaskConical,
  },
  {
    label: "Hồ sơ bệnh nhân",
    shortLabel: "Hồ sơ bệnh nhân",
    description: "Tổng số hồ sơ bệnh nhân hiện có.",
    section: "patient-profiles",
    icon: FileHeart,
  },
  {
    label: "Gói dịch vụ",
    shortLabel: "Gói dịch vụ",
    description: "Gói dịch vụ đang hoạt động.",
    section: "subscriptions",
    icon: PackageCheck,
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
  departmentTotalCount,
  departmentError = "",
  departmentLoading = false,
  icdChapterTotalCount,
  icdChapterError = "",
  icdChapterLoading = false,
  patientProfileTotalCount,
  patientProfileError = "",
  patientProfileLoading = false,
  activeSubscriptionPlanCount,
  subscriptionError = "",
  subscriptionLoading = false,
  operationalCounts = {},
  operationalCountsLoading = false,
  onOpenSection,
  onRetryMetric,
  payments = [],
  paymentsError = "",
  paymentsLoading = false,
  onRetryPayments,
}) {
  const clinicalQuestionsAvailable = operationalCounts.clinicalQuestions !== null;
  const labIndicatorsAvailable = operationalCounts.labIndicators !== null;

  const metricState = {
    users: { value: userTotalCount, loading: usersLoading, error: usersError },
    doctors: { value: doctorTotalCount, loading: doctorsLoading, error: doctorsError },
    "ai-configs": { value: aiConfigTotalCount, loading: aiConfigsLoading, error: aiConfigsError },
    facilities: { value: facilityTotalCount, loading: facilitiesLoading, error: facilitiesError },
    departments: { value: departmentTotalCount, loading: departmentLoading, error: departmentError },
    "icd-chapters": { value: icdChapterTotalCount, loading: icdChapterLoading, error: icdChapterError },
    "clinical-questions": {
      value: operationalCounts.clinicalQuestions,
      loading: operationalCountsLoading,
      error: !operationalCountsLoading && !clinicalQuestionsAvailable ? "unavailable" : "",
    },
    "lab-indicators": {
      value: operationalCounts.labIndicators,
      loading: operationalCountsLoading,
      error: !operationalCountsLoading && !labIndicatorsAvailable ? "unavailable" : "",
    },
    "patient-profiles": { value: patientProfileTotalCount, loading: patientProfileLoading, error: patientProfileError },
    subscriptions: { value: activeSubscriptionPlanCount, loading: subscriptionLoading, error: subscriptionError },
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

      <OperationalAttentionSection
        operationalCounts={operationalCounts}
        operationalCountsLoading={operationalCountsLoading}
        payments={payments}
        paymentsLoading={paymentsLoading}
      />

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

function OperationalAttentionSection({ operationalCounts, operationalCountsLoading, payments, paymentsLoading }) {
  const paymentIssueCount = payments.filter((payment) => (
    ["pending", "failed"].includes(String(payment?.status ?? "").toLowerCase())
  )).length;

  const items = [
    {
      key: "feedbackPending",
      icon: MessageSquareWarning,
      label: "Feedback chờ duyệt",
      reason: "Đang chờ duyệt hoặc đã ẩn, cần admin xử lý.",
      value: operationalCounts.feedbackPending,
      loading: operationalCountsLoading,
    },
    {
      key: "labTestNeedsAttention",
      icon: FlaskConical,
      label: "Xét nghiệm cần xử lý",
      reason: "Đang xử lý OCR/phân tích hoặc đã lỗi.",
      value: operationalCounts.labTestNeedsAttention,
      loading: operationalCountsLoading,
    },
    {
      key: "symptomAnalysisFailed",
      icon: Activity,
      label: "Phân tích triệu chứng lỗi",
      reason: "Phiên phân tích với MedGemma thất bại.",
      value: operationalCounts.symptomAnalysisFailed,
      loading: operationalCountsLoading,
    },
    {
      key: "paymentIssues",
      icon: ReceiptText,
      label: "Thanh toán chưa hoàn tất",
      reason: "Giao dịch đang chờ hoặc thất bại.",
      value: paymentIssueCount,
      loading: paymentsLoading,
    },
  ];

  const blockedItems = [
    {
      key: "doctorInvitationPending",
      icon: Stethoscope,
      label: "Lời mời bác sĩ chưa nhận",
      reason: "Backend chưa có API liệt kê lời mời bác sĩ.",
    },
    {
      key: "subscriptionActive",
      icon: PackageCheck,
      label: "Người dùng đang dùng gói",
      reason: "Backend chưa có API liệt kê gói đăng ký của toàn bộ người dùng.",
    },
  ];

  return (
    <section className="admin-overview-attention" aria-labelledby="admin-overview-attention-title">
      <header className="admin-overview-attention-head">
        <p className="eyebrow">Cần chú ý</p>
        <h2 id="admin-overview-attention-title">Vận hành cần xử lý</h2>
      </header>
      <ul className="admin-overview-attention-list">
        {items.map((item) => {
          const Icon = item.icon;
          const unavailable = !item.loading && item.value === null;
          return (
            <li key={item.key}>
              <span className="admin-overview-attention-icon" aria-hidden="true"><Icon size={18} /></span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.reason}</p>
              </div>
              <span className="admin-overview-attention-value">
                {item.loading ? "…" : unavailable ? "Không khả dụng" : item.value}
              </span>
            </li>
          );
        })}
        {blockedItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="is-blocked">
              <span className="admin-overview-attention-icon" aria-hidden="true"><Icon size={18} /></span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.reason}</p>
              </div>
              <span className="admin-overview-attention-value is-blocked">Chưa khả dụng</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
