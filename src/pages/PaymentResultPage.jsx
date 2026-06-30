import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleX, Clock3, CreditCard, LoaderCircle, RefreshCw } from "lucide-react";
import { authApi, getStoredAuth, paymentsApi, userSubscriptionsApi } from "../services/api";
import { navigate } from "../router/navigation";
import {
  clearRememberedReturnTo,
  getRememberedReturnTo,
  getReturnToFromSearch,
} from "../router/returnIntent";
import "../styles/payment-result.css";

const MAX_STATUS_CHECKS = 12;
const STATUS_CHECK_DELAY = 2500;

function getOrderCode() {
  return new URLSearchParams(window.location.search).get("orderCode")?.trim() || "";
}

function getCallbackParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function classifyPayment(data) {
  if (data?.isPaid && data?.isActive) return "success";
  if (data?.isCancelled || data?.cancelled) return "cancelled";

  const paymentStatus = String(data?.paymentStatus ?? data?.status ?? "").toLowerCase();
  const subscriptionStatus = String(data?.subscriptionStatus ?? data?.subscription?.status ?? "").toLowerCase();

  if (["paid", "completed", "success", "succeeded"].includes(paymentStatus)) return "success";
  if (["cancelled", "canceled"].includes(paymentStatus)) return "cancelled";
  if (paymentStatus === "failed") return "failed";
  if (paymentStatus === "expired") return "expired";
  if (["active", "paid", "completed"].includes(subscriptionStatus)) return "success";
  if (subscriptionStatus === "failed") return "failed";
  if (subscriptionStatus === "expired") return "expired";
  return "pending";
}

