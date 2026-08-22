import { FilePlus2, Files, X } from "lucide-react";
import { Dialog } from "../ui";
import "../../styles/doctor-recovery-plan-template.css";

export default function CreateRecoveryPlanMethodDialog({ onClose, onCreateNew, onUseTemplate }) {
  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-template-method-modal"
      labelledBy="doctor-create-plan-method-title"
      onClose={onClose}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><FilePlus2 size={20} /></span>
        <div>
          <h2 id="doctor-create-plan-method-title">Tạo kế hoạch phục hồi</h2>
          <p>Chọn cách bạn muốn bắt đầu.</p>
        </div>
        <button type="button" aria-label="Đóng" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="doctor-template-method-grid">
        <button type="button" onClick={onCreateNew}>
          <span aria-hidden="true"><FilePlus2 size={23} /></span>
          <strong>Tạo kế hoạch mới</strong>
          <p>Bắt đầu từ một kế hoạch trống và tự nhập nội dung.</p>
          <em>Tạo mới</em>
        </button>
        <button type="button" onClick={onUseTemplate}>
          <span aria-hidden="true"><Files size={23} /></span>
          <strong>Sử dụng kế hoạch mẫu</strong>
          <p>Bắt đầu từ một mẫu bạn đã lưu và chỉnh lại cho bệnh nhân.</p>
          <em>Chọn mẫu</em>
        </button>
      </div>
    </Dialog>
  );
}
