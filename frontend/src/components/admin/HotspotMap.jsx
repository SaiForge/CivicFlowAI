import React, { useState } from 'react';
import { mapMarkers, CATEGORY, PRIORITY } from '../../data/mockData';

const catColors = {
  Road:           '#1a1a1a',
  Waste:          '#6b7280',
  Water:          '#3b82f6',
  Drainage:       '#8b5cf6',
  Streetlight:    '#f59e0b',
  Infrastructure: '#10b981',
  Other:          '#9ca3af',
};

const prioritySize = { Critical: 18, High: 14, Medium: 12, Low: 10 };

const HotspotMap = ({ filterDept = null }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const categories = Object.values(CATEGORY);
  const filtered = mapMarkers.filter(m =>
    (!activeCategory || m.category === activeCategory)
  );

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h4 className="card-title">Civic Hotspot Map</h4>
          <span className="card-sub">Issue concentration by area</span>
        </div>
      </div>

      {/* Category filters */}
      <div className="map-filter-row">
        <button
          className={`map-filter-btn ${!activeCategory ? 'map-filter-active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >All</button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`map-filter-btn ${activeCategory === cat ? 'map-filter-active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={{ borderColor: catColors[cat] }}
          >
            <span className="map-filter-dot" style={{ background: catColors[cat] }} />
            {cat}
          </button>
        ))}
      </div>

      {/* SVG Map */}
      <div className="hotspot-map-wrap">
        <svg viewBox="0 0 100 80" className="hotspot-map-svg" preserveAspectRatio="xMidYMid meet">
          {/* City grid lines */}
          {[20, 40, 60, 80].map(x => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="80" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
          ))}
          {[20, 40, 60].map(y => (
            <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
          ))}
          {/* Road lines */}
          <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
          <line x1="50" y1="0" x2="50" y2="80" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
          <line x1="0" y1="20" x2="100" y2="60" stroke="rgba(0,0,0,0.07)" strokeWidth="0.75"/>
          {/* Area labels */}
          {[
            { x: 10, y: 12, label: 'North Zone' },
            { x: 72, y: 12, label: 'East Zone' },
            { x: 10, y: 72, label: 'South Zone' },
            { x: 72, y: 72, label: 'West Zone' },
          ].map(z => (
            <text key={z.label} x={z.x} y={z.y} fontSize="3.5" fill="rgba(0,0,0,0.25)" fontFamily="Inter,sans-serif">{z.label}</text>
          ))}
          {/* Markers */}
          {filtered.map(m => {
            const sz = prioritySize[m.priority] || 12;
            const color = catColors[m.category] || '#6b7280';
            const isHovered = hoveredMarker === m.id;
            return (
              <g key={m.id}
                onMouseEnter={() => setHoveredMarker(m.id)}
                onMouseLeave={() => setHoveredMarker(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={m.x} cy={m.y} r={sz / 2 + (isHovered ? 2 : 0)}
                  fill={color} opacity={isHovered ? 0.95 : 0.75}
                  style={{ transition: 'all 0.15s' }}
                />
                {m.count > 1 && (
                  <text x={m.x} y={m.y + 1.2} textAnchor="middle" fontSize="3.5"
                    fill="#fff" fontWeight="700" fontFamily="Inter,sans-serif">
                    {m.count}
                  </text>
                )}
                {isHovered && (
                  <foreignObject x={m.x + 4} y={m.y - 12} width="40" height="16">
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{
                      background: '#1a1a1a', color: '#fff', borderRadius: '4px',
                      padding: '2px 5px', fontSize: '8px', whiteSpace: 'nowrap', lineHeight: 1.4,
                    }}>{m.label}</div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="map-legend">
          {Object.entries(catColors).map(([cat, color]) => (
            <div key={cat} className="map-legend-item">
              <span className="map-legend-dot" style={{ background: color }} />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HotspotMap;
