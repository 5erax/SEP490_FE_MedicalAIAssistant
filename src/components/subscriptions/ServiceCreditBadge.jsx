import { Coins, LoaderCircle, RefreshCw } from "lucide-react";
import { withReturnTo } from "../../router/returnIntent";
import { useServiceCredit } from "../../state/useServiceCredit";

function getCurrentLocation() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function ServiceCreditBadge() {
  const { balance, status, error, refresh } = useServiceCredit();

  if (status === "idle") return null;

  if (status === "loading" && !balance) {
    return (
      <span className="service-credit-badge is-loading" role="status" aria-label="Đang tải số lượt sử dụng">
        <LoaderCircle className="service-credit-badge-spinner" size={17} aria-hidden="true" />
        <span className="service-credit-badge-label">Đang tải lượt</span>
      </span>
    );
  }

  if (status === "error" && !balance) {
    return (
      <button
        className="service-credit-badge is-error"
        type="button"
        title={error?.message || "Chưa thể tải số lượt sử dụng"}
        aria-label="Chưa thể tải số lượt sử dụng. Thử lại"
        onClick={() => void refresh()}
      >
        <RefreshCw size={17} aria-hidden="true" />
        <span className="service-credit-badge-label">Tải lại lượt</span>
      </button>
    );
  }

  if (!balance) return null;

  const remainingCount = Math.max(0, Number(balance.remainingCount) || 0);
  const reservedCount = Math.max(0, Number(balance.reservedCount) || 0);
  const destination = withReturnTo("/pricing?view=upgrade", getCurrentLocation());
  const reservedDescription = reservedCount > 0 ? ` Có ${reservedCount} lượt đang được giữ cho tác vụ đang xử lý.` : "";

  return (
    <a
      className={`service-credit-badge${remainingCount === 0 ? " is-empty" : ""}`}
      href={destination}
      title={`Còn ${remainingCount} lượt sử dụng${reservedCount > 0 ? ` · ${reservedCount} lượt đang xử lý` : ""}`}
      aria-label={`Còn ${remainingCount} lượt dịch vụ.${reservedDescription} Mở trang mua thêm lượt.`}
    >
      <Coins size={17} aria-hidden="true" />
      <strong>{remainingCount}</strong>
      <span className="service-credit-badge-label">lượt</span>
      {reservedCount > 0 && (
        <small className="service-credit-badge-reserved">{reservedCount} đang xử lý</small>
      )}
    </a>
  );
}
