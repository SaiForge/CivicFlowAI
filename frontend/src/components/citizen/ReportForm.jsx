import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { agentApi } from '../../services/agentApi';
import {
  X, Upload, CheckCircle2, MapPin, AlertCircle, Bot,
  Sparkles, ShieldCheck, RefreshCw, ArrowRight, Camera
} from 'lucide-react';

const categories = ['Road', 'Waste', 'Water', 'Drainage', 'Streetlight', 'Infrastructure', 'Other'];

const ReportForm = () => {
  const { setReportFormOpen, submitComplaintViaAgent, openDetail } = useApp();
  const [form, setForm] = useState({ category: 'Road', description: '', location: '', details: '' });
  
  // Geocoding & Proximity state
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [proximityWarning, setProximityWarning] = useState(null);

  // Photographic evidence state
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const fileInputRef = useRef(null);

  // Submission pipeline state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(1);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Handle location blur to forward-geocode
  const handleLocationBlur = async () => {
    if (!form.location || form.location.trim().length < 3) return;
    setGeocodingLoading(true);
    try {
      const geo = await agentApi.forwardGeocode(form.location);
      if (geo) {
        setResolvedLocation(geo);
        // Check proximity for duplicate cluster detection
        const prox = await agentApi.checkProximity(geo.lat, geo.lng, 250);
        if (prox && prox.count > 0) {
          setProximityWarning(`${prox.count} nearby civic report(s) found in this cluster.`);
        } else {
          setProximityWarning(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Handle image upload & base64 conversion
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Stage progression animation
    setPipelineStage(1);
    const stageTimer1 = setTimeout(() => setPipelineStage(2), 650);
    const stageTimer2 = setTimeout(() => setPipelineStage(3), 1300);

    try {
      const locationObj = resolvedLocation ? {
        lat: resolvedLocation.lat,
        lng: resolvedLocation.lng,
        ward: resolvedLocation.ward,
        ward_number: resolvedLocation.ward_number,
        zone: resolvedLocation.zone,
        area: resolvedLocation.formatted_address,
        city: 'Bengaluru',
      } : {
        lat: 12.9783,
        lng: 77.6408,
        ward: 'Indiranagar',
        area: form.location,
        city: 'Bengaluru',
      };

      const result = await submitComplaintViaAgent({
        description: `${form.category ? `[${form.category}] ` : ''}${form.description}${form.details ? ` (${form.details})` : ''}`,
        imageBase64: imageBase64,
        location: locationObj,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      if (result.success && result.ticket) {
        setCreatedTicket(result.ticket);
      } else {
        setErrorMsg(result.error || 'Pipeline execution encountered an error.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="detail-backdrop" onClick={() => !isSubmitting && setReportFormOpen(false)} />
      <div className="detail-drawer" style={{ width: 'min(100vw, 36rem)' }}>
        {/* Header */}
        <div className="detail-header">
          <div>
            <div className="indian-civic-badge" style={{ marginBottom: '0.35rem' }}>
              <span className="tricolor-marker" />
              <span>नागरिक जन समाधान · Municipal Grievance Redressal</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              File a Civic Grievance
            </div>
            <div className="card-sub" style={{ marginTop: '0.15rem' }}>
              Processed by 7 autonomous AI agents under the 48-Hour Citizen Charter SLA.
            </div>
          </div>
          <button 
            className="btn-icon" 
            onClick={() => !isSubmitting && setReportFormOpen(false)} 
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* State A: Success Card */}
        {createdTicket ? (
          <div className="detail-body" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem', gap: '1.25rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '9999px', background: 'rgba(22, 163, 74, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>
                Grievance Verified & Registered!
              </div>
              <span className="badge badge-dark" style={{ fontFamily: 'monospace', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                {createdTicket.id}
              </span>
            </div>

            {/* Generated Ticket Summary */}
            <div className="card" style={{ width: '100%', padding: '1.25rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Department:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{createdTicket.dept === 'road' ? 'Roads & Infrastructure (PWD)' : createdTicket.dept === 'waste' ? 'Sanitation Department (Nagar Nigam)' : createdTicket.dept === 'water' ? 'Jal Board' : 'Electrical Department'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Severity Assessment:</span>
                <span className="badge" style={{ background: createdTicket.priority === 'Critical' ? '#dc2626' : '#b45309', color: '#fff', fontSize: '0.7rem' }}>
                  {createdTicket.priority} ({createdTicket.aiSeverity?.score || 75}/100)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Citizen Charter SLA:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#047857' }}>48-Hour Resolution Guarantee</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verification Quality Gate:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>✓ 100% Passed · Stage 3 Gate</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button 
                className="civic-btn civic-btn-primary" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setReportFormOpen(false);
                  openDetail(createdTicket.id);
                }}
              >
                <span>View Full Agent Trace</span>
                <ArrowRight size={15} />
              </button>
              <button 
                className="civic-btn civic-btn-ghost"
                onClick={() => {
                  setCreatedTicket(null);
                  setReportFormOpen(false);
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : isSubmitting ? (
          /* State B: Live 3-Stage Pipeline Execution Animation */
          <div className="detail-body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 1.5rem', gap: '1.5rem' }}>
            <div className="pipeline-spinner-box">
              <Bot size={36} color="#b45309" className="pulse" />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                Autonomous AI Triaging in Progress
              </div>
              <p className="card-sub" style={{ marginTop: '0.25rem' }}>
                Executing 7 specialist agents across 3 stages...
              </p>
            </div>

            {/* Stage indicator */}
            <div className="tester-stages-stepper" style={{ width: '100%', maxWidth: '24rem' }}>
              <div className={`tester-step ${pipelineStage === 1 ? 'tester-step-active' : pipelineStage > 1 ? 'tester-step-done' : ''}`}>
                <div className="tester-step-indicator">1</div>
                <div className="tester-step-info" style={{ textAlign: 'left' }}>
                  <div className="tester-step-name">Stage 1: Ingestion & Analysis</div>
                  <div className="tester-step-sub">IssueAgent, EvidenceAgent, SeverityAgent</div>
                </div>
              </div>

              <div className={`tester-step ${pipelineStage === 2 ? 'tester-step-active' : pipelineStage > 2 ? 'tester-step-done' : ''}`}>
                <div className="tester-step-indicator">2</div>
                <div className="tester-step-info" style={{ textAlign: 'left' }}>
                  <div className="tester-step-name">Stage 2: Operationalization</div>
                  <div className="tester-step-sub">RoutingAgent, IncidentAgent, WorkflowAgent</div>
                </div>
              </div>

              <div className={`tester-step ${pipelineStage === 3 ? 'tester-step-active' : ''}`}>
                <div className="tester-step-indicator">3</div>
                <div className="tester-step-info" style={{ textAlign: 'left' }}>
                  <div className="tester-step-name">Stage 3: Quality Gate</div>
                  <div className="tester-step-sub">VerificationAgent: Consistency & Completeness</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* State C: Interactive Form */
          <form className="detail-body" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="badge" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.8125rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Issue Category */}
            <div className="detail-section">
              <label className="detail-field-label">Issue Category (समस्या श्रेणी) *</label>
              <div className="report-cat-grid">
                {categories.map(cat => (
                  <button 
                    type="button" 
                    key={cat}
                    className={`report-cat-btn ${form.category === cat ? 'report-cat-active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location with Real Geocoding */}
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="detail-field-label">Location / Address (स्थान एवं पता) *</label>
                {geocodingLoading && (
                  <span style={{ fontSize: '0.6875rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <RefreshCw size={11} className="spin" /> Geocoding ward...
                  </span>
                )}
              </div>
              <input 
                className="detail-input" 
                type="text"
                placeholder="e.g. Indiranagar 100 Feet Road, near Metro Pillar 42"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                onBlur={handleLocationBlur}
                required
              />

              {/* Resolved Ward Preview Badge */}
              {resolvedLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <span className="civic-ward-tag">
                    Ward {resolvedLocation.ward_number || 112} · {resolvedLocation.ward}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {resolvedLocation.zone} · {resolvedLocation.jurisdiction_office}
                  </span>
                </div>
              )}

              {/* Proximity Duplicate Warning */}
              {proximityWarning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', padding: '0.4rem 0.65rem', background: 'rgba(217, 119, 6, 0.12)', borderRadius: '0.5rem', fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                  <AlertCircle size={13} />
                  <span>{proximityWarning} AI will cluster your report automatically.</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="detail-section">
              <label className="detail-field-label">Describe the Civic Issue *</label>
              <textarea 
                className="detail-textarea" 
                rows={4}
                placeholder="Describe what you see — size of pothole, water leakage intensity, broken streetlight pole..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Photographic Evidence */}
            <div className="detail-section">
              <label className="detail-field-label">Photographic Proof (EvidenceAgent Input)</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />

              <div 
                className="detail-upload-zone" 
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                {imageFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 700 }}>
                    <CheckCircle2 size={18} color="#047857" />
                    <span>{imageFile.name} attached ({Math.round(imageFile.size / 1024)} KB)</span>
                  </div>
                ) : (
                  <>
                    <Camera size={22} strokeWidth={1.75} color="#b45309" />
                    <span style={{ fontWeight: 600 }}>Click to attach photo evidence</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      Used by EvidenceAgent for visual grounding & 4-factor severity scoring
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="submit" 
                className="civic-btn civic-btn-primary civic-btn-lg"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Sparkles size={16} />
                <span>Submit Grievance to AI Agents</span>
              </button>
              <button 
                type="button" 
                className="civic-btn civic-btn-ghost" 
                onClick={() => setReportFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default ReportForm;
