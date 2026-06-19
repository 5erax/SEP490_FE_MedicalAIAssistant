export default function FacilityReviews({
  authenticated,
  facility,
  form,
  loading,
  message,
  reviews,
  saving,
  onFormChange,
  onSubmit,
}) {
  if (!facility) return null;

  return (
    <section className="facility-reviews" aria-labelledby="facility-review-title">
      <h2 id="facility-review-title">Đánh giá {facility.facilityName}</h2>
      <form onSubmit={onSubmit}>
        <label>
          <span>Số sao</span>
          <select value={form.rating} onChange={(event) => onFormChange("rating", event.target.value)}>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
          </select>
        </label>
        <label>
          <span>Nhận xét</span>
          <textarea
            rows={3}
            value={form.comment}
            onChange={(event) => onFormChange("comment", event.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn"
          />
        </label>
        <button type="submit" disabled={saving}>
          {authenticated ? (saving ? "Đang gửi..." : "Gửi đánh giá") : "Đăng nhập để đánh giá"}
        </button>
      </form>
      {message && <p className="review-message" role="status">{message}</p>}
      <div className="review-list" aria-live="polite">
        {loading && <p>Đang tải đánh giá...</p>}
        {!loading && reviews.length === 0 && <p>Chưa có đánh giá.</p>}
        {reviews.map((review) => (
          <article key={review.id}>
            <strong>{review.rating}/5 sao</strong>
            <p>{review.comment || "Không có nhận xét."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
