import { AlertTriangle, FileCheck2, ShieldCheck, Stethoscope } from "lucide-react";

const SAFETY_PRINCIPLES = [
  {
    icon: FileCheck2,
    title: "Kết quả để tham khảo",
    body: "Gợi ý giúp bạn chuẩn bị thông tin và cân nhắc bước tiếp theo, không phải kết luận y khoa.",
  },
  {
    icon: Stethoscope,
    title: "Không chẩn đoán hay kê đơn",
    body: "Chẩn đoán và điều trị cần được thực hiện bởi bác sĩ hoặc chuyên gia y tế phù hợp.",
  },
  {
    icon: ShieldCheck,
    title: "Ưu tiên an toàn",
    body: "Luồng kiểm tra an toàn hướng bạn dừng tự đánh giá khi xuất hiện dấu hiệu đáng lo ngại.",
  },
];

export function ProductScopeSection() {
  return (
    <section id="safety" className="care-section care-safety-section" aria-labelledby="safety-title">
      <div className="container care-safety-layout">
        <div className="care-safety-intro">
          <p className="care-eyebrow">Sử dụng an toàn</p>
          <h2 id="safety-title">Biết rõ giới hạn để sử dụng an toàn.</h2>
          <p>
            MediMate được dùng để chuẩn bị trước khi đi khám. Khi cần đánh giá chính xác,
            bạn vẫn nên trao đổi trực tiếp với chuyên gia y tế.
          </p>
          <a href="/medical-disclaimer">Đọc tuyên bố miễn trừ y tế</a>
        </div>

        <div className="care-safety-principles">
          {SAFETY_PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <span><Icon size={22} aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="container care-emergency-banner">
        <AlertTriangle size={24} aria-hidden="true" />
        <div>
          <strong>Không dùng MediMate trong tình huống khẩn cấp</strong>
          <p>
            Nếu có khó thở nặng, đau ngực dữ dội, mất ý thức, dấu hiệu đột quỵ hoặc
            chảy máu nhiều, hãy tìm trợ giúp y tế khẩn cấp ngay.
          </p>
        </div>
      </div>
    </section>
  );
}
