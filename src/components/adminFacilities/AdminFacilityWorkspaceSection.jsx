import { Building2, MessageSquareText } from "lucide-react";
import { useState } from "react";
import AdminFeedbackReviewsSection from "../adminFeedbackReviews/AdminFeedbackReviewsSection";

export default function AdminFacilityWorkspaceSection({ children, facilities }) {
  const [activeTab, setActiveTab] = useState("facilities");

  return (
    <div className="admin-facility-workspace">
      <div className="admin-subsection-tabs" role="tablist" aria-label="Quản lý cơ sở y tế và đánh giá">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "facilities"}
          className={activeTab === "facilities" ? "is-active" : ""}
          onClick={() => setActiveTab("facilities")}
        >
          <Building2 size={17} aria-hidden="true" />
          Danh sách cơ sở
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reviews"}
          className={activeTab === "reviews" ? "is-active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          <MessageSquareText size={17} aria-hidden="true" />
          Đánh giá người dùng
        </button>
      </div>

      {activeTab === "facilities" ? children : <AdminFeedbackReviewsSection facilities={facilities} />}
    </div>
  );
}
