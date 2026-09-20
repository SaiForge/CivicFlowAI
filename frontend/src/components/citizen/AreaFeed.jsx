import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useComplaints, useMapMarkers } from '../../hooks/useApi';
import { complaintsApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PriorityBadge } from '../shared/StatusBadge';
import {
  MapPin, ThumbsUp, Users, Navigation, Search, Filter,
  Layers, ExternalLink, ChevronRight, Eye, CheckCircle2,
  AlertTriangle, Car, Trash2, Droplets, Lightbulb, Waves,
  Maximize2, LayoutGrid, Map as MapIcon, Crosshair
} from 'lucide-react';

const categoryConfig = {
  All:            { label: 'All Issues',        icon: null,       color: '#0f172a' },
  Road:           { label: 'Potholes & Roads',  icon: Car,        color: '#1e293b' },
  Waste:          { label: 'Swachhata & Waste', icon: Trash2,     color: '#64748b' },
  Water:          { label: 'Jal Board Leaks',   icon: Droplets,   color: '#2563eb' },
  Drainage:       { label: 'Choked Drains',     icon: Waves,      color: '#7c3aed' },
  Streetlight:    { label: 'Streetlights Out',  icon: Lightbulb,  color: '#d97706' },
  Infrastructure: { label: 'Infrastructure',    icon: Layers,     color: '#059669' },
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

const AreaFeed = () => {
  const { openDetail, triggerRefresh } = useApp();
  const { data: complaintsData, loading: complaintsLoading, refetch: refetchComplaints } = useComplaints({ limit: 50 });
  const { data: markersData } = useMapMarkers();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('split'); // 'split' | 'map' | 'list'
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [votingId, setVotingId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const circleLayerRef = useRef(null);

  // Filter nearby complaints (exclude archived/closed)
  const nearbyComplaints = useMemo(() => {
    return (complaintsData || []).filter(c => c.status !== 'Resolved' && c.status !== 'Closed');
  }, [complaintsData]);

  // Merge complaints with marker coordinates
  const markersWithCoords = useMemo(() => {
    const rawMarkers = markersData || [];
    const markerByTicket = new Map(rawMarkers.map(m => [m.ticket_id, m]));

    return nearbyComplaints.map((c, idx) => {
      const match = markerByTicket.get(c.id);
      // Determine valid lat/lng or default to realistic Ward coordinates
      let lat = Number(c.lat || match?.lat);
      let lng = Number(c.lng || match?.lng);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        const isIchal = (c.location || '').toLowerCase().includes('ichalkaranji') || (c.location || '').toLowerCase().includes('station');
        const baseLat = isIchal ? 16.6961 : 28.6139;
        const baseLng = isIchal ? 74.4632 : 77.2090;
        lat = baseLat + ((idx % 7) - 3) * 0.0035;
        lng = baseLng + (((idx * 3) % 7) - 3) * 0.0035;
      }

      return {
        ...c,
        lat,
        lng,
        ticket_id: c.id,
        label: c.issue,
      };
    });
  }, [nearbyComplaints, markersData]);

  // Filtered by category, priority, and search
  const filteredList = useMemo(() => {
    return markersWithCoords.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (priorityFilter === 'Urgent' && item.priority !== 'Critical' && item.priority !== 'High') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.issue || '').toLowerCase().includes(q);
        const matchLoc = (item.location || '').toLowerCase().includes(q);
        const matchId = (item.id || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchId) return false;
      }
      return true;
    });
  }, [markersWithCoords, selectedCategory, priorityFilter, searchQuery]);

  // Handle community voting
  const handleVote = async (complaintId, direction) => {
    if (votingId === complaintId) return;
    setVotingId(complaintId);
    
    // Optimistic vote toggle
    const currentVote = userVotes[complaintId];
    const newVote = currentVote === direction ? null : direction;
    setUserVotes(prev => ({ ...prev, [complaintId]: newVote }));

    try {
      await complaintsApi.vote(complaintId, direction);
      if (triggerRefresh) triggerRefresh();
      refetchComplaints();
    } catch (err) {
      console.warn('Voting error:', err);
    } finally {
      setVotingId(null);
    }
  };

  // ── Initialize Leaflet Map ──────────────────────────────────────────────
  useEffect(() => {
    if (activeView === 'list' || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const center = [16.6961, 74.4632]; // Default Ward 14 Center
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 14);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Ward 14 Proximity Zone circle
      const wardCircle = L.circle(center, {
        color: '#16a34a',
        fillColor: '#22c55e',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 6',
        radius: 1800, // 1.8km radius
      }).addTo(map);

      circleLayerRef.current = wardCircle;
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeView]);

  // ── Sync Map Markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeView === 'list') return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const group = markersLayerRef.current;
    if (!L || !map || !group) return;

    group.clearLayers();
    markerMapRef.current.clear();

    const validBounds = [];

    filteredList.forEach(m => {
      if (isNaN(m.lat) || isNaN(m.lng)) return;
      const catConfig = categoryConfig[m.category] || categoryConfig.All;
      const color = catConfig.color || '#475569';
      const isUrgent = m.priority === 'Critical' || m.priority === 'High';
      const pBadge = priorityBadges[m.priority] || priorityBadges.Medium;

      // Custom pulsing map pin
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

      // Interactive Popup
      const popupEl = document.createElement('div');
      popupEl.className = 'civic-map-popup-card';
      popupEl.innerHTML = `
        <div class="civic-popup-top">
          <span class="civic-popup-cat" style="background: ${color}18; color: ${color}; border: 1px solid ${color}40">${escapeHtml(m.category)}</span>
          <span class="civic-popup-ticket">${escapeHtml(m.id)}</span>
          <span class="civic-popup-priority" style="background: ${pBadge.bg}; color: ${pBadge.text}; border: 1px solid ${pBadge.border}">
            ${escapeHtml(m.priority)}
          </span>
        </div>
        <h4 class="civic-popup-title">${escapeHtml(m.issue)}</h4>
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
            View Details ➔
          </button>
        </div>
      `;

      const btn = popupEl.querySelector('.civic-popup-open-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetail(m.id);
        });
      }

      const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(popupEl, {
        maxWidth: 290,
        className: 'civic-leaflet-popup-shell',
      });

      marker.on('click', () => {
        setSelectedTicketId(m.id);
        // Scroll card into view if in split mode
        const cardEl = document.getElementById(`nearby-card-${m.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      group.addLayer(marker);
      markerMapRef.current.set(m.id, marker);
      validBounds.push([m.lat, m.lng]);
    });

    if (validBounds.length > 0) {
      try {
        const bounds = L.latLngBounds(validBounds);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (err) {
        console.warn('Map fitBounds error:', err);
      }
    }
  }, [filteredList, activeView, openDetail]);

  // Fly map to issue pin when clicked on card
  const handleFocusIssueOnMap = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedTicketId(item.id);
    const map = mapInstanceRef.current;
    if (!map || isNaN(item.lat) || isNaN(item.lng)) return;

    if (activeView === 'list') {
      setActiveView('split');
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([item.lat, item.lng], 16, { animate: true, duration: 0.8 });
        const leafletMarker = markerMapRef.current.get(item.id);
        if (leafletMarker) {
          setTimeout(() => leafletMarker.openPopup(), 450);
        }
      }
    }, 150);
  };

  return (
    <div className="card civic-section-card nearby-issues-container">
      {/* ── Header Banner ── */}
      <div className="nearby-feed-header">
        <div className="nearby-header-left">
          <div className="indian-civic-badge" style={{ marginBottom: '0.35rem' }}>
            <span className="tricolor-marker" />
            <span>Ward 14 Civic Geospatial Radar</span>
          </div>
          <h3 className="card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Nearby Issues &amp; Community Radar
          </h3>
          <p className="card-sub" style={{ marginTop: '0.2rem' }}>
            Live map view of verified grievances within your locality. Support active issues to expedite municipal prioritization.
          </p>
        </div>

        <div className="nearby-header-actions">
          {/* View Mode Switcher */}
          <div className="nearby-view-toggle">
            <button
              className={`view-toggle-btn ${activeView === 'split' ? 'active' : ''}`}
              onClick={() => setActiveView('split')}
              title="Split View (Map + List)"
            >
              <LayoutGrid size={14} />
              <span>Map &amp; Feed</span>
            </button>
            <button
              className={`view-toggle-btn ${activeView === 'map' ? 'active' : ''}`}
              onClick={() => setActiveView('map')}
              title="Full Map View"
            >
              <MapIcon size={14} />
              <span>Map View</span>
            </button>
            <button
              className={`view-toggle-btn ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
              title="Cards List View"
            >
              <Layers size={14} />
              <span>Feed List</span>
            </button>
          </div>

          <span className="badge badge-dark nearby-count-badge">
            {filteredList.length} Active Nearby
          </span>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="nearby-toolbar">
        {/* Category Chips */}
        <div className="nearby-category-scroll">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                className={`nearby-chip ${isActive ? 'nearby-chip-active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                {Icon && <Icon size={13} />}
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Priority Controls */}
        <div className="nearby-sub-toolbar">
          <div className="nearby-search-box">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search nearby street, landmark, or issue..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div className="nearby-priority-filter">
            <button
              type="button"
              className={`priority-filter-btn ${priorityFilter === 'All' ? 'active' : ''}`}
              onClick={() => setPriorityFilter('All')}
            >
              All Priorities
            </button>
            <button
              type="button"
              className={`priority-filter-btn ${priorityFilter === 'Urgent' ? 'active urgent' : ''}`}
              onClick={() => setPriorityFilter('Urgent')}
            >
              <AlertTriangle size={12} />
              <span>High / Critical</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Map & Feed ── */}
      <div className={`nearby-main-layout nearby-layout-${activeView}`}>
        {/* Interactive Map View */}
        {activeView !== 'list' && (
          <div className="nearby-map-wrapper">
            <div className="nearby-map-hud">
              <div className="nearby-hud-badge">
                <Crosshair size={13} color="#16a34a" />
                <span>Ward 14 Radius (1.8 km)</span>
              </div>
              <div className="nearby-hud-legend">
                <span className="legend-dot" style={{ background: '#1e293b' }} /> Road
                <span className="legend-dot" style={{ background: '#64748b' }} /> Waste
                <span className="legend-dot" style={{ background: '#2563eb' }} /> Water
                <span className="legend-dot" style={{ background: '#d97706' }} /> Light
              </div>
            </div>
            <div ref={mapContainerRef} className="nearby-leaflet-map" />
          </div>
        )}

        {/* Nearby Cards Feed */}
        {activeView !== 'map' && (
          <div className="nearby-feed-list">
            {complaintsLoading ? (
              <div className="nearby-loading-state">
                <div className="spinner" />
                <span>Loading nearby ward grievances...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="nearby-empty-state">
                <MapPin size={32} strokeWidth={1.5} color="var(--text-muted)" />
                <h4>No Nearby Issues Match Filter</h4>
                <p>Try clearing search keywords or selecting all categories to view other ward grievances.</p>
                <button
                  type="button"
                  className="flat-action-btn flat-btn-secondary"
                  onClick={() => { setSelectedCategory('All'); setPriorityFilter('All'); setSearchQuery(''); }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="nearby-cards-scroll">
                {filteredList.map(item => {
                  const isSelected = selectedTicketId === item.id;
                  const userVote = userVotes[item.id];
                  const pBadge = priorityBadges[item.priority] || priorityBadges.Medium;
                  const catConfig = categoryConfig[item.category] || categoryConfig.All;

                  return (
                    <div
                      key={item.id}
                      id={`nearby-card-${item.id}`}
                      className={`card nearby-issue-card ${isSelected ? 'nearby-card-selected' : ''}`}
                      onClick={() => openDetail(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && openDetail(item.id)}
                    >
                      {/* Top Meta Row */}
                      <div className="nearby-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="complaint-id">{item.id}</span>
                          <span
                            className="nearby-cat-tag"
                            style={{ background: `${catConfig.color}15`, color: catConfig.color, borderColor: `${catConfig.color}35` }}
                          >
                            {item.category}
                          </span>
                          <span
                            className="nearby-priority-tag"
                            style={{ background: pBadge.bg, color: pBadge.text, borderColor: pBadge.border }}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Title & Body */}
                      <div className="nearby-card-title">
                        {item.issue}
                      </div>

                      {/* Location & Proximity */}
                      <div className="nearby-card-location">
                        <MapPin size={13} strokeWidth={2} color="#b45309" />
                        <span>{item.location}</span>
                        <span className="location-dot">·</span>
                        <span className="location-dist">Ward 14 Locality</span>
                      </div>

                      {/* Actions & Voting Bar */}
                      <div className="nearby-card-footer" onClick={e => e.stopPropagation()}>
                        <div className="nearby-support-actions">
                          <button
                            type="button"
                            className={`nearby-support-btn ${userVote === 'up' ? 'supported' : ''}`}
                            onClick={() => handleVote(item.id, 'up')}
                            title="Upvote / Support this issue"
                          >
                            <ThumbsUp size={13} strokeWidth={userVote === 'up' ? 2.5 : 1.75} />
                            <span>{userVote === 'up' ? 'Supported' : 'Support'}</span>
                            <span className="support-badge-count">{(item.supportCount || 0) + (userVote === 'up' ? 1 : 0)}</span>
                          </button>

                          {item.reportCount > 1 && (
                            <span className="nearby-reports-count">
                              <Users size={12} /> {item.reportCount} reports
                            </span>
                          )}
                        </div>

                        <div className="nearby-quick-links">
                          {activeView === 'split' && (
                            <button
                              type="button"
                              className="nearby-pin-locate-btn"
                              onClick={(e) => handleFocusIssueOnMap(item, e)}
                              title="Locate pin on map"
                            >
                              <Navigation size={12} />
                              <span>Map</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="nearby-inspect-btn"
                            onClick={() => openDetail(item.id)}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaFeed;
