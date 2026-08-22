import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Files,
  Search,
  Utensils,
  X,
} from "lucide-react";
import { useFeedback } from "../feedback/feedbackContext";
import { Badge, Button, Dialog, EmptyState, ErrorState, LoadingState, TextInput } from "../ui";
import {
  doctorRecoveryPlanTemplatesApi,
  getRecoveryPlanTemplateErrorMessage,
  RECOVERY_PLAN_DISEASE_GROUPS,
} from "../../services/api";
import "../../styles/doctor-recovery-plan-template.css";

const PAGE_SIZE = 20;

function sorted(value) {
  return Array.isArray(value) ? value.slice().sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)) : [];
}

export default function RecoveryPlanTemplatePickerDialog({
  diseaseGroup,
  submitting,
  refreshKey,
  onClose,
  onSelect,
  onCreateNew,
  onGoToLibrary,
}) {
  const { showToast } = useFeedback();
  const [templates, setTemplates] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await doctorRecoveryPlanTemplatesApi.list({
        pageNumber,
        pageSize: PAGE_SIZE,
        diseaseGroup,
        search,
      });
      const data = response?.data ?? {};
      setTemplates(Array.isArray(data.items) ? data.items : []);
      setTotalPages(Number(data.totalPages) || 0);
    } catch (requestError) {
      setError(getRecoveryPlanTemplateErrorMessage(requestError, "Chưa thể tải kế hoạch mẫu phù hợp."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, diseaseGroup, search, refreshKey]);

  function handleSearch(event) {
    event.preventDefault();
    setPageNumber(1);
    setSearch(searchInput.trim());
  }

  async function openPreview(templateId) {
    setPreviewLoading(true);
    try {
      const response = await doctorRecoveryPlanTemplatesApi.get(templateId);
      setPreview(response?.data ?? null);
    } catch (requestError) {
      showToast({
        type: "error",
        title: "Không thể xem kế hoạch mẫu",
        message: getRecoveryPlanTemplateErrorMessage(requestError),
      });
      await load();
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-template-picker-modal"
      labelledBy="doctor-template-picker-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header doctor-template-picker-header">
        <span aria-hidden="true"><Files size={20} /></span>
        <div>
          <h2 id="doctor-template-picker-title">{preview ? "Xem trước kế hoạch mẫu" : "Chọn kế hoạch mẫu"}</h2>
          <p>{RECOVERY_PLAN_DISEASE_GROUPS[diseaseGroup] || "Nhóm bệnh của yêu cầu"}</p>
        </div>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>

      {preview ? (
        <TemplatePreview template={preview} submitting={submitting} onBack={() => setPreview(null)} onSelect={() => onSelect(preview.id)} />
      ) : (
        <>
          <form className="doctor-template-picker-search" onSubmit={handleSearch}>
            <Search size={16} aria-hidden="true" />
            <TextInput
              value={searchInput}
              maxLength={200}
              disabled={submitting}
              placeholder="Tìm theo tên mẫu hoặc tên kế hoạch..."
              aria-label="Tìm kế hoạch mẫu"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" tone="secondary" size="sm" disabled={submitting}>Tìm</Button>
          </form>

          <div className="doctor-template-picker-body">
            {loading || previewLoading ? (
              <LoadingState label={previewLoading ? "Đang tải bản xem trước…" : "Đang tải kế hoạch mẫu…"} />
            ) : error ? (
              <ErrorState title="Không thể tải kế hoạch mẫu" description={error} action={<Button onClick={load}>Thử lại</Button>} />
            ) : templates.length === 0 ? (
              <EmptyState
                icon={<Files size={24} />}
                title="Chưa có kế hoạch mẫu phù hợp"
                description={`Bạn chưa tạo mẫu cho nhóm bệnh ${RECOVERY_PLAN_DISEASE_GROUPS[diseaseGroup] || "này"}.`}
                action={(
                  <div className="doctor-template-picker-empty-actions">
                    <Button tone="secondary" onClick={onCreateNew}>Tạo kế hoạch mới</Button>
                    <Button onClick={onGoToLibrary}>Đi tới Kế hoạch mẫu</Button>
                  </div>
                )}
              />
            ) : (
              <ul className="doctor-template-picker-list">
                {templates.map((template) => (
                  <li key={template.id}>
                    <div className="doctor-template-picker-card-head">
                      <strong>{template.templateName || "Chưa đặt tên mẫu"}</strong>
                      <Badge tone={template.isComplete ? "success" : "warning"}>{template.isComplete ? "Hoàn chỉnh" : "Đang soạn"}</Badge>
                    </div>
                    <p>{template.planName || "Chưa đặt tên kế hoạch"}</p>
                    <div className="doctor-template-picker-card-meta">
                      <span><Clock3 size={13} aria-hidden="true" /> {template.durationDays || 0} ngày</span>
                      <span>{template.phaseCount || 0} giai đoạn</span>
                    </div>
                    <div className="doctor-template-picker-card-actions">
                      <Button tone="secondary" size="sm" disabled={submitting} onClick={() => openPreview(template.id)}>
                        <Eye size={14} aria-hidden="true" /> Xem trước
                      </Button>
                      <Button
                        size="sm"
                        loading={submitting}
                        loadingLabel="Đang tạo kế hoạch…"
                        disabled={submitting}
                        onClick={() => onSelect(template.id)}
                      >
                        Sử dụng mẫu
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loading && totalPages > 1 && (
            <nav className="doctor-template-picker-pagination" aria-label="Phân trang kế hoạch mẫu">
              <Button tone="secondary" size="sm" disabled={submitting || pageNumber <= 1} onClick={() => setPageNumber((current) => current - 1)}>
                <ChevronLeft size={15} aria-hidden="true" /> Trước
              </Button>
              <span>Trang {pageNumber} / {totalPages}</span>
              <Button tone="secondary" size="sm" disabled={submitting || pageNumber >= totalPages} onClick={() => setPageNumber((current) => current + 1)}>
                Sau <ChevronRight size={15} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </Dialog>
  );
}

function TemplatePreview({ template, submitting, onBack, onSelect }) {
  const phases = sorted(template.phases);
  return (
    <>
      <div className="doctor-template-preview-body">
        <section className="doctor-template-preview-summary">
          <div><span>Tên kế hoạch</span><strong>{template.planName || "Chưa cập nhật"}</strong></div>
          <div><span>Thời lượng</span><strong>{template.durationDays || 0} ngày</strong></div>
          <div className="is-wide"><span>Tóm tắt</span><p>{template.summary || "Chưa có tóm tắt."}</p></div>
          <div className="is-wide"><span>Hướng dẫn tái khám</span><p>{template.recheckInstruction || "Chưa có hướng dẫn."}</p></div>
        </section>

        {phases.length === 0 ? (
          <EmptyState title="Mẫu chưa có giai đoạn" description="Bạn vẫn có thể sử dụng mẫu và hoàn thiện trong trình soạn kế hoạch." />
        ) : (
          <ol className="doctor-template-preview-phases">
            {phases.map((phase) => (
              <li key={phase.id}>
                <div className="doctor-template-preview-phase-head">
                  <strong>{phase.phaseName || "Chưa đặt tên giai đoạn"}</strong>
                  <span>Ngày {phase.startDay}–{phase.endDay}</span>
                </div>
                {phase.sleepAndRestHoursPerDay != null && <p>Ngủ nghỉ: {phase.sleepAndRestHoursPerDay} giờ/ngày</p>}
                {phase.instruction && <p>{phase.instruction}</p>}
                {sorted(phase.nutrientTargets).map((nutrient) => (
                  <div className="doctor-template-preview-nutrient" key={nutrient.id}>
                    <strong>{nutrient.nutrientName}</strong>
                    <span>{nutrient.amountPerDay} {nutrient.unit}/ngày</span>
                    {sorted(nutrient.foodSources).length > 0 && (
                      <p><Utensils size={13} aria-hidden="true" /> {sorted(nutrient.foodSources).map((food) => food.foodName).join(", ")}</p>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
      </div>
      <footer className="doctor-template-preview-actions">
        <Button tone="secondary" disabled={submitting} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> Quay lại</Button>
        <Button loading={submitting} loadingLabel="Đang tạo kế hoạch…" disabled={submitting} onClick={onSelect}>Sử dụng mẫu này</Button>
      </footer>
    </>
  );
}
