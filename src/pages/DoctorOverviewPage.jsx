import {
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  ClipboardList,
  FileEdit,
  HeartPulse,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { authApi, getStoredAuth, doctorRecoveryPlanRequestsApi } from "../services/api";
import { navigate } from "../router/navigation";
import { LoadingState } from "../components/ui";
import "../styles/doctor-overview.css";

const ROADMAP = [
  {
    icon: HeartPulse,
    title: "Hồ sơ lâm sàng",
    description: "Đọc chiều cao/cân nặng, bệnh nền, xét nghiệm và thuốc đang dùng của bệnh nhân.",
  },
  {
    icon: FileEdit,
    title: "Soạn kế hoạch phục hồi",
    description: "Xây dựng giai đoạn, dinh dưỡng và thực phẩm gợi ý cho từng yêu cầu.",
  },
  {
    icon: CalendarClock,
    title: "Xem trước & Xuất bản",
    description: "Kiểm tra checklist đầy đủ trước khi gửi kế hoạch tới bệnh nhân.",
  },
];

function getDisplayName(profile, auth) {
  return profile?.displayName || profile?.fullName || profile?.name
    || auth?.displayName || auth?.fullName || auth?.name || "bác sĩ";
}

export default function DoctorOverviewPage() {
  const [auth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  const [mineCount, setMineCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      authApi.me(),
      doctorRecoveryPlanRequestsApi.listOpen({ pageNumber: 1, pageSize: 1 }),
      doctorRecoveryPlanRequestsApi.listMine({ pageNumber: 1, pageSize: 1 }),
    ]).then(([profileResult, openResult, mineResult]) => {
      if (!active) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value.data ?? {});
      setOpenCount(openResult.status === "fulfilled" ? Number(openResult.value?.data?.totalCount) || 0 : null);
      setMineCount(mineResult.status === "fulfilled" ? Number(mineResult.value?.data?.totalCount) || 0 : null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const displayName = getDisplayName(profile, auth);

  return (
    <div className="doctor-overview-page">
      <header className="doctor-overview-header">
        <div>
          <p className="doctor-overview-eyebrow"><Stethoscope size={16} aria-hidden="true" /> Không gian bác sĩ</p>
          <h1>Xin chào, {displayName}.</h1>
          <p>Theo dõi hàng đợi và tiếp tục xử lý các yêu cầu Kế hoạch phục hồi bạn đã nhận.</p>
        </div>
      </header>

      <div className="doctor-overview-top-grid">
        {loading ? (
          <LoadingState label="Đang tải số liệu..." />
        ) : (
          <div className="doctor-overview-stats">
            <article className="doctor-overview-stat-card is-accent">
              <span className="doctor-overview-stat-icon"><ClipboardList size={22} aria-hidden="true" /></span>
              <div>
                <strong>{openCount ?? "—"}</strong>
                <p>Yêu cầu trong hàng đợi</p>
              </div>
              <button type="button" onClick={() => navigate("/app/staff/recovery-plans/queue")}>
                Xem hàng đợi <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>

            <article className="doctor-overview-stat-card">
              <span className="doctor-overview-stat-icon"><ListChecks size={22} aria-hidden="true" /></span>
              <div>
                <strong>{mineCount ?? "—"}</strong>
                <p>Yêu cầu của bệnh nhân</p>
              </div>
              <button type="button" className="doctor-overview-stat-secondary" onClick={() => navigate("/app/staff/recovery-plans/mine")}>
                Xem yêu cầu <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          </div>
        )}

        <aside className="doctor-overview-tips" aria-labelledby="doctor-tips-title">
          <p className="doctor-overview-eyebrow">Hướng dẫn nhanh</p>
          <h2 id="doctor-tips-title">Cách xử lý một yêu cầu</h2>
          <ul>
            <li>
              <CircleCheckBig size={18} aria-hidden="true" />
              <span>Trong Hàng đợi, chọn yêu cầu phù hợp và nhấn Nhận yêu cầu.</span>
            </li>
            <li>
              <CircleCheckBig size={18} aria-hidden="true" />
              <span>Mở yêu cầu đã nhận và nhấn Bắt đầu xem xét trước khi hết thời gian xử lý.</span>
            </li>
            <li>
              <CircleCheckBig size={18} aria-hidden="true" />
              <span>Kiểm tra hồ sơ sức khỏe, điền nội dung tư vấn rồi gửi kế hoạch cho người dùng.</span>
            </li>
          </ul>
          <div className="doctor-overview-tips-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Không kê đơn thuốc. Nội dung chỉ gồm hướng dẫn về dinh dưỡng, thực phẩm, giấc ngủ và nghỉ ngơi.</span>
          </div>
        </aside>
      </div>

      <section className="doctor-overview-roadmap" aria-labelledby="doctor-roadmap-title">
        <div className="doctor-overview-roadmap-heading">
          <span aria-hidden="true"><Sparkles size={20} /></span>
          <div>
            <h2 id="doctor-roadmap-title">Các bước tiếp theo trong quy trình lập kế hoạch hồi phục</h2>
          </div>
        </div>
        <ol className="doctor-overview-roadmap-list">
          {ROADMAP.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <span className="doctor-overview-roadmap-index">{index + 1}</span>
                <span className="doctor-overview-roadmap-icon"><Icon size={18} aria-hidden="true" /></span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
