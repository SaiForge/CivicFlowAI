import React, { useState } from 'react';
import { categoryBreakdown } from '../../data/mockData';
import { 
  Car, Trash2, Droplets, Waves, Lightbulb, 
  Building2, Layers, ArrowUpRight
} from 'lucide-react';

const categoryMeta = {
  Road:           { label: 'Roads & Potholes',      icon: Car,        color: '#1a1a1a', bg: 'rgba(26,26,26,0.08)',   bar: '#1a1a1a' },
  Waste:          { label: 'Waste Management',     icon: Trash2,     color: '#059669', bg: 'rgba(5,150,105,0.12)',  bar: '#10b981' },
  Water:          { label: 'Water Supply & Leaks',  icon: Droplets,   color: '#2563eb', bg: 'rgba(37,99,235,0.12)',  bar: '#3b82f6' },
  Drainage:       { label: 'Storm Drainage',        icon: Waves,      color: '#0891b2', bg: 'rgba(8,145,178,0.12)',  bar: '#06b6d4' },
  Streetlight:    { label: 'Street Lighting',       icon: Lightbulb,  color: '#d97706', bg: 'rgba(217,119,6,0.12)',  bar: '#f59e0b' },
  Infrastructure: { label: 'Public Infrastructure', icon: Building2,  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', bar: '#8b5cf6' },
  Other:          { label: 'General Civic',         icon: Layers,     color: '#6b7280', bg: 'rgba(107,114,128,0.12)',bar: '#9ca3af' },
};

const IssueBreakdown = () => {
  const [metricView, setMetricView] = useState('volume'); // 'volume' | 'resolution'
  const totalComplaints = categoryBreakdown.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="card civic-section-card breakdown-card">
      {/* Header */}
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h4 className="card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Issue Category Breakdown
          </h4>
          <span className="card-sub" style={{ display: 'block', marginTop: '0.2rem' }}>
            {totalComplaints} total complaints across 7 civic domains
          </span>
        </div>

        {/* View toggle */}
        <div className="breakdown-header-actions">
          <button
            className={`breakdown-pill-btn ${metricView === 'volume' ? 'active' : ''}`}
            onClick={() => setMetricView('volume')}
          >
            Volume
          </button>
          <button
            className={`breakdown-pill-btn ${metricView === 'resolution' ? 'active' : ''}`}
            onClick={() => setMetricView('resolution')}
          >
            Resolution %
          </button>
        </div>
      </div>

      {/* Segmented proportional ribbon */}
      <div className="ribbon-wrap">
        <div className="segmented-ribbon" title="Category distribution strip">
          {categoryBreakdown.map((cat) => {
            const meta = categoryMeta[cat.category] || categoryMeta.Other;
            const widthPct = ((cat.count / totalComplaints) * 100).toFixed(1);
            return (
              <div
                key={cat.category}
                className="ribbon-slice"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: meta.bar,
                }}
                title={`${cat.category}: ${cat.count} (${widthPct}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Category Rows */}
      <div className="category-rows">
        {categoryBreakdown.map((cat) => {
          const meta = categoryMeta[cat.category] || categoryMeta.Other;
          const IconComponent = meta.icon;
          const volumePct = Math.round((cat.count / totalComplaints) * 100);
          const resolutionPct = cat.pct;

          const activePct = metricView === 'volume' ? volumePct : resolutionPct;
          const fillWidth = metricView === 'volume' 
            ? `${Math.min(100, Math.round((cat.count / 38) * 100))}%` 
            : `${resolutionPct}%`;

          return (
            <div key={cat.category} className="category-row-item">
              {/* Category Icon */}
              <div className="category-icon-box" style={{ background: meta.bg, color: meta.color }}>
                <IconComponent size={15} strokeWidth={2} />
              </div>

              {/* Center info & Progress bar */}
              <div className="category-row-content">
                <div className="category-row-top">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span className="category-name">{cat.category}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      · {meta.label}
                    </span>
                  </div>
                  <span className="category-count">
                    {metricView === 'volume' ? (
                      <>
                        {cat.count}{' '}
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                          ({volumePct}%)
                        </span>
                      </>
                    ) : (
                      <span
                        className="category-badge-pill"
                        style={{
                          background: resolutionPct >= 60 ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
                          color: resolutionPct >= 60 ? '#15803d' : '#b45309',
                        }}
                      >
                        {resolutionPct}% resolved
                      </span>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="category-track">
                  <div
                    className="category-fill"
                    style={{
                      width: fillWidth,
                      backgroundColor: meta.bar,
                      opacity: metricView === 'volume' ? 0.9 : 1,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssueBreakdown;
