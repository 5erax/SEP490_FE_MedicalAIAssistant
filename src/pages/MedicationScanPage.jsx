import { useRef, useState } from "react";
import {
  Camera,
  Check,
  FileImage,
  ImagePlus,
  MapPin,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { navigate as goTo } from "../router/navigation";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_EDGE = 1600;

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MedicationScanPage() {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanStep, setScanStep] = useState("");
  const [scanError, setScanError] = useState("");
  const previewCanvasRef = useRef(null);

  const clearPreview = () => {
    const canvas = previewCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setFile(null);
  };

  const acceptFile = async (nextFile) => {
    if (!nextFile) return;
    setFileError("");

    if (!ALLOWED_IMAGE_TYPES.has(nextFile.type)) {
      clearPreview();
      setFileError("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > MAX_IMAGE_BYTES) {
      clearPreview();
      setFileError("Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(nextFile);
      const scale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = previewCanvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context || bitmap.width <= 0 || bitmap.height <= 0) {
        bitmap.close();
        throw new Error("invalid-image");
      }

      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setFile(nextFile);
    } catch {
      clearPreview();
      setFileError("Không thể đọc ảnh này. Vui lòng chọn một tệp ảnh hợp lệ khác.");
      return;
    }

    setScanStatus("idle");
    setScanStep("");
    setScanError("");
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    await acceptFile(event.dataTransfer.files?.[0]);
  };

  const handleFileChange = async (event) => {
    await acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleScan = async () => {
    if (!file) return;
    setScanStatus("scanning");
    setScanError("");
    setScanStep("Đang kiểm tra trạng thái dịch vụ nhận diện thuốc...");
    await delay(600);
    setScanStatus("idle");
    setScanStep("");
    setScanError(
      "Tính năng nhận diện thuốc đang được hoàn thiện. Ảnh của bạn chỉ được xem trước trên trình duyệt và không được phân tích hoặc lưu.",
    );
  };

  return (
    <div className="medication-page">
      <style>{styles}</style>

      <header className="medication-intro">
        <div>
          <span className="medication-status">
            <ShieldCheck size={16} aria-hidden="true" />
            Tính năng thử nghiệm
          </span>
          <p className="medication-eyebrow">Kiểm tra nhãn thuốc</p>
          <h1>Xem trước ảnh trước khi trao đổi với người có chuyên môn</h1>
        </div>
        <p>
          MediMate hiện chưa nhận diện thuốc hoặc kiểm tra tương tác từ ảnh.
          Bạn có thể chọn ảnh để kiểm tra độ rõ ngay trên thiết bị; ảnh không được gửi hoặc lưu.
        </p>
      </header>

      <section className="medication-workspace" aria-label="Xem trước ảnh nhãn thuốc">
        <section className="scan-panel" aria-labelledby="medication-upload-title">
          <div className="scan-panel-head">
            <div>
              <p className="medication-eyebrow">Ảnh nhãn thuốc</p>
              <h2 id="medication-upload-title">
                {file ? "Ảnh đã sẵn sàng để xem trước" : "Chọn một ảnh rõ và đầy đủ"}
              </h2>
            </div>
            <span aria-hidden="true"><FileImage size={21} /></span>
          </div>

          <label
            className={`upload-zone ${file ? "has-preview" : ""}`}
            htmlFor="medication-label-upload"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              id="medication-label-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="medication-upload-hint medication-file-feedback"
              onChange={handleFileChange}
            />
            <canvas
              ref={previewCanvasRef}
              role="img"
              aria-label="Ảnh thuốc đã chọn"
              hidden={!file}
            />
            {!file && (
              <div className="upload-placeholder">
                <span aria-hidden="true"><ImagePlus size={28} /></span>
                <strong>Chọn hoặc kéo ảnh vào đây</strong>
                <small id="medication-upload-hint">JPG, PNG hoặc WEBP · tối đa 10 MB</small>
              </div>
            )}
          </label>

          <p
            id="medication-file-feedback"
            className={fileError ? "upload-error" : "medication-live-empty"}
            role="alert"
            aria-atomic="true"
          >
            {fileError}
          </p>

          <div className="upload-actions" aria-label="Cách chọn ảnh">
            <label>
              <Upload size={17} aria-hidden="true" />
              Tải ảnh lên
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Tải ảnh nhãn thuốc lên"
                onChange={handleFileChange}
              />
            </label>
            <label>
              <Camera size={17} aria-hidden="true" />
              Chụp ảnh
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label="Chụp ảnh nhãn thuốc"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <button
            className="primary-action"
            type="button"
            disabled={!file || scanStatus === "scanning"}
            aria-describedby="medication-scan-availability"
            onClick={handleScan}
          >
            <ScanLine size={18} aria-hidden="true" />
            {scanStatus === "scanning" ? "Đang kiểm tra..." : "Kiểm tra trạng thái nhận diện"}
          </button>

          <div
            className={`scan-feedback ${scanStatus === "scanning" ? "is-loading" : ""} ${scanError ? "has-message" : ""}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {scanStatus === "scanning" && (
              <>
                <span className="scan-progress" aria-hidden="true" />
                <strong>{scanStep}</strong>
              </>
            )}
            {scanError && <p>{scanError}</p>}
          </div>
        </section>

        <aside className="medication-guidance" aria-labelledby="medication-guidance-title">
          <div className="medication-guidance-head">
            <span aria-hidden="true"><ShieldCheck size={23} /></span>
            <div>
              <p className="medication-eyebrow">Giới hạn hiện tại</p>
              <h2 id="medication-guidance-title">Chưa có kết quả phân tích thuốc</h2>
            </div>
          </div>

          <p id="medication-scan-availability" className="medication-guidance-copy">
            Trang này không xác định tên thuốc, hoạt chất, liều dùng hay mức độ tương tác.
            Không dùng ảnh xem trước để tự quyết định cách sử dụng thuốc.
          </p>

          <ul className="medication-checklist">
            <li>
              <Check size={17} aria-hidden="true" />
              <span>Ảnh chỉ được xử lý cục bộ để tạo bản xem trước.</span>
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              <span>Không có dữ liệu thuốc mẫu được hiển thị như kết quả thật.</span>
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              <span>Thông tin sử dụng thuốc cần được xác nhận với bác sĩ hoặc dược sĩ.</span>
            </li>
          </ul>

          {file ? (
            <div className="selected-file" role="status" aria-live="polite" aria-atomic="true">
              <span aria-hidden="true"><FileImage size={19} /></span>
              <div>
                <strong>Ảnh đã chọn</strong>
                <p>{file.name} · {formatFileSize(file.size)}</p>
              </div>
            </div>
          ) : (
            <div className="selected-file is-empty">
              <span aria-hidden="true"><ImagePlus size={19} /></span>
              <div>
                <strong>Chưa chọn ảnh</strong>
                <p>Ưu tiên ảnh đủ sáng, thấy rõ tên và thông tin trên nhãn.</p>
              </div>
            </div>
          )}

          <button className="facility-action" type="button" onClick={() => goTo("/map")}>
            <MapPin size={17} aria-hidden="true" />
            Tìm cơ sở y tế
          </button>
        </aside>
      </section>
    </div>
  );
}

const styles = `
.medication-page {
  --med-bg: var(--color-surface-soft);
  --med-card: var(--color-surface);
  --med-text: var(--color-ink);
  --med-muted: var(--color-muted);
  --med-line: var(--color-line);
  --med-line-strong: var(--color-line-strong);
  --med-primary: var(--color-info);
  --med-primary-strong: var(--color-info-strong);
  --med-primary-soft: var(--color-info-bg);
  display: grid;
  gap: 18px;
  width: min(100%, 1120px);
  margin: 0 auto;
  color: var(--med-text);
}

.medication-page h1,
.medication-page h2,
.medication-page p {
  margin: 0;
}

.medication-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, .72fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: end;
  border-bottom: 1px solid var(--med-line);
  padding: 8px 4px 24px;
}

.medication-intro > div {
  display: grid;
  justify-items: start;
  gap: 11px;
}

.medication-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--med-line-strong);
  border-radius: 999px;
  background: var(--med-card);
  color: var(--med-primary-strong);
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 900;
}

.medication-eyebrow {
  color: var(--med-primary-strong);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.medication-intro h1 {
  max-width: 720px;
  font-size: clamp(35px, 4.8vw, 58px);
  line-height: 1.02;
  letter-spacing: -.045em;
}

.medication-intro > p {
  max-width: 480px;
  color: var(--med-muted);
  font-size: 14px;
  line-height: 1.72;
}

.medication-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr);
  overflow: hidden;
  border: 1px solid var(--med-line);
  border-radius: 23px;
  background: var(--med-card);
  box-shadow: 0 22px 60px color-mix(in srgb, var(--med-text) 8%, transparent);
}

.scan-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: var(--med-card);
  padding: clamp(20px, 3.5vw, 34px);
  box-shadow: none;
}

