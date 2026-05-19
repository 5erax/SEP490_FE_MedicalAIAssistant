import HospitalCard from "./HospitalCard";

export default function HospitalList({ hospitals, loading, selectedHospital, onSelect }) {
  return (
    <section className="assistant-hospital-section">
      <div className="assistant-section-title">
        <span>Cơ sở phù hợp</span>
        <strong>{loading ? "Đang tìm..." : `${hospitals.length} gợi ý`}</strong>
      </div>

      <div className="assistant-hospital-list">
        {loading && <p className="muted-text">Đang tải danh sách cơ sở y tế phù hợp...</p>}
        {!loading && hospitals.length === 0 && <p className="muted-text">Nhập triệu chứng để xem cơ sở y tế được gợi ý.</p>}
        {!loading &&
          hospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              active={selectedHospital?.id === hospital.id}
              onSelect={onSelect}
            />
          ))}
      </div>
    </section>
  );
}

