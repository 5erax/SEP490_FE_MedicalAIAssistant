import { getSpecialtyExplanation, readRankingScore } from "../../utils/clinicalExplanation";
export default function DiscoveryResults({ context, status, notice, onFind }) {
  const department = context?.recommendedDepartment;
  const diagnoses = context?.diagnoses ?? [];
  const explanation = getSpecialtyExplanation(department, diagnoses);
  return <section className="discovery-results" aria-labelledby="consultation-result-title">
    <h2 id="consultation-result-title">Kết quả tư vấn</h2>
    {status === "loading" ? <p role="status">Đang khôi phục kết quả tư vấn…</p>
      : status !== "ready" ? <div><p role="alert">{notice || "Chưa có kết quả tư vấn cho phiên này."}</p><button type="button" onClick={onFind}>Xem danh sách cơ sở</button></div>
      : <>
        <div className="discovery-specialty">
          <p>Chuyên khoa được gợi ý</p>
          <h3>{department?.departmentName || "Chưa xác định chuyên khoa"}</h3>
          <p>{explanation.summary}</p>
          <button type="button" onClick={onFind}>Tìm cơ sở khám phù hợp</button>
          <small className="discovery-note">Bạn có thể xem danh sách mà không cần chia sẻ vị trí.</small>
        </div>
        <details><summary>Vì sao gợi ý chuyên khoa này?</summary>
          {explanation.reasoning && <p>{explanation.reasoning}</p>}
          <p>{department?.description || "Phiên này chưa có mô tả chuyên khoa chi tiết."}</p>
        </details>
        <h3>Các kết quả để tham khảo ({diagnoses.length})</h3>
        <small className="discovery-note">Đây chưa phải chẩn đoán. Điểm gợi ý không phải xác suất mắc bệnh.</small>
        {diagnoses.map((d, i) => <details key={d.diagnosisId || d.id || i}>
          <summary>{d.diseaseName || d.diagnosisName || d.name || "Kết quả tham khảo"}</summary>
          {readRankingScore(d) !== null && <p>Điểm gợi ý: {Math.round(readRankingScore(d) * 100)}%</p>}
          <p>{d.clinicalReasoning || d.explanation || d.reason || d.description || "Phiên này chưa lưu giải thích chi tiết."}</p>
        </details>)}
        <p className="discovery-note">Kết quả hỗ trợ định hướng, không thay thế chẩn đoán hoặc tư vấn trực tiếp của bác sĩ.</p>
      </>}
  </section>;
}
