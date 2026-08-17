import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FlaskConical,
  Languages,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useFeedback } from "../feedback/feedbackContext";
import { navigate } from "../../router/navigation";
import {
  getLabIndicatorApiMessage,
  LAB_INDICATOR_MESSAGES,
  labIndicatorsApi,
} from "../../services/api";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../ui";
import { LabIndicatorChildDialog, LabIndicatorFormDialog } from "./LabIndicatorDialogs";
import AdminPagination from "../admin/AdminPagination";
import "../../styles/admin/lab-indicators.css";

const DEFAULT_PAGE_SIZE = 10;
const LIST_PATH = "/app/admin/lab-indicators";

const GENDER_LABELS = { male: "Nam", female: "Nữ" };
const AGE_GROUP_LABELS = { child: "Trẻ em", adult: "Người lớn" };
const COMPARISON_LABELS = {
  between: "Trong khoảng",
  lessThanOrEqual: "Nhỏ hơn hoặc bằng",
  greaterThanOrEqual: "Lớn hơn hoặc bằng",
};
const STATUS_LABELS = {
  unknown: "Chưa xác định",
  normal: "Bình thường",
  high: "Cao",
  low: "Thấp",
  criticalHigh: "Cao nguy cấp",
  criticalLow: "Thấp nguy cấp",
};

function getIndicatorDetailFailure(error) {
  if (error?.status === 400) return LAB_INDICATOR_MESSAGES.indicator.invalidId;
  if (error?.status === 404) return LAB_INDICATOR_MESSAGES.indicator.notFound;
  return "Không thể tải chi tiết chỉ số xét nghiệm.";
}

function getChildMessages(kind) {
  if (kind === "alias") return LAB_INDICATOR_MESSAGES.alias;
  if (kind === "range") return LAB_INDICATOR_MESSAGES.range;
  return LAB_INDICATOR_MESSAGES.advice;
}

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
}