function getView(status, expectedResult) {
  if (status === "success") {
    return {
      eyebrow: "Thanh toan hoan tat",
      title: "MediMate+ da san sang.",
      description: "Thanh toan da duoc xac nhan va quyen loi nang cao da duoc kich hoat cho tai khoan cua ban.",
      icon: CheckCircle2,
      tone: "success",
    };
  }
  if (status === "cancelled") {
    return {
      eyebrow: "Giao dich da dung",
      title: "Giao dich da duoc xac nhan huy.",
      description: "Backend da xac nhan thanh toan khong hoan tat. Tai khoan van giu nguyen goi hien tai va ban co the dang ky lai bat cu luc nao.",
      icon: CircleX,
      tone: "cancelled",
    };
  }
  if (status === "failed" || status === "expired") {
    return {
      eyebrow: status === "expired" ? "Giao dich da het han" : "Giao dich khong thanh cong",
      title: status === "expired" ? "Lien ket thanh toan da het han." : "Thanh toan chua hoan tat.",
      description: "Backend da tra ve trang thai cuoi cung khong thanh cong. Hay chon lai goi neu ban muon thu thanh toan moi.",
      icon: CircleX,
      tone: "error",
    };
  }
  if (status === "pending" || status === "checking") {
    return {
      eyebrow: "Dang xac minh giao dich",
      title: "Cho PayOS xac nhan mot chut.",
      description: expectedResult === "cancel"
        ? "MediMate dang kiem tra trang thai cuoi cung de bao dam giao dich da duoc huy chinh xac."
        : "Thanh toan co the da hoan tat nhung webhook van dang duoc xu ly. Trang se tu kiem tra lai.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }
  if (status === "missing") {
    return {
      eyebrow: "Thieu thong tin giao dich",
      title: "Khong tim thay ma thanh toan.",
      description: "Lien ket quay ve khong co ma giao dich. Ban co the mo bang gia de kiem tra goi hien tai hoac thu thanh toan lai.",
      icon: CreditCard,
      tone: "error",
    };
  }
  return {
    eyebrow: "Chua xac minh duoc",
    title: "Khong the kiem tra giao dich luc nay.",
    description: "Ket noi xac minh dang gian doan. Khong tao thanh toan moi cho den khi ban kiem tra lai trang thai goi.",
    icon: Clock3,
    tone: "error",
  };
}

function getStatusLabel(status) {
  if (status === "success") return "Da kich hoat";
  if (status === "cancelled") return "Da huy";
  if (status === "failed") return "That bai";
  if (status === "expired") return "Het han";
  return "Dang xac minh";
}

export default function PaymentResultPage({ expectedResult }) {
  const [orderCode] = useState(getOrderCode);
  const [status, setStatus] = useState(orderCode ? "checking" : "missing");
  const [message, setMessage] = useState("");
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [hasAuth] = useState(() => Boolean(getStoredAuth()));
  const [returnTo] = useState(() => getReturnToFromSearch() || getRememberedReturnTo());
  const [callbackParams] = useState(getCallbackParams);
  const view = getView(status, expectedResult);
  const Icon = view.icon;

  const refreshPremiumState = useCallback(async () => {
    if (!hasAuth) return;
    await userSubscriptionsApi.me();
    try {
      await authApi.refresh();
    } catch {
      // Subscription state is already refreshed even if token refresh is delayed.
    }
  }, [hasAuth]);

  const checkStatus = useCallback(async () => {
    if (!orderCode) {
      setStatus("missing");
      return "missing";
    }

    const response = expectedResult === "cancel"
      ? await paymentsApi.payOsCancel(callbackParams)
      : expectedResult === "return"
        ? await paymentsApi.payOsReturn(callbackParams)
        : await paymentsApi.payOsStatus(orderCode);
    const data = response.data ?? {};
    const nextStatus = classifyPayment(data);
    setStatus(nextStatus);
    setMessage(data.message || "");
    if (nextStatus === "success") await refreshPremiumState();
    return nextStatus;
  }, [callbackParams, expectedResult, orderCode, refreshPremiumState]);

  useEffect(() => {
    if (!orderCode) return undefined;
    let active = true;
    let timer;
    let attempts = 0;

    const verify = async () => {
      attempts += 1;
      try {
        const nextStatus = await checkStatus();
        if (!active || nextStatus !== "pending") return;
        if (attempts >= MAX_STATUS_CHECKS) {
          setStatus("error");
          setMessage("Giao dich van dang cho xu ly. Hay kiem tra lai goi dang ky sau it phut.");
          return;
        }
        timer = window.setTimeout(verify, STATUS_CHECK_DELAY);
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage("MediMate chua nhan duoc trang thai chinh thuc tu PayOS. Vui long kiem tra lai sau it phut.");
      }
    };

    verify();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkStatus, orderCode]);

  async function handleCheckAgain() {
    setCheckingAgain(true);
    setStatus("checking");
    try {
      await checkStatus();
    } catch {
      setStatus("error");
      setMessage("MediMate chua nhan duoc trang thai chinh thuc tu PayOS. Vui long kiem tra lai sau it phut.");
    } finally {
      setCheckingAgain(false);
    }
  }

  const success = status === "success";
  const settled = success || status === "cancelled" || status === "failed" || status === "expired";

  function continueAfterPayment() {
    if (success && returnTo) {
      clearRememberedReturnTo();
      navigate(returnTo);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <main className={`payment-result-page payment-result-${view.tone}`}>
      <div className="payment-result-glow" aria-hidden="true" />
      <a className="payment-result-brand" href="/">
        <span aria-hidden="true">+</span>
        <strong>MediMate AI</strong>
      </a>

      <section className="payment-result-card" aria-live="polite" aria-busy={status === "checking" || status === "pending"}>
        <div className={`payment-result-icon ${status === "checking" || status === "pending" ? "is-loading" : ""}`}>
          <Icon size={38} aria-hidden="true" />
        </div>
        <p className="payment-result-eyebrow">{view.eyebrow}</p>
        <h1>{view.title}</h1>
        <p className="payment-result-description">{message || view.description}</p>

        {orderCode && (
          <dl className="payment-result-reference">
            <div><dt>Ma giao dich</dt><dd>{orderCode}</dd></div>
            <div>
              <dt>Trang thai</dt>
              <dd>{getStatusLabel(status)}</dd>
            </div>
          </dl>
        )}

        <div className="payment-result-actions">
          {success ? (
            <>
              <button className="payment-result-primary" type="button" onClick={continueAfterPayment}>
                {returnTo ? "Tiep tuc tac vu" : "Bat dau su dung"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/pricing#current-subscription")}>Xem goi hien tai</button>
            </>
          ) : (
            <>
              <button className="payment-result-primary" type="button" onClick={() => navigate("/pricing")}>
                {settled ? "Chon lai goi" : "Ve bang gia"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}>Tiep tuc voi goi hien tai</button>
            </>
          )}
        </div>

        {!settled && orderCode && (
          <button className="payment-result-retry" type="button" onClick={handleCheckAgain} disabled={checkingAgain}>
            <RefreshCw className={checkingAgain ? "is-spinning" : ""} size={16} />
            {checkingAgain ? "Dang kiem tra..." : "Kiem tra lai trang thai"}
          </button>
        )}
      </section>

      <p className="payment-result-support">
        {status === "cancelled"
          ? "Giao dich da duoc backend xac nhan huy va goi hien tai cua ban khong thay doi. Ban co the dong trang hoac chon lai goi."
          : "Khong dong trinh duyet trong luc xac minh. Neu tien da tru nhung goi chua kich hoat, hay giu lai ma giao dich de lien he ho tro."}
      </p>
    </main>
  );
}