.scan-panel-head,
.medication-guidance-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.scan-panel-head h2,
.medication-guidance h2 {
  margin-top: 5px;
  font-size: clamp(21px, 2.5vw, 28px);
  line-height: 1.18;
  letter-spacing: -.025em;
}

.scan-panel-head > span,
.medication-guidance-head > span {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 45px;
  height: 45px;
  border: 1px solid var(--med-line);
  border-radius: 14px;
  background: var(--med-primary-soft);
  color: var(--med-primary-strong);
}

.upload-zone {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 360px;
  overflow: hidden;
  border: 1px dashed var(--med-line-strong);
  border-radius: 17px;
  background:
    linear-gradient(var(--med-line), var(--med-line)) 18px 18px / 34px 1px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) 18px 18px / 1px 34px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) calc(100% - 52px) 18px / 34px 1px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) calc(100% - 18px) 18px / 1px 34px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) 18px calc(100% - 18px) / 34px 1px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) 18px calc(100% - 52px) / 1px 34px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) calc(100% - 52px) calc(100% - 18px) / 34px 1px no-repeat,
    linear-gradient(var(--med-line), var(--med-line)) calc(100% - 18px) calc(100% - 52px) / 1px 34px no-repeat,
    var(--med-bg);
  padding: 28px;
  text-align: center;
  cursor: pointer;
}

