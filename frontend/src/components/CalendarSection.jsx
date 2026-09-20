import React from 'react';

const CalendarSection = () => {
  const days = [
    { label: 'Mon', date: '22', active: false },
    { label: 'Tue', date: '23', active: false },
    { label: 'Wed', date: '24', active: true },
    { label: 'Thu', date: '25', active: false },
    { label: 'Fri', date: '26', active: false },
    { label: 'Sat', date: '27', active: false },
    { label: 'Sun', date: '28', active: false, dim: true },
  ];

  return (
    <div className="card calendar-card">
      {/* Month Header */}
      <div className="cal-header">
        <span className="cal-month-nav">August</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h4 className="cal-current">September 2024</h4>
        </div>
        <span className="cal-month-nav">October</span>
      </div>

      {/* Day Grid */}
      <div className="cal-grid">
        {days.map((d) => (
          <div key={d.date} className={`cal-day ${d.dim ? 'cal-day-dim' : ''}`}>
            <span className="cal-day-label">{d.label}</span>
            <span className={`cal-date ${d.active ? 'cal-date-active' : ''}`}>{d.date}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="cal-timeline">
        {/* 8:00 am */}
        <div className="cal-time-row">
          <span className="cal-time-label">8:00 am</span>
          <div className="cal-divider" />
        </div>

        {/* 9:00 am - Event */}
        <div className="cal-time-row">
          <span className="cal-time-label">9:00 am</span>
          <div style={{ flex: 1, display: 'flex' }}>
            <div className="event-dark">
              <div>
                <div className="event-title">Weekly Team Sync</div>
                <div className="event-sub">Discuss progress on projects</div>
              </div>
              <div className="avatar-stack">
                {[
                  { letter: 'A', bg: '#fde68a', color: '#000' },
                  { letter: 'B', bg: '#bfdbfe', color: '#000' },
                  { letter: 'C', bg: '#a7f3d0', color: '#000' },
                ].map((av, i) => (
                  <span
                    key={i}
                    className="avatar-sm"
                    style={{
                      background: av.bg,
                      color: av.color,
                      border: '2px solid #1a1a1a',
                      marginLeft: i === 0 ? 0 : '-0.5rem',
                    }}
                  >
                    {av.letter}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 10:00 am */}
        <div className="cal-time-row">
          <span className="cal-time-label">10:00 am</span>
          <div className="cal-divider" />
        </div>

        {/* 11:00 am - Event 2 */}
        <div className="cal-time-row">
          <span className="cal-time-label">11:00 am</span>
          <div style={{ flex: 1, display: 'flex' }}>
            <div className="event-light">
              <div>
                <div className="event-title" style={{ color: '#1a1a1a' }}>Onboarding Session</div>
                <div className="event-sub" style={{ color: '#737373' }}>Introduction for new hires</div>
              </div>
              <div className="avatar-stack">
                {[
                  { letter: 'X', bg: '#e9d5ff', color: '#000' },
                  { letter: 'Y', bg: '#fecdd3', color: '#000' },
                ].map((av, i) => (
                  <span
                    key={i}
                    className="avatar-xs"
                    style={{
                      background: av.bg,
                      color: av.color,
                      border: '2px solid #fff',
                      marginLeft: i === 0 ? 0 : '-0.5rem',
                    }}
                  >
                    {av.letter}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSection;
