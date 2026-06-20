import { ClipboardCheck, Stethoscope } from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

export default function RecoveryPlanPage() {
  return (
    <main className="app-page">
      <section className="container symptom-card" aria-labelledby="recovery-plan-title">
        <span className="studio-mark" aria-hidden="true"><ClipboardCheck size={26} /></span>
        <p className="eyebrow">Theo dõi sau sàng lọc</p>
        <h1 id="recovery-plan-title">Kế hoạch phục hồi</h1>
        <p>Kế hoạch phù hợp cần dựa trên kết quả khám và hướng dẫn của bác sĩ. Hãy hoàn thành phân tích lâm sàng trước để xác định chuyên khoa cần ưu tiên.</p>
        <div className="result-actions">
          <Button type="button" onClick={() => navigate("/symptom")}><Stethoscope size={18} /> Bắt đầu phân tích lâm sàng</Button>
          <Button type="button" tone="secondary" onClick={() => navigate("/map")}>Tìm cơ sở y tế</Button>
        </div>
      </section>
    </main>
  );
}
