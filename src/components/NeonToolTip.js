import React from 'react';

const NeonTooltip = ({ active, payload, label, labelKey = 'Week', valueKey = 'points' }) => {
  if (!active || !payload || !payload.length) return null;

  const v = payload[0]?.value ?? 0;

  return (
    <div className="neon-tooltip">
      <div className="neon-tooltip__label">
        {labelKey}: <span>{label}</span>
      </div>
      <div className="neon-tooltip__value">
        {valueKey}: <span>{v}</span>
      </div>
    </div>
  );
};

export default NeonTooltip;
