import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Upload, CheckCircle2 } from 'lucide-react';

const ReportForm = () => {
  const { setReportFormOpen } = useApp();
  const [form, setForm] = useState({ category: '', description: '', location: '', details: '' });
  const [submitted, setSubmitted] = useState(false);

  const categories = ['Road', 'Waste', 'Water', 'Drainage', 'Streetlight', 'Infrastructure', 'Other'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => { setReportFormOpen(false); setSubmitted(false); }, 2500);
  };

  return (
    <>
      <div className="detail-backdrop" onClick={() => setReportFormOpen(false)} />
      <div className="detail-drawer">
        <div className="detail-header">
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-dark)' }}>Report a Civic Issue</div>
            <div className="card-sub" style={{ marginTop: '0.25rem' }}>Help improve your community</div>
          </div>
          <button className="btn-icon" onClick={() => setReportFormOpen(false)} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {submitted ? (
          <div className="report-success">
            <CheckCircle2 size={48} strokeWidth={1.5} color="#16a34a" />
            <div style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: '0.75rem' }}>Complaint Submitted!</div>
            <div className="card-sub" style={{ marginTop: '0.25rem' }}>AI analysis in progress. You'll be notified shortly.</div>
          </div>
        ) : (
          <form className="detail-body" onSubmit={handleSubmit}>
            <div className="detail-section">
              <label className="detail-field-label">Issue Category *</label>
              <div className="report-cat-grid">
                {categories.map(cat => (
                  <button type="button" key={cat}
                    className={`report-cat-btn ${form.category === cat ? 'report-cat-active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                  >{cat}</button>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <label className="detail-field-label">Describe the Issue *</label>
              <textarea className="detail-textarea" rows={4}
                placeholder="Describe what you see — be as specific as possible…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            <div className="detail-section">
              <label className="detail-field-label">Location *</label>
              <input className="detail-input" type="text"
                placeholder="e.g. Near Main Bus Stand, MG Road, Sector 5"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                required
              />
            </div>

            <div className="detail-section">
              <label className="detail-field-label">Upload Photo / Video (optional)</label>
              <div className="detail-upload-zone">
                <Upload size={20} strokeWidth={1.75} color="var(--text-muted)" />
                <span>Click to add photos or video</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>JPG, PNG, MP4 — max 20MB</span>
              </div>
            </div>

            <div className="detail-section">
              <label className="detail-field-label">Additional Details (optional)</label>
              <textarea className="detail-textarea" rows={2}
                placeholder="Any additional context…"
                value={form.details}
                onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="civic-btn civic-btn-primary civic-btn-lg">Submit Report</button>
              <button type="button" className="civic-btn civic-btn-ghost" onClick={() => setReportFormOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default ReportForm;
