import ClinicalNote from "./ClinicalNote";
import ClinicalDisclosure from "./ClinicalDisclosure";
import { CLINICAL_NOTES } from "../../content/clinicalNotes";
import { clinicalConfidencePercent, clinicalText, hasClinicalPriority } from "../../utils/clinicalPresentation";

export default function DepartmentRecommendation({ department }) {
  const name = clinicalText(department?.departmentName);
  const reason = clinicalText(department?.reason ?? department?.Reason);
  const description = clinicalText(department?.description);
  const percent = clinicalConfidencePercent(department?.confidenceScore);
  return (
    <section className="clinical-department" aria-label="Chuyên khoa được gợi ý">
      <header className="clinical-department-header">
        <span className="clinical-eyebrow">Chuyên khoa được gợi ý</span>
        <h3 className="clinical-department-name">{name || "Chưa xác định chuyên khoa"}</h3>
        {percent !== null && <span className="clinical-confidence">Độ phù hợp: {percent}%</span>}
      </header>
      {hasClinicalPriority(department) && (
        <ClinicalNote tone="warning" title={CLINICAL_NOTES.priorityTitle}>{CLINICAL_NOTES.priority}</ClinicalNote>
      )}
      {reason && <div className="clinical-reason">
        <h4 className="clinical-section-title">{CLINICAL_NOTES.reasonTitle}</h4>
        <p className="clinical-body-text">{reason}</p>
      </div>}
      {description && <ClinicalDisclosure title={CLINICAL_NOTES.departmentTitle}>
        <p className="clinical-body-text">{description}</p>
      </ClinicalDisclosure>}
      {!name && !reason && !description && <p className="clinical-helper">Hệ thống chưa trả về chuyên khoa cụ thể cho lần tư vấn này.</p>}
    </section>
  );
}
