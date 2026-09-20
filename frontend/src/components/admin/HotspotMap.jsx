import React, { useState } from 'react';
import { mapMarkers, CATEGORY } from '../../data/mockData';
import { OFFLINE_WARD_REGISTRY } from '../../services/agentApi';
import { MapPin, Layers, Building2, CheckCircle2 } from 'lucide-react';

const catColors = {
  Road:           '#b45309',
  Waste:          '#047857',
  Water:          '#1d4ed8',
  Drainage:       '#0891b2',
  Streetlight:    '#d97706',
  Infrastructure: '#7c3aed',
  Other:          '#6b7280',
};

const prioritySize = { Critical: 18, High: 14, Medium: 12, Low: 10 };

const HotspotMap = ({ filterDept = null }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const categories = Object.values(CATEGORY);
  const wards = Object.values(OFFLINE_WARD_REGISTRY);

  const filtered = mapMarkers.filter(m => {
    const matchesCat = !activeCategory || m.category === activeCategory;
    const matchesWard = !selectedWard || m.label?.toLowerCase().includes(selectedWard.toLowerCase());
    return matchesCat && matchesWard;
  });

  return (
    <div className="card civic-section-card">
      <div className="card-header" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.25rem' }}>
            <span className="tricolor-marker" />
            <span>वार्ड नागरिक मानचित्र · Municipal Ward Geospatial Registry</span>
          </div>
          <h4 className="card-title">Ward Incident & Cluster Hotspot Map</h4>
          <span className="card-sub">Real-time incident concentration and duplicate clusters across municipal wards</span>
        </div>

        {selectedWard && (
          <button 
            className="civic-btn civic-btn-xs civic-btn-ghost"
            onClick={() => setSelectedWard(null)}
          >
            Clear Ward Filter
          </button>
        )}
      </div>

      {/* Ward Quick Filter Pills */}
      <div style={{ marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
          Municipal Wards (वार्ड चयन):
        </span>
        <div className="filter-tabs" style={{ gap: '0.4rem' }}>
          <button
            className={`filter-tab ${!selectedWard ? 'filter-tab-active' : ''}`}
            onClick={() => setSelectedWard(null)}
          >
            All Wards (सभी वार्ड)
          </button>
          {wards.map(w => (
            <button
              key={w.ward}
              className={`filter-tab ${selectedWard === w.ward ? 'filter-tab-active' : ''}`}
              onClick={() => setSelectedWard(selectedWard === w.ward ? null : w.ward)}
            >
              Ward {w.ward_number} · {w.ward}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="map-filter-row">
        <button
          className={`map-filter-btn ${!activeCategory ? 'map-filter-active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          All Domains
        </button>
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
          
          {/* Municipal Zone labels */}
          {[
            { x: 10, y: 12, label: 'North Zone · Malleshwaram' },
            { x: 62, y: 12, label: 'East Zone · Indiranagar' },
            { x: 10, y: 72, label: 'South Zone · Koramangala / HSR' },
            { x: 62, y: 72, label: 'Mahadevapura · Bellandur' },
          ].map(z => (
            <text key={z.label} x={z.x} y={z.y} fontSize="3" fill="rgba(0,0,0,0.35)" fontWeight="600" fontFamily="Inter,sans-serif">
              {z.label}
            </text>
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
                  <foreignObject x={Math.min(60, m.x + 4)} y={Math.max(4, m.y - 14)} width="44" height="20">
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{
                      background: '#1a1a1a', color: '#fff', borderRadius: '6px',
                      padding: '4px 6px', fontSize: '7.5px', whiteSpace: 'nowrap', lineHeight: 1.4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                    }}>
                      <div style={{ fontWeight: 700 }}>{m.label}</div>
                      <div style={{ color: '#fbbf24', fontSize: '6.5px' }}>{m.category} · {m.priority}</div>
                    </div>
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