.upload-zone > input,
.upload-actions input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-zone:focus-within,
.upload-actions label:focus-within {
  outline: 3px solid var(--med-primary);
  outline-offset: 3px;
}

.upload-placeholder {
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}

.upload-placeholder > span {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin-bottom: 4px;
  border: 1px solid var(--med-line);
  border-radius: 18px;
  background: var(--med-card);
  color: var(--med-primary-strong);
}

.upload-placeholder strong {
  font-size: 17px;
}

.upload-placeholder small {
  color: var(--med-muted);
  font-size: 12px;
}

.upload-zone canvas {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  border: 1px solid var(--med-line);
  border-radius: 12px;
  background: var(--med-card);
}

.upload-zone canvas[hidden] {
  display: none;
}

.medication-live-empty {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.upload-error {
  border: 1px solid var(--color-danger);
  border-radius: 11px;
  background: var(--color-danger-bg);
  color: var(--color-danger);
  padding: 11px 13px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.5;
}

.upload-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.upload-actions label,
.primary-action,
.facility-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border: 1px solid var(--med-line-strong);
  border-radius: 11px;
  background: var(--med-card);
  color: var(--med-text);
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
}

.upload-actions label {
  overflow: hidden;
  cursor: pointer;
}

.primary-action {
  width: 100%;
  border-color: var(--med-primary);
  background: var(--med-primary);
  color: var(--color-surface);
}

