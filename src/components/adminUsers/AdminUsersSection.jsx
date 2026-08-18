import { useState } from "react";
import {
  ListFilter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserX,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  CustomSelect,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PAGE_SIZE_OPTIONS,
} from "../ui";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả tài khoản" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "deleted", label: "Đã vô hiệu hóa" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Tên: A → Z" },
  { value: "name-desc", label: "Tên: Z → A" },
  { value: "email-asc", label: "Email: A → Z" },
  { value: "email-desc", label: "Email: Z → A" },
  { value: "status-asc", label: "Trạng thái: hoạt động trước" },
  { value: "status-desc", label: "Trạng thái: vô hiệu hóa trước" },
];

export default function AdminUsersSection({
  error,
  isApproved,
  loading,
  message,
  onDelete,
  onRestore,
  onReload,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
  pageInfo,
  pendingCount,
  rows,
  search,
  searchSuggestions = [],
  sortValue,
  statusFilter,
  statusLabel,
  totalVisibleCount,
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const showSuggestions = Boolean(
    searchFocused
    && search.trim()
    && searchSuggestions.length,
  );

  function chooseSuggestion(suggestion) {
    onSearchChange(suggestion.value);
    setHighlightedSuggestion(-1);
    setSearchFocused(false);
  }

  function handleSearchKeyDown(event) {
    if (!searchSuggestions.length) {
      if (event.key === "Escape") setSearchFocused(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchFocused(true);
      setHighlightedSuggestion((current) => (
        current >= searchSuggestions.length - 1 ? 0 : current + 1
      ));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchFocused(true);
      setHighlightedSuggestion((current) => (
        current <= 0 ? searchSuggestions.length - 1 : current - 1
      ));
      return;
    }

    if (event.key === "Enter" && showSuggestions && highlightedSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(searchSuggestions[highlightedSuggestion]);
      return;
    }

    if (event.key === "Escape") {
      setSearchFocused(false);
      setHighlightedSuggestion(-1);
    }
  }

  return (
    <section className="admin-panel admin-users-panel" aria-labelledby="admin-users-title">
      <header className="admin-users-heading">
        <div className="admin-users-heading-copy">
          <p className="eyebrow">Quản trị tài khoản</p>
          <h2 id="admin-users-title">Người dùng trong hệ thống</h2>
          <p>
            Tìm kiếm, sắp xếp, kiểm tra trạng thái và thực hiện thao tác với những
            tài khoản được phép quản lý.
          </p>
        </div>

        <div className="admin-users-heading-actions">
          <span className="admin-users-protection-note">
            <ShieldCheck size={17} aria-hidden="true" />
            Tài khoản hệ thống được bảo vệ
          </span>
          <Button
            tone="secondary"
            size="sm"
            className="admin-users-reload"
            onClick={onReload}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Tải lại
          </Button>
        </div>
      </header>

      {message && (
        <div className={`api-message ${message.type}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <AdminFilterDisclosure
        className="admin-users-filter-card"
        description="Tìm kiếm, trạng thái, sắp xếp và số tài khoản hiển thị."
        headingClassName="admin-users-filter-heading"
        icon={<ListFilter size={18} />}
        summary={`${statusLabel} · ${pageInfo.totalCount} kết quả`}
        title="Bộ lọc tài khoản"
        titleId="admin-users-filter-title"
      >
        <div className="admin-toolbar admin-users-toolbar admin-users-toolbar--enhanced">
          <div className="clean-field admin-users-search-field">
            <label htmlFor="admin-users-search">Tìm tài khoản</label>
            <div className="admin-users-search-combobox">
              <span className="admin-users-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  id="admin-users-search"
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls="admin-users-search-suggestions"
                  aria-activedescendant={
                    showSuggestions && highlightedSuggestion >= 0
                      ? `admin-users-suggestion-${highlightedSuggestion}`
                      : undefined
                  }
                  autoComplete="off"
                  value={search}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={handleSearchKeyDown}
                  onChange={(event) => {
                    onSearchChange(event.target.value);
                    setSearchFocused(true);
                    setHighlightedSuggestion(-1);
                  }}
                  placeholder="Tên, email hoặc ID"
                  aria-describedby="admin-users-result-summary"
                />
              </span>

              {showSuggestions && (
                <div
                  className="admin-users-search-suggestions"
                  id="admin-users-search-suggestions"
                  role="listbox"
                  aria-label="Gợi ý tài khoản"
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      id={`admin-users-suggestion-${index}`}
                      className={index === highlightedSuggestion ? "is-highlighted" : ""}
                      type="button"
                      role="option"
                      aria-selected={index === highlightedSuggestion}
                      key={suggestion.id || `${suggestion.email}-${index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedSuggestion(index)}
                      onClick={() => chooseSuggestion(suggestion)}
                    >
                      <span>
                        <strong>{suggestion.displayName}</strong>
                        <small>{suggestion.email || "Chưa có email"}</small>
                      </span>
                      <small>{suggestion.id ? `ID ${suggestion.id}` : ""}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CustomSelect
            className="clean-field admin-user-status-filter"
            label="Trạng thái"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={onStatusFilterChange}
          />

          <CustomSelect
            className="clean-field admin-user-sort-filter"
            label="Sắp xếp"
            value={sortValue}
            options={SORT_OPTIONS}
            onChange={onSortChange}
          />

          <CustomSelect
            className="clean-field admin-toolbar-page-size"
            label="Hiển thị"
            value={pageInfo.pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
          />
        </div>

        <div
          className="admin-users-result-summary"
          id="admin-users-result-summary"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <UsersRound size={17} aria-hidden="true" />
          <span>
            <strong>{rows.length}</strong> đang hiển thị
            <span aria-hidden="true"> · </span>
            <strong>{pageInfo.totalCount}</strong> kết quả phù hợp
            <span aria-hidden="true"> · </span>
            <strong>{pendingCount}</strong> chờ duyệt
            <span aria-hidden="true"> · </span>
            <strong>{totalVisibleCount}</strong> tài khoản có thể quản lý
          </span>
        </div>
      </AdminFilterDisclosure>

      {loading && !rows.length ? (
        <LoadingState label="Đang tải danh sách người dùng..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách tài khoản"
          description={error}
          action={(
            <Button onClick={onReload}>
              <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : rows.length ? (
        <DataTable
          className="admin-users-table"
          caption="Danh sách tài khoản người dùng theo bộ lọc hiện tại"
          rowHeaderKey="account"
          getRowKey={(item) => item.identityId || item.userId || item.id}
          rows={rows}
          columns={[
            {
              key: "account",
              header: "Tài khoản",
              render: (item) => {
                const userId = item.identityId || item.userId || item.id;
                const displayName = item.displayName || item.name || item.email || "Người dùng";
                return (
                  <div className="admin-user-card-main">
                    <div className="admin-user-avatar" aria-hidden="true">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="table-primary-cell">
                      <strong>{displayName}</strong>
                      <span>{item.email || "Chưa có email"}</span>
                      <small title={userId}>Mã: {userId}</small>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (item) => (
                <div className="admin-badge-stack">
                  <Badge tone={isApproved(item) ? "success" : "warning"}>{statusLabel(item)}</Badge>
                  <Badge tone={item.isDeleted ? "danger" : "info"}>
                    {item.isDeleted ? "Đã vô hiệu hóa" : "Hoạt động"}
                  </Badge>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Thao tác",
              render: (item) => {
                const userId = item.identityId || item.userId || item.id;
                const displayName = item.displayName || item.name || item.email || "Người dùng";
                return (
                  <div className="record-actions">
                    {item.isDeleted ? (
                      <Button
                        tone="secondary"
                        size="sm"
                        className="admin-user-restore-btn"
                        aria-label={`Khôi phục tài khoản ${displayName}`}
                        onClick={() => onRestore(userId)}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        Khôi phục
                      </Button>
                    ) : (
                      <Button
                        tone="danger"
                        size="sm"
                        className="admin-user-delete-btn"
                        aria-label={`Vô hiệu hóa tài khoản ${displayName}`}
                        onClick={() => onDelete(userId)}
                      >
                        <UserX size={14} aria-hidden="true" />
                        Vô hiệu hóa
                      </Button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      ) : (
        <EmptyState
          title="Không có tài khoản phù hợp"
          description="Thử đổi bộ lọc, cách sắp xếp hoặc từ khóa tìm kiếm."
          icon={<UsersRound size={20} />}
        />
      )}
    </section>
  );
}
