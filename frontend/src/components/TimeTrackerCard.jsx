import React from 'react';

const ArrowUpRightIcon = () => (
  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const ClockIcon = () => (
  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const TimeTrackerCard = () => {
  // Circle math: circumference = 2 * pi * 42 ≈ 264
  const circumference = 264;
  const dashOffset = 80; // ~70% filled

  return (
    <div className="card time-card">
      <div className="card-header">
        <h4 className="card-title">Time tracker</h4>
        <button className="btn-arrow" aria-label="View details">
          <ArrowUpRightIcon />
        </button>
      </div>

      {/* Circular Dial */}
      <div className="dial-wrap">
        <div className="dial">
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="rgba(0,0,0,0.05)" strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="#ffcc00" strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="dial-inner">
            <span className="dial-time">02:35</span>
            <span className="dial-label">Work Time</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="tracker-controls">
        <div className="tracker-btn-group">
          {/* Play */}
          <button className="btn-round btn-dark" aria-label="Play">
            <svg style={{ width: '1rem', height: '1rem', fill: 'currentColor' }} viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          {/* Pause */}
          <button className="btn-round btn-ghost" aria-label="Pause">
            <svg style={{ width: '1rem', height: '1rem', fill: 'currentColor' }} viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        </div>
        {/* Clock */}
        <button className="btn-round btn-yellow-round" aria-label="Set time">
          <ClockIcon />
        </button>
      </div>
    </div>
  );
};

export default TimeTrackerCard;
