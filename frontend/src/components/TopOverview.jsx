import React from 'react';

const PeopleIcon = () => (
  <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const ChartIcon = () => (
  <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const TopOverview = () => {
  return (
    <section className="top-overview" aria-label="Top overview">
      {/* Left: Greeting & Metrics */}
      <div className="overview-left">
        <h2 className="welcome-text">
          Welcome in, <span>Nixtio</span>
        </h2>

        <div className="metrics-row">
          {/* Interviews pill */}
          <div className="metric-pill">
            <div className="flex-col">
              <span className="metric-label">Interviews</span>
            </div>
            <span className="badge badge-dark">15%</span>
          </div>

          {/* Hired pill */}
          <div className="metric-pill">
            <div className="flex-col">
              <span className="metric-label">Hired</span>
            </div>
            <span className="badge badge-yellow">15%</span>
          </div>

          {/* Project time pill */}
          <div className="metric-pill metric-progress">
            <div className="metric-progress-label">
              <span className="metric-label">Project time</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>60%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: '60%' }} />
            </div>
            <div className="metric-divider">
              <span className="metric-label">Output</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Counters */}
      <div className="counter-card">
        <div className="counter-item">
          <div className="counter-icon"><PeopleIcon /></div>
          <div>
            <div className="counter-value">78</div>
            <div className="counter-label">Employee</div>
          </div>
        </div>

        <div className="counter-item">
          <div className="counter-icon"><BriefcaseIcon /></div>
          <div>
            <div className="counter-value">56</div>
            <div className="counter-label">Hirings</div>
          </div>
        </div>

        <div className="counter-item">
          <div className="counter-icon"><ChartIcon /></div>
          <div>
            <div className="counter-value">203</div>
            <div className="counter-label">Projects</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopOverview;
