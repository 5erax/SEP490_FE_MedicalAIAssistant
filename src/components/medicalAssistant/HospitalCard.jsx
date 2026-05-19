export default function HospitalCard({ hospital, active, onSelect }) {
  const specialty = hospital.specialties?.[0] || hospital.department;

  return (
    <button className={`assistant-hospital-card ${active ? "active" : ""}`} type="button" onClick={() => onSelect(hospital)}>
      <div className="assistant-hospital-main">
        <div className="assistant-hospital-topline">
          <span className="assistant-specialty-badge">{specialty}</span>
          <strong className="assistant-distance">{hospital.distanceKm} km</strong>
        </div>
        <strong>{hospital.name}</strong>
        <span>{hospital.department}</span>
        <p>{hospital.address}</p>
        <div className="assistant-hospital-footer">
          <small>{hospital.status}</small>
          <span>Chi tiết</span>
        </div>
      </div>
    </button>
  );
}

