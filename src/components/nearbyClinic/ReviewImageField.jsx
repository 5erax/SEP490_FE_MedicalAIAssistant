import { ImagePlus } from "lucide-react";

export default function ReviewImageField({ images, message, addFiles, remove, retry, uploading, hasErrors, disabled }) {
  return <div className="review-image-upload" aria-busy={uploading}>
    <div><strong>Ảnh minh họa</strong><small>Tối đa 5 ảnh, mỗi ảnh không quá 5 MB.</small></div>
    {images.length > 0 && <div className="review-image-preview-grid">{images.map((image, index) => <div className="review-image-preview" key={image.key}>
      <img className="review-image" src={image.preview || image.url} alt={`Ảnh minh họa ${index + 1} sẽ đính kèm đánh giá`} width="240" height="180" decoding="async" />
      <button className="review-remove-image" type="button" aria-label={`Xóa ảnh ${index + 1}`} disabled={disabled} onClick={() => remove(image.key)}>×</button>
      <div className="review-image-state">
        <span>{image.status === "uploading" ? "Đang tải…" : image.status === "error" ? "Chưa tải được" : "Đã tải"}</span>
        {image.status === "error" && <button type="button" disabled={disabled} onClick={() => retry(image.key)} aria-label={`Thử lại ảnh ${index + 1}`}>Thử lại</button>}
      </div>
    </div>)}</div>}
    <label className={`review-upload-button${images.length >= 5 || disabled ? " is-disabled" : ""}`}>
      <ImagePlus size={17} aria-hidden="true" /><span>Thêm ảnh ({images.length}/5)</span>
      <input type="file" accept="image/*" multiple aria-label="Thêm ảnh minh họa" aria-describedby="review-image-help" disabled={disabled || images.length >= 5}
        onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; addFiles(files); }} />
    </label>
    <p id="review-image-help">Ảnh đánh giá có thể được người khác xem. Không tải hồ sơ bệnh án, giấy tờ tùy thân hoặc thông tin sức khỏe riêng tư.</p>
    <p className="review-upload-status" role="status">{message || (uploading ? "Ảnh đang tải. Bạn có thể tiếp tục viết nhận xét."
      : hasErrors ? "Một số ảnh chưa tải được. Thử lại hoặc bỏ ảnh lỗi để lưu đánh giá."
        : images.length ? "Chọn lưu đánh giá để cập nhật các ảnh này." : "")}</p>
    {images.filter((image) => image.status === "error").map((image) => <p className="review-upload-error" key={image.key}>{image.name}: {image.error}</p>)}
  </div>;
}
