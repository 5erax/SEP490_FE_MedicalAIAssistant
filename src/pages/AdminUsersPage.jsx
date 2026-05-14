import { useEffect, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { getStoredAuth, usersApi } from "../services/api";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function statusLabel(status) {
  return status === 1 ? "Đã duyệt" : "Chờ duyệt";
}

const DEFAULT_PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const auth = getStoredAuth();

  async function loadUsers(pageNumber = pageInfo.pageNumber) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await usersApi.list(pageNumber, pageInfo.pageSize);
      const data = response.data ?? {};
      setUsers(data.items ?? []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageInfo.pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    usersApi.list(1, DEFAULT_PAGE_SIZE)
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        setUsers(data.items ?? []);
        setPageInfo({
          pageNumber: data.pageNumber ?? 1,
          pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      })
      .catch((error) => {
        if (active) setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleApprove(userId) {
    setMessage(null);
    try {
      const response = await usersApi.approve(userId);
      setMessage({ type: "success", text: response.message || "Đã duyệt người dùng." });
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function handleDelete(userId) {
    setMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="api-page">
        <div className="container">
          <div className="api-heading">
            <p className="eyebrow">Admin</p>
            <h1>Quản lý người dùng.</h1>
            <p>Trang này dùng GET /api/users, POST approve và DELETE user. Backend vẫn là nơi quyết định quyền truy cập.</p>
          </div>

          <section className="api-panel">
            {!auth && (
              <div className="api-message warning">
                Bạn chưa đăng nhập. Hãy đăng nhập bằng tài khoản có quyền admin/staff trước khi tải danh sách.
              </div>
            )}
            <div className="panel-title-row">
              <h2>Danh sách người dùng</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => loadUsers()}>Tải lại</button>
            </div>
            <ApiMessage message={message} />

            {loading ? (
              <p className="muted-text">Đang tải người dùng...</p>
            ) : (
              <div className="user-table">
                {users.length === 0 && <p className="muted-text">Chưa có dữ liệu người dùng.</p>}
                {users.map((user) => (
                  <article className="user-row" key={user.identityId}>
                    <div>
                      <strong>{user.displayName || user.email || "Người dùng"}</strong>
                      <span>{user.email}</span>
                      <small>{user.identityId}</small>
                    </div>
                    <div className="user-meta">
                      <span>{statusLabel(user.status)}</span>
                      <span>{user.isDeleted ? "Đã xóa mềm" : "Đang hoạt động"}</span>
                    </div>
                    <div className="record-actions">
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => handleApprove(user.identityId)}>
                        Duyệt
                      </button>
                      <button className="btn btn-dark btn-small" type="button" onClick={() => handleDelete(user.identityId)}>
                        Xóa
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="pagination-row">
              <button
                className="btn btn-ghost btn-small"
                type="button"
                disabled={pageInfo.pageNumber <= 1}
                onClick={() => loadUsers(pageInfo.pageNumber - 1)}
              >
                Trước
              </button>
              <span>
                Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {pageInfo.totalCount} người dùng
              </span>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                disabled={pageInfo.pageNumber >= pageInfo.totalPages}
                onClick={() => loadUsers(pageInfo.pageNumber + 1)}
              >
                Sau
              </button>
            </div>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
