import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Check, Loader2, Info } from 'lucide-react';

const DEFAULT_CENTER = [28.6139, 77.2090]; // Central Delhi / Municipal Zone default
const DEFAULT_ZOOM = 13;

const MapPinPickerModal = ({ isOpen, onClose, onConfirm, initialLat, initialLng, initialAddress }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [position, setPosition] = useState(() => {
    if (initialLat && initialLng) return [parseFloat(initialLat), parseFloat(initialLng)];
    return DEFAULT_CENTER;
  });

  const initialPosRef = useRef(position);
  const initialAddrRef = useRef(initialAddress);

  const [address, setAddress] = useState(initialAddress || '');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // ── Free Reverse Geocoding via OpenStreetMap Nominatim ────────────────────────
  const reverseGeocode = async (lat, lng) => {
    setLoadingAddress(true);
    setGpsError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const road = a.road || a.pedestrian || a.street || a.suburb || '';
        const area = a.suburb || a.neighbourhood || a.residential || a.city_district || '';
        const city = a.city || a.town || a.municipality || a.county || '';
        const pin = a.postcode ? ` - ${a.postcode}` : '';

        const parts = [road, area, city].filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));

        if (uniqueParts.length > 0) {
          setAddress(uniqueParts.join(', ') + pin);
        } else if (data.display_name) {
          // Take first 3 segments
          const segs = data.display_name.split(',').slice(0, 3).map(s => s.trim());
          setAddress(segs.join(', '));
        } else {
          setAddress(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } else {
        setAddress(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      setAddress(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingAddress(false);
    }
  };

  // ── Initialize Leaflet Map ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      const L = window.L;
      if (!L) {
        console.error('Leaflet L not found on window');
        return;
      }

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView(initialPosRef.current, DEFAULT_ZOOM);

      // Free OpenStreetMap Standard Tiles (zero API cost)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Custom Glowing Civic Map Pin Icon
      const customPin = L.divIcon({
        className: 'custom-map-pin-wrap',
        html: `
          <div class="custom-map-marker-pin">
            <div class="custom-map-marker-pulse"></div>
            <div class="custom-map-marker-head">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 44],
      });

      // Place initial marker
      const marker = L.marker(initialPosRef.current, {
        draggable: true,
        icon: customPin,
      }).addTo(map);

      // Click map to reposition marker
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      });

      // Drag marker end
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Reverse geocode initial position if address is empty
      if (!initialAddrRef.current) {
        reverseGeocode(initialPosRef.current[0], initialPosRef.current[1]);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // ── Use Live GPS ─────────────────────────────────────────────────────────────
  const handleUseLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setLocatingGps(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
      },
      (err) => {
        setLocatingGps(false);
        setGpsError('Could not acquire GPS position. Please click on the map manually.');
        console.warn('GPS Error:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Confirm Selection ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    onConfirm({
      address: address || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`,
      lat: position[0],
      lng: position[1],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="map-picker-backdrop" onClick={onClose} />
      <div className="map-picker-dialog">
        {/* Header */}
        <div className="map-picker-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="map-picker-icon-badge">
                <MapPin size={18} color="#1a1a1a" />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                Pinpoint Issue Location
              </h3>
            </div>
            <p className="card-sub" style={{ marginTop: '0.2rem', fontSize: '0.8125rem' }}>
              Click anywhere on the municipal map or drag the pin to set exact coordinates
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Map Container */}
        <div className="map-picker-body">
          <div ref={mapContainerRef} className="map-leaflet-container" />

          {/* Quick GPS Floating Button */}
          <button
            type="button"
            className="map-gps-float-btn"
            onClick={handleUseLiveGps}
            disabled={locatingGps}
            title="Locate Me via GPS"
          >
            {locatingGps ? (
              <Loader2 size={16} className="spin-animate" />
            ) : (
              <Navigation size={16} />
            )}
            <span>{locatingGps ? 'Locating…' : 'Locate Me (Live GPS)'}</span>
          </button>
        </div>

        {/* Selected Coordinates & Address Footer */}
        <div className="map-picker-footer">
          {gpsError && (
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Info size={13} /> {gpsError}
            </div>
          )}

          <div className="map-address-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span className="map-coord-pill">
                📍 {position[0].toFixed(5)}° N, {position[1].toFixed(5)}° E
              </span>
              {loadingAddress && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Loader2 size={12} className="spin-animate" /> Resolving address…
                </span>
              )}
            </div>

            <div className="map-resolved-address">
              {address || 'Drop pin on map to resolve street address…'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="civic-btn civic-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="civic-btn civic-btn-primary"
              onClick={handleConfirm}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Check size={16} strokeWidth={2.5} />
              Confirm Pin Location
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapPinPickerModal;
