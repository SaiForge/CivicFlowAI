import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapMarkers, useComplaints } from '../../hooks/useApi';
import { useApp } from '../../context/AppContext';
import { CATEGORY } from '../../data/mockData';
import { 
  MapPin, Navigation, Search, Layers, Maximize2, 
  AlertTriangle, Filter, ExternalLink, ChevronRight, Compass, Eye
} from 'lucide-react';

const catColors = {
  Road:           '#1e293b',
  Waste:          '#64748b',
  Water:          '#2563eb',
  Drainage:       '#7c3aed',
  Streetlight:    '#d97706',
  Infrastructure: '#059669',
  Other:          '#4b5563',
};

const priorityBadges = {
  Critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  High:     { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  Medium:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  Low:      { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const HotspotMap = ({ filterDept = null }) => {
  const { openDetail } = useApp();
  const { data: markersData, loading: markersLoading } = useMapMarkers();
  const { data: complaintsData } = useComplaints();

  const [activeCategory, setActiveCategory] = useState(null);
  const [activePriority, setActivePriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markerObjMapRef = useRef(new Map());

  // Merge map-markers with complaints data for maximum detail
  const allMarkers = useMemo(() => {
    const rawMarkers = markersData || [];
    const complaints = complaintsData || [];
    const complaintById = new Map(complaints.map(c => [c.id, c]));

    // If backend returned markers, map them; otherwise use complaints with lat/lng
    if (rawMarkers.length > 0) {
      return rawMarkers.map((m, idx) => {
        const full = m.ticket_id ? complaintById.get(m.ticket_id) : null;
        return {
          id: m.id || idx + 1,
          ticket_id: m.ticket_id || full?.id || `CIV-${1000 + idx}`,
          category: m.category || full?.category || 'Other',
          priority: m.priority || full?.priority || 'Medium',
          status: m.status || full?.status || 'Submitted',
          label: m.label || full?.issue || m.category,
          location: m.location || full?.location || 'Municipal Ward',
          lat: Number(m.lat || full?.lat),
          lng: Number(m.lng || full?.lng),
          dept: m.dept || full?.dept,
          submitted_at: m.submitted_at || full?.submittedAt,
        };
      });
    }

    // Fallback: derive directly from complaints with coordinates
    return complaints.map((c, idx) => ({
      id: idx + 1,
      ticket_id: c.id,
      category: c.category || 'Other',
      priority: c.priority || 'Medium',
      status: c.status || 'Submitted',
      label: c.issue || c.category,
      location: c.location || 'Municipal Ward',
      lat: Number(c.lat) || (c.location?.toLowerCase().includes('ichalkaranji') ? 16.6961 + idx * 0.002 : 28.6139 + idx * 0.002),
      lng: Number(c.lng) || (c.location?.toLowerCase().includes('ichalkaranji') ? 74.4632 + idx * 0.002 : 77.2090 + idx * 0.002),
      dept: c.dept,
      submitted_at: c.submittedAt,
    }));
  }, [markersData, complaintsData]);

  // Apply filters
  const filteredMarkers = useMemo(() => {
    return allMarkers.filter(m => {
      if (filterDept && m.dept && m.dept.toLowerCase() !== filterDept.toLowerCase()) return false;
      if (activeCategory && m.category !== activeCategory) return false;
      if (activePriority !== 'All' && m.priority !== activePriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTicket = (m.ticket_id || '').toLowerCase().includes(q);
        const matchesLabel  = (m.label || '').toLowerCase().includes(q);
        const matchesLoc    = (m.location || '').toLowerCase().includes(q);
        if (!matchesTicket && !matchesLabel && !matchesLoc) return false;
      }
      return !isNaN(m.lat) && !isNaN(m.lng) && m.lat !== 0 && m.lng !== 0;
    });
  }, [allMarkers, filterDept, activeCategory, activePriority, searchQuery]);

  // Count urgent issues
  const urgentCount = useMemo(() => {
    return filteredMarkers.filter(m => m.priority === 'Critical' || m.priority === 'High').length;
  }, [filteredMarkers]);

  // ── Initialize Leaflet Map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = window.L;
    if (!L) {
      console.error('Leaflet is not available on window.L');
      return;
    }

    if (!mapInstanceRef.current) {
      // Default view: India / Delhi NCR or Ichalkaranji
      const initialCenter = [28.6139, 77.2090];
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(initialCenter, 13);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    // Delay size invalidation to account for parent layout renders
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // ── Render Markers on Map ────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    const group = markersLayerRef.current;
    if (!L || !map || !group) return;

    group.clearLayers();
    markerObjMapRef.current.clear();

    const validBounds = [];

    filteredMarkers.forEach(m => {
      if (isNaN(m.lat) || isNaN(m.lng)) return;
      const color = catColors[m.category] || '#64748b';
      const isUrgent = m.priority === 'Critical' || m.priority === 'High';
      const pBadge = priorityBadges[m.priority] || priorityBadges.Medium;

      // Custom DivIcon pin
      const icon = L.divIcon({
        className: 'civic-map-marker-pin-wrap',
        html: `
          <div class="civic-pin ${isUrgent ? 'civic-pin-urgent' : ''}" style="--pin-color: ${color}">
            <div class="civic-pin-pulse"></div>
            <div class="civic-pin-head">
              <span class="civic-pin-indicator" style="background: ${color}"></span>
              <span class="civic-pin-code">${m.category ? m.category.slice(0, 3).toUpperCase() : 'CIV'}</span>
            </div>
            <div class="civic-pin-tip"></div>
          </div>
        `,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
        popupAnchor: [0, -44],
      });

      // Interactive Popup Card
      const popupEl = document.createElement('div');
      popupEl.className = 'civic-map-popup-card';
      popupEl.innerHTML = `
        <div class="civic-popup-top">
          <span class="civic-popup-cat" style="background: ${color}18; color: ${color}; border: 1px solid ${color}40">${escapeHtml(m.category)}</span>
          <span class="civic-popup-ticket">${escapeHtml(m.ticket_id)}</span>
          <span class="civic-popup-priority" style="background: ${pBadge.bg}; color: ${pBadge.text}; border: 1px solid ${pBadge.border}">
            ${escapeHtml(m.priority)}
          </span>
        </div>
        <h4 class="civic-popup-title">${escapeHtml(m.label)}</h4>
        <div class="civic-popup-location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${escapeHtml(m.location)}</span>
        </div>
        <div class="civic-popup-actions">
          <span class="civic-popup-status">${escapeHtml(m.status)}</span>
          <button type="button" class="civic-popup-open-btn">
            Inspect Ticket ➔
          </button>
        </div>
      `;

      const btn = popupEl.querySelector('.civic-popup-open-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (m.ticket_id) openDetail(m.ticket_id);
        });
      }

      const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(popupEl, {
        maxWidth: 280,
        className: 'civic-leaflet-popup-shell',
      });

      marker.on('click', () => {
        setSelectedTicketId(m.ticket_id);
      });

      group.addLayer(marker);
      markerObjMapRef.current.set(m.ticket_id, marker);
      validBounds.push([m.lat, m.lng]);
    });

    // Fit map bounds to active markers
    if (validBounds.length > 0) {
      try {
        const bounds = L.latLngBounds(validBounds);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (err) {
        console.warn('Could not fit map bounds:', err);
      }
    }
  }, [filteredMarkers, openDetail]);

  // Fly to specific marker when clicked in list
  const handleSelectIssue = (marker) => {
    setSelectedTicketId(marker.ticket_id);
    const map = mapInstanceRef.current;
    if (!map || isNaN(marker.lat) || isNaN(marker.lng)) return;

    map.flyTo([marker.lat, marker.lng], 16, { animate: true, duration: 1 });
    const leafletMarker = markerObjMapRef.current.get(marker.ticket_id);
    if (leafletMarker) {
      setTimeout(() => {
        leafletMarker.openPopup();
      }, 500);
    }
  };

  // Reset & Fit all markers
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const L = window.L;
    const valid = filteredMarkers.filter(m => !isNaN(m.lat) && !isNaN(m.lng));
    if (valid.length > 0 && L) {
      const bounds = L.latLngBounds(valid.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  const categories = Object.values(CATEGORY);

  return (
    <div className="card civic-section-card hotspot-map-master-card">
      {/* ── Header & Telemetry ── */}
      <div className="hotspot-map-header-row">
        <div>
          <div className="hotspot-map-title-row">
            <h4 className="card-title">Civic Hotspot Map</h4>
            <span className="live-gps-badge">
              <span className="live-gps-dot" />
              Live GIS Telemetry
            </span>
          </div>
          <span className="card-sub">
            Real-time geospatial location of citizen complaints & ward hotspots across the city.
          </span>
        </div>

        {/* Action buttons */}
        <div className="hotspot-map-top-actions">
          <div className="hotspot-stat-pill">
            <MapPin size={13} className="text-blue-500" />
            <span><strong>{filteredMarkers.length}</strong> Mapped Issues</span>
          </div>
          {urgentCount > 0 && (
            <div className="hotspot-stat-pill urgent">
              <AlertTriangle size={13} className="text-red-500" />
              <span><strong>{urgentCount}</strong> High / Critical</span>
            </div>
          )}
          <button 
            type="button" 
            className="btn-setting hotspot-fit-btn"
            onClick={handleFitAll}
            title="Auto-center view on all issue markers"
          >
            <Maximize2 size={13} />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="hotspot-controls-bar">
        {/* Category Pills */}
        <div className="map-filter-row">
          <button
            type="button"
            className={`map-filter-btn ${!activeCategory ? 'map-filter-active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              type="button"
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

        {/* Priority Filter + Search Input */}
        <div className="hotspot-subfilters-row">
          <div className="hotspot-priority-toggles">
            <span className="hotspot-filter-label">Priority:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
              <button
                key={p}
                type="button"
                className={`hotspot-p-btn ${activePriority === p ? 'active' : ''}`}
                onClick={() => setActivePriority(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="hotspot-search-box">
            <Search size={14} className="hotspot-search-icon" />
            <input 
              type="text"
              className="hotspot-search-input"
              placeholder="Search by ticket ID, issue or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="hotspot-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Leaflet Map Viewport ── */}
      <div className="hotspot-map-viewport-frame">
        <div 
          ref={mapContainerRef} 
          className="hotspot-leaflet-map-canvas"
          style={{ minHeight: '440px', width: '100%' }}
        />

        {/* Floating Quick Legend */}
        <div className="hotspot-map-floating-legend">
          <div className="legend-header">
            <Layers size={12} />
            <span>Category Pins</span>
          </div>
          <div className="legend-items-grid">
            {Object.entries(catColors).map(([cat, col]) => (
              <div key={cat} className="legend-chip">
                <span className="legend-chip-dot" style={{ background: col }} />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pinned Issues Directory / Quick Pan Drawer ── */}
      <div className="hotspot-drawer-section">
        <div className="hotspot-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              Location Directory ({filteredMarkers.length} Active Issues)
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Click an issue card to pan map directly to its location
          </span>
        </div>

        {filteredMarkers.length === 0 ? (
          <div className="hotspot-empty-list">
            <MapPin size={24} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
            <p>No complaints match the current category and priority filters.</p>
          </div>
        ) : (
          <div className="hotspot-cards-scroll-strip">
            {filteredMarkers.map(m => {
              const color = catColors[m.category] || '#64748b';
              const pBadge = priorityBadges[m.priority] || priorityBadges.Medium;
              const isSelected = selectedTicketId === m.ticket_id;

              return (
                <div 
                  key={m.ticket_id || m.id}
                  className={`hotspot-issue-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectIssue(m)}
                >
                  <div className="item-top">
                    <span className="item-ticket">{m.ticket_id}</span>
                    <span 
                      className="item-priority-pill"
                      style={{ background: pBadge.bg, color: pBadge.text, border: `1px solid ${pBadge.border}` }}
                    >
                      {m.priority}
                    </span>
                  </div>

                  <div className="item-body">
                    <div className="item-title" title={m.label}>{m.label}</div>
                    <div className="item-location" title={m.location}>
                      <MapPin size={11} style={{ flexShrink: 0, color: '#64748b' }} />
                      <span>{m.location}</span>
                    </div>
                  </div>

                  <div className="item-footer">
                    <span 
                      className="item-cat-pill"
                      style={{ background: `${color}15`, color: color, borderColor: `${color}35` }}
                    >
                      {m.category}
                    </span>
                    <button
                      type="button"
                      className="item-detail-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(m.ticket_id);
                      }}
                      title="Inspect Ticket Details"
                    >
                      Inspect <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotspotMap;
