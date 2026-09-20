import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { complaintsApi } from '../../services/api';
import MapPinPickerModal from './MapPinPickerModal';
import {
  X,
  Upload,
  Loader2,
  Image,
  AlertCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

const ReportForm = () => {
  const { setReportFormOpen, setProcessingSubmission } = useApp();
  const [form, setForm] = useState({
    category: '',
    description: '',
    location: '',
    details: '',
    lat: null,
    lng: null,
  });
  const [files, setFiles] = useState([]);
  const [isSensitive, setIsSensitive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const fileRef = useRef();

  const categories = ['Road', 'Waste', 'Water', 'Drainage', 'Streetlight', 'Infrastructure', 'Other'];

  const isPhysicalIssue = form.category === 'Road' || 
    form.category === 'Infrastructure' || 
    form.category === 'Waste' || 
    /\b(pothole|road damage|damaged road|broken road|crater|asphalt|caved in|pavement)\b/i.test(form.description);

  const photoIsMandatory = isPhysicalIssue && !isSensitive;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
      return true;
    });
    setFiles((prev) => [...prev, ...selected].slice(0, 5)); // max 5 files
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Quick Live GPS Button ──────────────────────────────────────────────────
  const handleQuickGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocatingGps(false);

        // Reverse geocode via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const road = a.road || a.pedestrian || a.suburb || '';
            const city = a.city || a.town || a.county || '';
            const full = [road, city].filter(Boolean).join(', ') || data.display_name;
            setForm((f) => ({ ...f, location: full, lat, lng }));
          } else {
            setForm((f) => ({ ...f, location: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
          }
        } catch {
          setForm((f) => ({ ...f, location: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
        }
      },
      (err) => {
        setLocatingGps(false);
        setError('Could not access current GPS position. You can use "Pin on Map" to select.');
        console.warn('GPS error:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Pin on Map Confirmation ────────────────────────────────────────────────
  const handleMapConfirm = ({ address, lat, lng }) => {
    setForm((f) => ({
      ...f,
      location: address,
      lat,
      lng,
    }));
  };

  // ── Submit & Launch AI Processing Screen ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      setError('Please select an issue category.');
      return;
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      setError('Please provide a meaningful description (at least 10 characters) explaining the issue.');
      return;
    }
    if (!form.location.trim() || form.location.trim().length < 3) {
      setError('Please enter or pinpoint the exact location of the issue.');
      return;
    }
    if (photoIsMandatory && files.length === 0) {
      setError(
        'Submission Failed: Photographic evidence is mandatory for Road Damage reports so authorities can verify damage and dispatch equipment. If this is a sensitive safety issue where photos cannot be captured safely, please enable "Sensitive / Confidential Issue".'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build multipart form data
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('details', form.details || '');
      fd.append('is_sensitive', isSensitive ? 'true' : 'false');
      if (form.lat) fd.append('lat', form.lat);
      if (form.lng) fd.append('lng', form.lng);
      files.forEach((f) => fd.append('images', f));

      // Initiate submission promise
      const submitPromise = complaintsApi.submit(fd);

      // Close the form drawer immediately and transition to AI Processing Screen
      setReportFormOpen(false);

      // Launch the AI Processing Screen with live state & promise
      setProcessingSubmission({
        promise: submitPromise,
        category: form.category,
        location: form.location,
        description: form.description,
        lat: form.lat,
        lng: form.lng,
        imagesCount: files.length,
        isSensitive: isSensitive,
      });

    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="detail-backdrop" onClick={() => setReportFormOpen(false)} />
      <div className="detail-drawer">
        <div className="detail-header">
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-dark)' }}>Report a Civic Issue</div>
            <div className="card-sub" style={{ marginTop: '0.25rem' }}>Help improve your community with AI-assisted resolution</div>
          </div>
          <button className="btn-icon" onClick={() => setReportFormOpen(false)} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form className="detail-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* ── Category Selection ── */}
          <div className="detail-section">
            <label className="detail-field-label">Issue Category *</label>
            <div className="report-cat-grid">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`report-cat-btn ${form.category === cat ? 'report-cat-active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* ── Sensitive Issue Exemption Toggle ── */}
            <div className={`report-sensitive-card ${isSensitive ? 'sensitive-active' : ''}`}>
              <label className="report-sensitive-label">
                <input
                  type="checkbox"
                  checked={isSensitive}
                  onChange={(e) => setIsSensitive(e.target.checked)}
                  className="report-sensitive-checkbox"
                />
                <div className="report-sensitive-info">
                  <div className="report-sensitive-title-row">
                    <ShieldAlert size={14} style={{ color: isSensitive ? '#d97706' : '#64748b' }} />
                    <span>Sensitive / Confidential Issue</span>
                    <span className="report-sensitive-pill">Photo Exempt</span>
                  </div>
                  <p className="report-sensitive-desc">
                    Enable if photo evidence cannot be safely captured or shared (e.g. personal safety threat, harassment, corruption, privacy concerns, or risk of retaliation).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ── Issue Description ── */}
          <div className="detail-section">
            <label className="detail-field-label">Describe the Issue *</label>
            <textarea
              className="detail-textarea"
              rows={4}
              placeholder="Describe what you see — be as specific as possible (min 10 characters)…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>

          {/* ── Location with GPS & Map Pinpoint ── */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="detail-field-label" style={{ marginBottom: 0 }}>
                Location & Coordinates *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="report-loc-action-btn"
                  onClick={handleQuickGps}
                  disabled={locatingGps}
                  title="Use Live Browser GPS"
                >
                  {locatingGps ? (
                    <Loader2 size={12} className="spin-animate" />
                  ) : (
                    <Navigation size={12} />
                  )}
                  <span>{locatingGps ? 'GPS…' : 'Live GPS'}</span>
                </button>

                <button
                  type="button"
                  className="report-loc-action-btn report-loc-map-btn"
                  onClick={() => setMapPickerOpen(true)}
                  title="Open Interactive Map to Pin Location"
                >
                  <MapPin size={12} />
                  <span>Pin on Map</span>
                </button>
              </div>
            </div>

            <input
              className="detail-input"
              type="text"
              placeholder="e.g. Near Main Bus Stand, MG Road, Sector 5"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              required
            />

            {/* Coordinates Badge when location is pinned */}
            {form.lat && form.lng && (
              <div className="report-locked-coords-badge">
                <CheckCircle2 size={12} color="#16a34a" />
                <span>
                  GIS Locked: {parseFloat(form.lat).toFixed(4)}° N, {parseFloat(form.lng).toFixed(4)}° E
                </span>
              </div>
            )}
          </div>

          {/* ── File Upload ── */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="detail-field-label" style={{ marginBottom: 0 }}>
                Upload Photo / Video {photoIsMandatory ? (
                  <span style={{ color: '#dc2626', fontWeight: 800 }}>* (Mandatory for Road Damage)</span>
                ) : isSensitive ? (
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>(Optional — Waived for Sensitive Issue)</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                )}
              </label>
            </div>

            {isSensitive ? (
              <div className="report-sensitive-exemption-badge">
                <ShieldCheck size={14} color="#16a34a" />
                <span>
                  <strong>Citizen Safety Protected:</strong> Photographic evidence is waived for this report. Your complaint will be accepted and processed securely without images.
                </span>
              </div>
            ) : photoIsMandatory && files.length === 0 ? (
              <div className="report-mandatory-photo-badge">
                <AlertCircle size={13} color="#dc2626" />
                <span>Photographic evidence is required to assess and repair road damage.</span>
              </div>
            ) : null}

            <div
              className={`detail-upload-zone ${photoIsMandatory && files.length === 0 ? 'upload-zone-mandatory' : ''}`}
              onClick={() => fileRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <Upload size={20} strokeWidth={1.75} color={photoIsMandatory && files.length === 0 ? '#dc2626' : 'var(--text-muted)'} />
              <span style={{ fontWeight: photoIsMandatory && files.length === 0 ? 700 : 500, color: photoIsMandatory && files.length === 0 ? '#b91c1c' : 'inherit' }}>
                {photoIsMandatory && files.length === 0 ? 'Click to attach required photo evidence *' : 'Click to add photos or video evidence'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                JPG, PNG, WebP, MP4 — max 20MB · up to 5 files
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Preview Thumbnails */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.625rem' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    {f.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, background: 'var(--dark-card)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={20} color="var(--text-muted)" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 11, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Additional Details ── */}
          <div className="detail-section">
            <label className="detail-field-label">Additional Details (optional)</label>
            <textarea
              className="detail-textarea"
              rows={2}
              placeholder="Any additional landmark or context for field crews…"
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            />
          </div>

          {/* ── Submit Buttons ── */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="submit" className="civic-btn civic-btn-primary civic-btn-lg" disabled={loading}>
              {loading ? (
                <><Loader2 size={15} className="spin-animate" /> Submitting…</>
              ) : (
                'Submit Issue & Ingest'
              )}
            </button>
            <button type="button" className="civic-btn civic-btn-ghost" onClick={() => setReportFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ── Interactive Map Pin Picker Modal ── */}
      <MapPinPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.lat}
        initialLng={form.lng}
        initialAddress={form.location}
      />
    </>
  );
};

export default ReportForm;
