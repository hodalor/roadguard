import React from 'react';

export default function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-card__accent" style={{ background: accent }} />
      <div>
        <p className="stat-card__label">{label}</p>
        <h3 className="stat-card__value">{value}</h3>
      </div>
    </div>
  );
}
