import { useRef, useState } from "react";
import { CheckCircle2, Star, X } from "lucide-react";
import { Button, Dialog, Field, Textarea } from "../ui";
import "../../styles/recovery-plan-feedback.css";

const RATING_OPTIONS = [
  { value: 1, label: "Rất không hài lòng" },
  { value: 2, label: "Không hài lòng" },
  { value: 3, label: "Bình thường" },
  { value: 4, label: "Hài lòng" },
  { value: 5, label: "Rất hài lòng" },
];

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

export default function RecoveryPlanFeedbackDialog({
  open,
  plan,
  submitting = false,
  errorMessage = "",
  onClose,
  onSubmit,
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [note, setNote] = useState("");
  const ratingRefs = useRef([]);
  const firstRatingRef = useRef(null);

  if (!open || !plan) return null;

  function selectRating(nextRating) {
    if (submitting) return;
    setRating(nextRating);
  }

  function handleRatingKeyDown(event, index) {
    if (submitting) return;
    const keys = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextIndex = (index + 1) % RATING_OPTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextIndex = (index - 1 + RATING_OPTIONS.length) % RATING_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = RATING_OPTIONS.length - 1;
    }

    const nextRating = RATING_OPTIONS[nextIndex].value;
    setRating(nextRating);
    ratingRefs.current[nextIndex]?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting || rating < 1 || rating > 5) return;
    onSubmit?.({
      rating,
      note: note.trim() || null,
    });
  }

  const selectedLabel = RATING_OPTIONS.find((item) => item.value === rating)?.label ?? "Chưa chọn mức đánh giá";

  return (
    <Dialog
      backdropClassName="recovery-feedback-backdrop"
      className="recovery-feedback-dialog"
      labelledBy="recovery-feedback-title"
      describedBy="recovery-feedback-description"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      initialFocusRef={firstRatingRef}
    >
      <header className="recovery-feedback-dialog__header">
        <span className="recovery-feedback-dialog__icon" aria-hidden="true">
          <CheckCircle2 size={22} />
        </span>
        <div>
          <p>HOÀN THÀNH KẾ HOẠCH</p>
          <h2 id="recovery-feedback-title">Đánh giá kế hoạch phục hồi</h2>
        </div>
        <button
          type="button"
          className="recovery-feedback-dialog__close"
          aria-label="Đóng và đánh giá sau"
          onClick={onClose}
          disabled={submitting}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="recovery-feedback-dialog__summary">
          <strong>{plan.planName || "Kế hoạch phục hồi"}</strong>
          <span>Hoàn thành: {formatDate(plan.completedAt || plan.endDate)}</span>
        </div>

        <p id="recovery-feedback-description" className="recovery-feedback-dialog__description">
          Chia sẻ trải nghiệm của bạn để đội ngũ hiểu rõ hơn mức độ hữu ích của kế hoạch. Đánh giá này không thay đổi nội dung kế hoạch đã hoàn thành.
        </p>

        <fieldset className="recovery-feedback-rating" disabled={submitting}>
          <legend>Mức độ hài lòng <span aria-hidden="true">*</span></legend>
          <div
            className="recovery-feedback-rating__controls"
            role="radiogroup"
            aria-label="Chọn mức đánh giá từ 1 đến 5 sao"
            onMouseLeave={() => setHoveredRating(0)}
          >
            {RATING_OPTIONS.map((option, index) => {
              const checked = rating === option.value;
              const isActive = option.value <= (hoveredRating || rating);
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    ratingRefs.current[index] = node;
                    if (index === 0) firstRatingRef.current = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`${option.value} sao - ${option.label}`}
                  className={[checked ? "is-selected" : "", isActive ? "is-active" : ""].filter(Boolean).join(" ")}
                  tabIndex={rating === 0 ? (index === 0 ? 0 : -1) : (checked ? 0 : -1)}
                  onClick={() => selectRating(option.value)}
                  onKeyDown={(event) => handleRatingKeyDown(event, index)}
                  onMouseEnter={() => setHoveredRating(option.value)}
                >
                  <Star size={23} aria-hidden="true" />
                  <span>{option.value}</span>
                </button>
              );
            })}
          </div>
          <p className="recovery-feedback-rating__label" aria-live="polite">{selectedLabel}</p>
        </fieldset>

        <Field label="Ghi chú thêm" optional>
          <Textarea
            rows={5}
            maxLength={1000}
            value={note}
            disabled={submitting}
            placeholder="Chia sẻ thêm điều hữu ích hoặc điểm bạn thấy khó thực hiện…"
            aria-describedby="recovery-feedback-note-count"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <p id="recovery-feedback-note-count" className="recovery-feedback-dialog__counter">
          {note.length.toLocaleString("vi-VN")} / 1.000 ký tự
        </p>

        {errorMessage && (
          <div className="recovery-feedback-dialog__error" role="alert">
            {errorMessage}
          </div>
        )}

        <footer className="recovery-feedback-dialog__actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>
            Để sau
          </Button>
          <Button
            type="submit"
            disabled={rating < 1 || rating > 5}
            loading={submitting}
            loadingLabel="Đang gửi…"
          >
            Gửi đánh giá
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