function unwrapList(response) {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getIndicatorId(indicator) {
  return indicator?.indicatorId ?? indicator?.id ?? "";
}

function getAliasId(alias) {
  return alias?.aliasId ?? alias?.id ?? "";
}

function getRangeId(range) {
  return range?.referenceRangeId ?? range?.rangeId ?? range?.id ?? "";
}

function getAdviceId(advice) {
  return advice?.cacheId ?? advice?.adviceId ?? advice?.id ?? "";
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(numeric)
    : String(value);
}

function formatIndicatorReference(indicator) {
  const minimum = formatNumber(indicator?.minReference);
  const maximum = formatNumber(indicator?.maxReference);
  const value =
    minimum === "—" && maximum === "—"
      ? "Chưa cấu hình"
      : `${minimum} – ${maximum}`;
  return indicator?.unit ? `${value} ${indicator.unit}` : value;
}

function formatRangeValue(range) {
  const minimum = formatNumber(range?.minValue);
  const maximum = formatNumber(range?.maxValue);
  let value = `${minimum} – ${maximum}`;

  if (range?.comparisonType === "lessThanOrEqual") value = `≤ ${maximum}`;
  if (range?.comparisonType === "greaterThanOrEqual") value = `≥ ${minimum}`;
  if (minimum === "—" && maximum === "—") value = "Chưa cấu hình";

  return range?.unit ? `${value} ${range.unit}` : value;
}

function ApiMessage({ message }) {
  if (!message) return null;

  return (
    <div
      className={`api-message ${message.type}`}
      role={message.type === "error" ? "alert" : "status"}
      aria-live={message.type === "error" ? "assertive" : "polite"}
    >
      {message.text}
    </div>
  );
}

function RowActions({ label, onView, onEdit, onDelete }) {
  return (
    <div
      className={`record-actions lab-row-actions ${onView ? "lab-row-actions--three" : "lab-row-actions--two"}`}
      aria-label={`Thao tác với ${label}`}
    >
      {onView && (
        <button
          className="btn btn-ghost btn-small"
          type="button"
          onClick={onView}
          aria-label={`Xem chi tiết ${label}`}
        >
          <Eye size={15} aria-hidden="true" />
          Xem
        </button>
      )}

      <button
        className="btn btn-ghost btn-small"
        type="button"
        onClick={onEdit}
        aria-label={`Sửa ${label}`}
      >
        <Pencil size={15} aria-hidden="true" />
        Sửa
      </button>

      <button
        className="btn btn-dark btn-small lab-delete-button"
        type="button"
        onClick={onDelete}
        aria-label={`Xóa ${label}`}
      >
        <Trash2 size={15} aria-hidden="true" />
        Xóa
      </button>
    </div>
  );
}

function IndicatorListView() {
  const { confirmAction, showToast } = useFeedback();
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const dialogTriggerRef = useRef(null);

  const loadIndicators = useCallback(async (pageNumber, pageSize, searchValue) => {
    setStatus("loading");
    setError("");

    try {
      const response = await labIndicatorsApi.list(pageNumber, pageSize, {
        search: searchValue,
      });
      const data = unwrapData(response) ?? {};

      setItems(Array.isArray(data.items) ? data.items : []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(1, data.totalPages ?? 1),
      });
      setStatus("ready");
    } catch (loadError) {
      setError(
        getLabIndicatorApiMessage(
          loadError,
          "Không thể tải danh sách chỉ số xét nghiệm.",
        ),
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadIndicators(1, DEFAULT_PAGE_SIZE, "");
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadIndicators]);

  function rememberTrigger() {
    dialogTriggerRef.current = document.activeElement;
  }

  function openCreate() {
    rememberTrigger();
    setDialog({ mode: "create", indicator: null });
  }

  function openEdit(indicator) {
    rememberTrigger();
    setDialog({ mode: "edit", indicator });
  }

  async function submitIndicator(payload) {
    setSaving(true);
    setMessage(null);

    try {
      const response =
        dialog.mode === "edit"
          ? await labIndicatorsApi.update(
              getIndicatorId(dialog.indicator),
              payload,
            )
          : await labIndicatorsApi.create(payload);

      const text = getLabIndicatorApiMessage(
        response,
        dialog.mode === "edit"
          ? LAB_INDICATOR_MESSAGES.indicator.updateSuccess
          : LAB_INDICATOR_MESSAGES.indicator.createSuccess,
      );

      setMessage({ type: "success", text });
      showToast({
        type: "success",
        title:
          dialog.mode === "edit"
            ? "Đã cập nhật chỉ số"
            : "Đã tạo chỉ số",
        message: text,
      });
      setDialog(null);

      await loadIndicators(
        pageInfo.pageNumber,
        pageInfo.pageSize,
        appliedSearch,
      );

      return { success: true, message: text };
    } catch (saveError) {
      const text = getLabIndicatorApiMessage(
        saveError,
        dialog.mode === "edit"
          ? LAB_INDICATOR_MESSAGES.indicator.updateFailure
          : LAB_INDICATOR_MESSAGES.indicator.createFailure,
      );

      showToast({
        type: "error",
        title: "Không lưu được chỉ số",
        message: text,
      });

      return { success: false, message: text };
    } finally {
      setSaving(false);
    }
  }

  async function deleteIndicator(indicator) {
    const name = indicator.fullName || indicator.symbol || "Chỉ số này";
    const confirmed = await confirmAction({
      title: "Xóa chỉ số xét nghiệm?",
      message: `${name} và dữ liệu liên quan có thể bị ảnh hưởng. Hãy xác nhận trước khi tiếp tục.`,
      confirmLabel: "Xóa chỉ số",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await labIndicatorsApi.remove(
        getIndicatorId(indicator),
      );
      const text = getLabIndicatorApiMessage(
        response,
        LAB_INDICATOR_MESSAGES.indicator.deleteSuccess,
      );

      showToast({
        type: "success",
        title: "Đã xóa chỉ số",
        message: text,
      });
      setMessage({ type: "success", text });

      const targetPage =
        items.length === 1 && pageInfo.pageNumber > 1
          ? pageInfo.pageNumber - 1
          : pageInfo.pageNumber;

      await loadIndicators(targetPage, pageInfo.pageSize, appliedSearch);
    } catch (deleteError) {
      const text = getLabIndicatorApiMessage(
        deleteError,
        LAB_INDICATOR_MESSAGES.indicator.deleteFailure,
      );

      setMessage({ type: "error", text });
      showToast({
        type: "error",
        title: "Không xóa được chỉ số",
        message: text,
      });
    }
  }

  function applySearch(event) {
    event.preventDefault();
    const nextSearch = search.trim();

    setAppliedSearch(nextSearch);
    void loadIndicators(1, pageInfo.pageSize, nextSearch);
  }

  function clearSearch() {
    setSearch("");
    setAppliedSearch("");
    void loadIndicators(1, pageInfo.pageSize, "");
  }

  const columns = [
    {
      key: "indicator",
      header: "Chỉ số",
      render: (indicator) => {
        const indicatorId = getIndicatorId(indicator);

        return (
          <a
            className="lab-indicator-link"
            href={`${LIST_PATH}/${encodeURIComponent(indicatorId)}`}
          >
            <span>{indicator.symbol || "—"}</span>
            <strong>
              {indicator.fullName || "Chưa có tên đầy đủ"}
            </strong>
          </a>
        );
      },
    },
    {
      key: "description",
      header: "Mô tả",
      render: (indicator) => (
        <span
          className={`lab-indicator-description ${
            indicator.description ? "" : "is-empty"
          }`}
          aria-label={indicator.description ? undefined : "Chưa có mô tả"}
        >
          {indicator.description || "—"}
        </span>
      ),
    },
    {
      key: "unit",
      header: "Đơn vị",
      render: (indicator) => (
        <span
          className={`lab-indicator-unit ${
            indicator.unit ? "" : "is-empty"
          }`}
          aria-label={indicator.unit ? undefined : "Chưa cấu hình đơn vị"}
        >
          {indicator.unit || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (indicator) => (
        <span
          className={`status-pill ${
            indicator.isActive === false ? "neutral" : ""
          }`}
        >
          {indicator.isActive === false ? "Tạm ẩn" : "Đang dùng"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (indicator) => {
        const label =
          indicator.fullName || indicator.symbol || "chỉ số";

        return (
          <RowActions
            label={label}
            onView={() =>
              navigate(
                `${LIST_PATH}/${encodeURIComponent(
                  getIndicatorId(indicator),
                )}`,
              )
            }
            onEdit={() => openEdit(indicator)}
            onDelete={() => deleteIndicator(indicator)}
          />
        );
      },
    },
  ];

  return (
    <section
      className="admin-panel lab-indicator-panel lab-indicator-list"
      aria-labelledby="admin-lab-indicators-title"
    >
      <header className="lab-page-heading">
        <div className="lab-page-heading-copy">
          <p className="eyebrow">Danh mục xét nghiệm</p>
          <h2 id="admin-lab-indicators-title">
            Chỉ số xét nghiệm trong hệ thống
          </h2>
          <p>
            Quản lý thông tin chỉ số và mở trang chi tiết để cấu hình
            bí danh, khoảng tham chiếu và lời khuyên.
          </p>
        </div>

        <div className="lab-page-heading-actions">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            onClick={() =>
              loadIndicators(
                pageInfo.pageNumber,
                pageInfo.pageSize,
                appliedSearch,
              )
            }
          >
            <RefreshCw size={15} aria-hidden="true" />
            Tải lại
          </button>

          <button
            className="btn btn-primary btn-small lab-create-button"
            type="button"
            onClick={openCreate}
          >
            <Plus size={15} aria-hidden="true" />
            Tạo chỉ số
          </button>
        </div>
      </header>

      <ApiMessage message={message} />

      <section
        className="lab-filter-card"
        aria-labelledby="lab-filter-title"
      >
        <div>
          <Search size={18} aria-hidden="true" />
          <div>
            <h3 id="lab-filter-title">Tìm trong danh mục</h3>
            <p>
              Tìm theo ký hiệu, tên đầy đủ, mô tả hoặc nhóm chỉ số.
            </p>
          </div>
        </div>

        <form className="lab-filter-form" onSubmit={applySearch}>
          <label className="sr-only" htmlFor="lab-indicator-search">Từ khóa tìm kiếm</label>
          <input
            id="lab-indicator-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ví dụ: WBC hoặc huyết học"
          />
          <Button type="submit" size="sm">
            Tìm kiếm
          </Button>
          <Button
            type="button"
            tone="secondary"
            size="sm"
            onClick={clearSearch}
            disabled={!search && !appliedSearch}
          >
            Xóa lọc
          </Button>
        </form>
      </section>

      <div
        className="lab-result-summary"
        role="status"
        aria-live="polite"
      >
        <span>{pageInfo.totalCount} chỉ số</span>
        {appliedSearch && (
          <small>Kết quả cho “{appliedSearch}”</small>
        )}
      </div>

      {status === "loading" && (
        <LoadingState label="Đang tải chỉ số xét nghiệm…" />
      )}

      {status === "error" && (
        <ErrorState
          title="Không thể tải chỉ số xét nghiệm"
          description={error}
          action={
            <Button
              onClick={() =>
                loadIndicators(
                  pageInfo.pageNumber,
                  pageInfo.pageSize,
                  appliedSearch,
                )
              }
            >
              Thử lại
            </Button>
          }
          urgent
        />
      )}

      {status === "ready" && (
        <DataTable
          className="lab-indicator-table"
          caption="Danh sách chỉ số xét nghiệm"
          columns={columns}
          rows={items}
          getRowKey={getIndicatorId}
          rowHeaderKey="indicator"
          emptyState={
            <EmptyState
              icon={<FlaskConical size={22} />}
              title="Chưa có chỉ số phù hợp"
              description={
                appliedSearch
                  ? "Hãy đổi từ khóa hoặc xóa bộ lọc."
                  : "Tạo chỉ số đầu tiên để bắt đầu cấu hình dữ liệu xét nghiệm."
              }
              action={
                <Button
                  onClick={appliedSearch ? clearSearch : openCreate}
                >
                  {appliedSearch ? "Xóa bộ lọc" : "Tạo chỉ số"}
                </Button>
              }
            />
          }
        />
      )}

      {status === "ready" && pageInfo.totalPages > 1 && (
        <AdminPagination
          ariaLabel="Phân trang chỉ số xét nghiệm"
          currentPage={pageInfo.pageNumber}
          totalPages={pageInfo.totalPages}
          totalCount={pageInfo.totalCount}
          pageSize={pageInfo.pageSize}
          itemCount={items.length}
          itemLabel="chỉ số"
          onPageChange={(nextPage) => loadIndicators(nextPage, pageInfo.pageSize, appliedSearch)}
        />
      )}

      {dialog && (
        <LabIndicatorFormDialog
          key={`${dialog.mode}-${
            getIndicatorId(dialog.indicator) || "new"
          }`}
          indicator={dialog.indicator}
          saving={saving}
          restoreFocusRef={dialogTriggerRef}
          onClose={() => {
            if (!saving) setDialog(null);
          }}
          onSubmit={submitIndicator}
        />
      )}
    </section>
  );
}

function DetailCollection({
  icon,
  title,
  description,
  addLabel,
  error,
  columns,
  rows,
  getRowKey,
  onAdd,
  emptyTitle,
}) {
  const sectionId = `lab-${title
    .toLowerCase()
    .replaceAll(" ", "-")}-title`;

  return (
    <section
      className="lab-detail-collection"
      aria-labelledby={sectionId}
    >
      <header>
        <div>
          <span aria-hidden="true">{icon}</span>
          <div>
            <h3 id={sectionId}>{title}</h3>
            <p>{description}</p>
          </div>
        </div>

        <Button size="sm" onClick={onAdd}>
          <Plus size={15} aria-hidden="true" />
          {addLabel}
        </Button>
      </header>

      {error ? (
        <ErrorState
          title={`Không thể tải ${title.toLowerCase()}`}
          description={error}
        />
      ) : (
        <DataTable
          className="lab-child-table"
          caption={title}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          emptyState={
            <EmptyState
              title={emptyTitle}
              description={`Chọn “${addLabel}” để bổ sung dữ liệu cho chỉ số này.`}
            />
          }
        />
      )}
    </section>
  );
}

function IndicatorDetailView({ indicatorId }) {
  const { confirmAction, showToast } = useFeedback();
  const [indicator, setIndicator] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [childDialog, setChildDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const dialogTriggerRef = useRef(null);

  const loadDetail = useCallback(async () => {
    setStatus("loading");
    setError("");
    setSectionErrors({});

    const results = await Promise.allSettled([
      labIndicatorsApi.get(indicatorId),
      labIndicatorsApi.listAliases(indicatorId),
      labIndicatorsApi.listReferenceRanges(indicatorId),
      labIndicatorsApi.listAdvice(indicatorId),
    ]);

    if (results[0].status === "rejected") {
      setError(
        getLabIndicatorApiMessage(
          results[0].reason,
          getIndicatorDetailFailure(results[0].reason),
        ),
      );
      setStatus("error");
      return;
    }

    setIndicator(unwrapData(results[0].value));

    const nextErrors = {};

    if (results[1].status === "fulfilled") {
      setAliases(unwrapList(results[1].value));
    } else {
      setAliases([]);
      nextErrors.alias = getLabIndicatorApiMessage(
        results[1].reason,
        LAB_INDICATOR_MESSAGES.alias.listFailure,
      );
    }

    if (results[2].status === "fulfilled") {
      setRanges(unwrapList(results[2].value));
    } else {
      setRanges([]);
      nextErrors.range = getLabIndicatorApiMessage(
        results[2].reason,
        LAB_INDICATOR_MESSAGES.range.listFailure,
      );
    }

    if (results[3].status === "fulfilled") {
      setAdvice(unwrapList(results[3].value));
    } else {
      setAdvice([]);
      nextErrors.advice = getLabIndicatorApiMessage(
        results[3].reason,
        LAB_INDICATOR_MESSAGES.advice.listFailure,
      );
    }

    setSectionErrors(nextErrors);
    setStatus("ready");
  }, [indicatorId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadDetail]);

  function rememberTrigger() {
    dialogTriggerRef.current = document.activeElement;
  }

  function openIndicatorEdit() {
    rememberTrigger();
    setIndicatorDialogOpen(true);
  }

  function openChild(kind, item = null) {
    rememberTrigger();
    setChildDialog({ kind, item });
  }

  async function submitIndicator(payload) {
    setSaving(true);

    try {
      const response = await labIndicatorsApi.update(
        indicatorId,
        payload,
      );
      const text = getLabIndicatorApiMessage(
        response,
        LAB_INDICATOR_MESSAGES.indicator.updateSuccess,
      );

      showToast({
        type: "success",
        title: "Đã cập nhật chỉ số",
        message: text,
      });
      setMessage({ type: "success", text });
      setIndicatorDialogOpen(false);

      await loadDetail();

      return { success: true, message: text };
    } catch (saveError) {
      const text = getLabIndicatorApiMessage(
        saveError,
        LAB_INDICATOR_MESSAGES.indicator.updateFailure,
      );

      showToast({
        type: "error",
        title: "Không cập nhật được chỉ số",
        message: text,
      });

      return { success: false, message: text };
    } finally {
      setSaving(false);
    }
  }

  async function deleteIndicator() {
    const confirmed = await confirmAction({
      title: "Xóa chỉ số xét nghiệm?",
      message: `${
        indicator?.fullName ||
        indicator?.symbol ||
        "Chỉ số này"
      } sẽ bị xóa khỏi danh mục. Chỉ số có thể không xóa được nếu đang được sử dụng.`,
      confirmLabel: "Xóa chỉ số",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await labIndicatorsApi.remove(indicatorId);
      const text = getLabIndicatorApiMessage(
        response,
        LAB_INDICATOR_MESSAGES.indicator.deleteSuccess,
      );

      showToast({
        type: "success",
        title: "Đã xóa chỉ số",
        message: text,
      });
      navigate(LIST_PATH);
    } catch (deleteError) {
      const text = getLabIndicatorApiMessage(
        deleteError,
        LAB_INDICATOR_MESSAGES.indicator.deleteFailure,
      );

      setMessage({ type: "error", text });
      showToast({
        type: "error",
        title: "Không xóa được chỉ số",
        message: text,
      });
    }
  }

  async function submitChild(payload) {
    const { kind, item } = childDialog;
    const editing = Boolean(item);

    setSaving(true);

    try {
      let response;

      if (kind === "alias") {
        response = editing
          ? await labIndicatorsApi.updateAlias(
              indicatorId,
              getAliasId(item),
              payload,
            )
          : await labIndicatorsApi.createAlias(
              indicatorId,
              payload,
            );
      } else if (kind === "range") {
        response = editing
          ? await labIndicatorsApi.updateReferenceRange(
              indicatorId,
              getRangeId(item),
              payload,
            )
          : await labIndicatorsApi.createReferenceRange(
              indicatorId,
              payload,
            );
      } else {
        response = editing
          ? await labIndicatorsApi.updateAdvice(
              indicatorId,
              getAdviceId(item),
              payload,
            )
          : await labIndicatorsApi.createAdvice(
              indicatorId,
              payload,
            );
      }

      const childMessages = getChildMessages(kind);
      const text = getLabIndicatorApiMessage(
        response,
        editing
          ? childMessages.updateSuccess
          : childMessages.createSuccess,
      );

      showToast({
        type: "success",
        title: editing
          ? "Đã cập nhật dữ liệu"
          : "Đã thêm dữ liệu",
        message: text,
      });
      setMessage({ type: "success", text });
      setChildDialog(null);

      await loadDetail();

      return { success: true, message: text };
    } catch (saveError) {
      const childMessages = getChildMessages(kind);
      const text = getLabIndicatorApiMessage(
        saveError,
        editing
          ? childMessages.updateFailure
          : childMessages.createFailure,
      );

      showToast({
        type: "error",
        title: "Không lưu được dữ liệu",
        message: text,
      });

      return { success: false, message: text };
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild(kind, item) {
    const labels = {
      alias: "bí danh",
      range: "khoảng tham chiếu",
      advice: "lời khuyên",
    };

    const confirmed = await confirmAction({
      title: `Xóa ${labels[kind]}?`,
      message: `Mục này sẽ bị xóa khỏi chỉ số ${
        indicator?.symbol ||
        indicator?.fullName ||
        "hiện tại"
      }.`,
      confirmLabel: "Xóa",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      let response;

      if (kind === "alias") {
        response = await labIndicatorsApi.removeAlias(
          indicatorId,
          getAliasId(item),
        );
      } else if (kind === "range") {
        response = await labIndicatorsApi.removeReferenceRange(
          indicatorId,
          getRangeId(item),
        );
      } else {
        response = await labIndicatorsApi.removeAdvice(
          indicatorId,
          getAdviceId(item),
        );
      }

      const text = getLabIndicatorApiMessage(
        response,
        getChildMessages(kind).deleteSuccess,
      );

      showToast({
        type: "success",
        title: "Đã xóa dữ liệu",
        message: text,
      });
      setMessage({ type: "success", text });

      await loadDetail();
    } catch (deleteError) {
      const text = getLabIndicatorApiMessage(
        deleteError,
        getChildMessages(kind).deleteFailure,
      );

      setMessage({ type: "error", text });
      showToast({
        type: "error",
        title: "Không xóa được dữ liệu",
        message: text,
      });
    }
  }

  const aliasColumns = [
    {
      key: "aliasText",
      header: "Bí danh",
      render: (item) => <strong>{item.aliasText || "—"}</strong>,
    },
    {
      key: "language",
      header: "Ngôn ngữ",
      render: (item) => item.language || "Chưa xác định",
    },
    {
      key: "isPrimary",
      header: "Ưu tiên",
      render: (item) =>
        item.isPrimary ? (
          <span className="status-pill">Tên chính</span>
        ) : (
          "Tên phụ"
        ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <RowActions
          label={item.aliasText || "bí danh"}
          onEdit={() => openChild("alias", item)}
          onDelete={() => deleteChild("alias", item)}
        />
      ),
    },
  ];

  const rangeColumns = [
    {
      key: "audience",
      header: "Đối tượng",
      render: (item) =>
        `${GENDER_LABELS[item.gender] || item.gender || "—"} · ${
          AGE_GROUP_LABELS[item.ageGroup] ||
          item.ageGroup ||
          "—"
        }`,
    },
    {
      key: "comparison",
      header: "So sánh",
      render: (item) =>
        COMPARISON_LABELS[item.comparisonType] ||
        item.comparisonType ||
        "—",
    },
    {
      key: "value",
      header: "Giá trị",
      render: formatRangeValue,
    },
    {
      key: "priority",
      header: "Ưu tiên",
      render: (item) => item.priority ?? 0,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <RowActions
          label="khoảng tham chiếu"
          onEdit={() => openChild("range", item)}
          onDelete={() => deleteChild("range", item)}
        />
      ),
    },
  ];

  const adviceColumns = [
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <span className="status-pill neutral">
          {STATUS_LABELS[item.status] || item.status || "—"}
        </span>
      ),
    },
    {
      key: "displayTitle",
      header: "Nội dung",
      render: (item) => (
        <div className="lab-advice-copy">
          <strong>
            {item.displayTitle || "Chưa có tiêu đề"}
          </strong>
          <small>{item.summary || "Chưa có tóm tắt"}</small>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <RowActions
          label={item.displayTitle || "lời khuyên"}
          onEdit={() => openChild("advice", item)}
          onDelete={() => deleteChild("advice", item)}
        />
      ),
    },
  ];

  if (status === "loading") {
    return (
      <LoadingState label="Đang tải chi tiết chỉ số xét nghiệm…" />
    );
  }

  if (status === "error") {
    return (
      <section className="admin-panel lab-indicator-panel">
        <a className="lab-back-link" href={LIST_PATH}>
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách
        </a>

        <ErrorState
          title="Không thể tải chi tiết chỉ số"
          description={error}
          action={<Button onClick={loadDetail}>Thử lại</Button>}
          urgent
        />
      </section>
    );
  }

  return (
    <section
      className="admin-panel lab-indicator-panel lab-indicator-detail"
      aria-labelledby="lab-detail-title"
    >
      <a className="lab-back-link" href={LIST_PATH}>
        <ArrowLeft size={16} aria-hidden="true" />
        Quay lại danh sách chỉ số
      </a>

      <header className="lab-detail-hero">
        <div className="lab-detail-symbol" aria-hidden="true">
          <FlaskConical size={26} />
        </div>

        <div>
          <p className="eyebrow">Chi tiết chỉ số xét nghiệm</p>
          <h2 id="lab-detail-title">
            <span>{indicator?.symbol || "—"}</span>{" "}
            {indicator?.fullName || "Chưa có tên đầy đủ"}
          </h2>
          <p>
            {indicator?.description ||
              "Chỉ số này chưa có mô tả."}
          </p>

          <div className="lab-detail-meta">
            <span>
              {indicator?.category || "Chưa phân nhóm"}
            </span>
            <span>{formatIndicatorReference(indicator)}</span>
            <span
              className={`status-pill ${
                indicator?.isActive === false ? "neutral" : ""
              }`}
            >
              {indicator?.isActive === false
                ? "Tạm ẩn"
                : "Đang dùng"}
            </span>
          </div>
        </div>

        <div className="lab-detail-actions">
          <Button tone="secondary" onClick={openIndicatorEdit}>
            <Pencil size={16} aria-hidden="true" />
            Sửa chỉ số
          </Button>
          <Button tone="danger" onClick={deleteIndicator}>
            <Trash2 size={16} aria-hidden="true" />
            Xóa chỉ số
          </Button>
        </div>
      </header>

      <ApiMessage message={message} />

      <div
        className="lab-detail-stats"
        aria-label="Tóm tắt dữ liệu liên quan"
      >
        <article>
          <Languages size={18} aria-hidden="true" />
          <span>
            <strong>{aliases.length}</strong>
            <small>Bí danh</small>
          </span>
        </article>

        <article>
          <Ruler size={18} aria-hidden="true" />
          <span>
            <strong>{ranges.length}</strong>
            <small>Khoảng tham chiếu</small>
          </span>
        </article>

        <article>
          <Sparkles size={18} aria-hidden="true" />
          <span>
            <strong>{advice.length}</strong>
            <small>Lời khuyên</small>
          </span>
        </article>

        <article>
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>
            <strong>{indicator?.unit || "—"}</strong>
            <small>Đơn vị mặc định</small>
          </span>
        </article>
      </div>

      <DetailCollection
        icon={<Languages size={18} />}
        title="Bí danh"
        description="Các tên gọi thay thế của chỉ số theo ngôn ngữ."
        addLabel="Tạo bí danh"
        error={sectionErrors.alias}
        columns={aliasColumns}
        rows={aliases}
        getRowKey={getAliasId}
        onAdd={() => openChild("alias")}
        emptyTitle="Chưa có bí danh"
      />

      <DetailCollection
        icon={<Ruler size={18} />}
        title="Khoảng tham chiếu"
        description="Ngưỡng theo giới tính, nhóm tuổi và kiểu so sánh."
        addLabel="Tạo khoảng"
        error={sectionErrors.range}
        columns={rangeColumns}
        rows={ranges}
        getRowKey={getRangeId}
        onAdd={() => openChild("range")}
        emptyTitle="Chưa có khoảng tham chiếu"
      />

      <DetailCollection
        icon={<Sparkles size={18} />}
        title="Lời khuyên"
        description="Nội dung hướng dẫn theo trạng thái kết quả xét nghiệm."
        addLabel="Tạo lời khuyên"
        error={sectionErrors.advice}
        columns={adviceColumns}
        rows={advice}
        getRowKey={getAdviceId}
        onAdd={() => openChild("advice")}
        emptyTitle="Chưa có lời khuyên"
      />

      {indicatorDialogOpen && (
        <LabIndicatorFormDialog
          indicator={indicator}
          saving={saving}
          restoreFocusRef={dialogTriggerRef}
          onClose={() => {
            if (!saving) setIndicatorDialogOpen(false);
          }}
          onSubmit={submitIndicator}
        />
      )}

      {childDialog && (
        <LabIndicatorChildDialog
          key={`${childDialog.kind}-${
            getAliasId(childDialog.item) ||
            getRangeId(childDialog.item) ||
            getAdviceId(childDialog.item) ||
            "new"
          }`}
          kind={childDialog.kind}
          item={childDialog.item}
          saving={saving}
          restoreFocusRef={dialogTriggerRef}
          onClose={() => {
            if (!saving) setChildDialog(null);
          }}
          onSubmit={submitChild}
        />
      )}
    </section>
  );
}

export default function AdminLabIndicatorsSection({
  indicatorId = "",
}) {
  return indicatorId ? (
    <IndicatorDetailView indicatorId={indicatorId} />
  ) : (
    <IndicatorListView />
  );
}
