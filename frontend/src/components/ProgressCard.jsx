import React from 'react';

const ArrowUpRightIcon = () => (
  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const bars = [
  { day: 'S', height: 48, type: 'muted' },
  { day: 'M', height: 80, type: 'dark' },
  { day: 'T', height: 64, type: 'dark' },
  { day: 'W', height: 112, type: 'yellow', active: true },
  { day: 'T', height: 56, type: 'dark' },
  { day: 'F', height: 80, type: 'dark' },
  { day: 'S', height: 32, type: 'muted' },
];

const ProgressCard = () => {
  const maxHeight = Math.max(...bars.map(b => b.height));

  return (
    <div className="card progress-card">
      <div className="card-header">
        <div>
          <h4 className="card-title">Progress</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span className="card-value">6.1 h</span>
            <span className="card-sub">Work Time<br />this week</span>
          </div>
        </div>
        <button className="btn-arrow" aria-label="View details">
          <ArrowUpRightIcon />
        </button>
      </div>

      <div className="bar-chart" style={{ marginTop: '0.5rem' }}>
        <div className="bar-tooltip">5h 23m</div>
        {bars.map((bar, i) => (
          <div key={i} className="bar-col">
            <div
              className={`bar bar-${bar.type}`}
              style={{ height: `${bar.height}px` }}
            />
            <span className={`bar-label ${bar.active ? 'bar-label-active' : ''}`}>{bar.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressCard;