.primary-action:hover:not(:disabled) {
  background: var(--med-primary-strong);
}

.primary-action:disabled {
  border-style: dashed;
  border-color: var(--med-line-strong);
  background: var(--med-bg);
  color: var(--med-muted);
  cursor: not-allowed;
}

.scan-feedback {
  display: none;
}

.scan-feedback.is-loading,
.scan-feedback.has-message {
  display: grid;
  gap: 9px;
  border: 1px solid var(--med-line);
  border-radius: 12px;
  background: var(--med-bg);
  padding: 12px 13px;
}

.scan-feedback strong,
.scan-feedback p {
  color: var(--med-muted);
  font-size: 12px;
  line-height: 1.55;
}

.scan-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--med-primary), var(--color-primary), var(--med-primary));
  background-size: 200% 100%;
  animation: medication-progress 1s linear infinite;
}

.medication-guidance {
  display: grid;
  align-content: start;
  gap: 20px;
  min-width: 0;
  border-left: 1px solid var(--med-line);
  background: var(--med-bg);
  padding: clamp(22px, 3.5vw, 34px);
}

.medication-guidance-copy {
  color: var(--med-muted);
  font-size: 13px;
  line-height: 1.7;
}

.medication-checklist {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.medication-checklist li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border-top: 1px solid var(--med-line);
  padding: 15px 0;
  color: var(--med-text);
  font-size: 12px;
  font-weight: 720;
  line-height: 1.55;
}

.medication-checklist svg {
  margin-top: 2px;
  color: var(--med-primary-strong);
}

.selected-file {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  border: 1px solid var(--med-line);
  border-radius: 13px;
  background: var(--med-card);
  padding: 13px;
}

.selected-file > span {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  border-radius: 11px;
  background: var(--med-primary-soft);
  color: var(--med-primary-strong);
}

.selected-file strong {
  font-size: 13px;
}

.selected-file p {
  overflow-wrap: anywhere;
  margin-top: 3px;
  color: var(--med-muted);
  font-size: 11px;
  line-height: 1.45;
}

.facility-action {
  width: 100%;
  margin-top: auto;
}

.facility-action:hover {
  border-color: var(--med-primary);
  background: var(--med-card);
}

.medication-page button:focus-visible {
  outline: 3px solid var(--med-primary);
  outline-offset: 3px;
}

@keyframes medication-progress {
  to { background-position: -200% 0; }
}

@media (max-width: 920px) {
  .medication-intro,
  .medication-workspace {
    grid-template-columns: 1fr;
  }

  .medication-guidance {
    border-top: 1px solid var(--med-line);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .medication-page {
    gap: 14px;
  }

  .medication-intro {
    gap: 15px;
    padding: 2px 1px 18px;
  }

  .medication-intro h1 {
    font-size: clamp(34px, 11.5vw, 46px);
  }

  .medication-workspace {
    border-radius: 18px;
  }

  .scan-panel,
  .medication-guidance {
    padding: 19px;
  }

  .upload-zone {
    min-height: 280px;
    padding: 20px;
  }

  .upload-actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scan-progress {
    animation: none;
    background: var(--med-primary);
  }
}

@media (forced-colors: active) {
  .medication-workspace,
  .scan-panel,
  .medication-guidance,
  .upload-zone,
  .upload-placeholder > span,
  .scan-panel-head > span,
  .medication-guidance-head > span,
  .selected-file,
  .selected-file > span,
  .upload-error,
  .scan-feedback {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }

  .primary-action,
  .facility-action,
  .upload-actions label {
    border: 1px solid ButtonBorder;
    background: ButtonFace;
    color: ButtonText;
  }

  .medication-page :focus-visible {
    outline-color: Highlight;
  }
}
`;

export default MedicationScanPage;
