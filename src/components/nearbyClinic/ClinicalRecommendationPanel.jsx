import { ArrowRight } from "lucide-react";

export default function ClinicalRecommendationPanel({ context, status, notice, chatContext }) {
  const department = context?.recommendedDepartment;
  const href = context?.sessionId ? `/pre-consultation?sessionId=${encodeURIComponent(context.sessionId)}` : "/pre-consultation";
  return <section className="explorer-advice" aria-label="Kết quả tư vấn">
    <h2>Kết quả tư vấn</h2>
    {status === "loading" && <p role="status">Đang khôi phục kết quả tư vấn…</p>}
    {notice && <p role={status === "error" ? "alert" : "status"}>{notice}</p>}
    {status === "ready" && <>
      <small>Chuyên khoa được gợi ý</small>
      <h3>{department?.departmentName || "Chưa xác định chuyên khoa"}</h3>
      <p>{department?.description || "Chưa có mô tả chuyên khoa."}</p>
      {department?.reason && <p>{department.reason}</p>}
      <h3>Các kết quả tham khảo</h3>
      <p className="explorer-muted">{context?.diagnoses?.length ? "Chọn từng mục để đọc giải thích. Mức độ phù hợp không phải xác suất mắc bệnh." : "Chưa có kết quả tham khảo bổ sung cho lần tư vấn này."}</p>
      {(context?.diagnoses ?? []).map((diagnosis, index) => {
        const score = Number(diagnosis.confidenceScore);
        const percent = Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score)));
        return <details className="explorer-diagnosis" key={`${diagnosis.icd10Code || diagnosis.diseaseName}-${index}`}>
          <summary><strong>{diagnosis.diseaseName || "Kết quả tham khảo"}</strong>{Number.isFinite(score) && score > 0 && <small>Độ phù hợp: {percent}%</small>}</summary>
          <p>{diagnosis.clinicalReasoning || "Chưa có giải thích chi tiết."}</p>
          {diagnosis.icd10Code && <small>ICD-10: {diagnosis.icd10Code}</small>}
        </details>;
      })}
      <a className="explorer-primary" href={href}>Tiếp tục tư vấn trước khám <ArrowRight size={16} aria-hidden="true" /></a>
    </>}
    {chatContext && <details><summary>Nội dung trao đổi trước đó</summary><p>{chatContext.symptom}</p><p>{chatContext.answer}</p></details>}
    <p className="explorer-disclaimer">Thông tin tham khảo, không thay thế chẩn đoán của bác sĩ.</p>
  </section>;
}
