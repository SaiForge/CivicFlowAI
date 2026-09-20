import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { complaints } from '../../data/mockData';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import AgentTrace from './AgentTrace';
import { X, MapPin, ThumbsUp, ThumbsDown, Upload, ChevronRight } from 'lucide-react';

const DEPT_STATUSES = ['Submitted','Under Review','Assigned','In Progress','Resolution Submitted','Verification Pending','Resolved'];

const ComplaintDetail = () => {
  const { role, detailOpen, closeDetail, selectedComplaintId } = useApp();
  const [note, setNote] = useState('');
  const [statusOverride, setStatusOverride] = useState(null);

  if (!detailOpen) return null;
  const c = complaints.find(x => x.id === selectedComplaintId);
  if (!c) return null;

  const currentStatus = statusOverride || c.status;

  const fmtTs = (ts) => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const verificationLabel = c.resolutionEvidence?.verificationState === 'verified'
    ? '✓ Resolution Verified'
    : c.resolutionEvidence?.verificationState === 'awaiting'
    ? '⏳ Awaiting AI Verification'
    : '— No Resolution Submitted';

  return (
    <>
      <div className="detail-backdrop" onClick={closeDetail} />
      <div className="detail-drawer">
        {/* Header */}
        <div className="detail-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="detail-id">{c.id}</span>
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={currentStatus} />
            </div>
            <div className="detail-issue">{c.issue}</div>
          </div>
          <button className="btn-icon" onClick={closeDetail} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="detail-body">
          {/* Location */}
          <div className="detail-section">
            <div className="detail-section-title">Location</div>
            <div className="detail-location">
              <MapPin size={14} strokeWidth={1.75} />
              <span>{c.location}</span>
            </div>
            <div className="detail-map-placeholder">
              <MapPin size={28} strokeWidth={1.5} color="var(--text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.location}</span>
            </div>
          </div>

          {/* Citizen Report */}
          <div className="detail-section">
            <div className="detail-section-title">Citizen Report</div>
            <div className="detail-description">{c.description}</div>
            <div className="detail-meta-row">
              <span>Submitted: {fmtTs(c.submittedAt)}</span>
              <span>{c.reportCount} reports · {c.supportCount} support</span>
            </div>
          </div>

          {/* AI Classification */}
          <div className="detail-section">
            <div className="detail-section-title">AI Classification</div>
            <div className="detail-ai-row">
              <div className="detail-ai-item">
                <span className="detail-ai-label">Category</span>
                <span className="detail-ai-value">{c.aiClassification.category}</span>
              </div>
              <div className="detail-ai-item">
                <span className="detail-ai-label">Confidence</span>
                <span className="detail-ai-value">{Math.round(c.aiClassification.confidence * 100)}%</span>
              </div>
              <div className="detail-ai-item">
                <span className="detail-ai-label">Priority Reasoning</span>
                <span className="detail-ai-value" style={{ fontSize: '0.75rem' }}>{c.aiSeverity.reasoning}</span>
              </div>
            </div>
          </div>

          {/* Agent Trace */}
          {(role === 'admin' || role === 'dept') && (
            <div className="detail-section">
              <AgentTrace steps={c.agentSteps} />
            </div>
          )}

          {/* Timeline */}
          <div className="detail-section">
            <div className="detail-section-title">Activity Timeline</div>
            <div className="detail-timeline">
              {c.timeline.map((evt, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  {i < c.timeline.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-content">
                    <div className="timeline-event">{evt.event}</div>
                    <div className="timeline-meta">{evt.actor} · {fmtTs(evt.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Evidence */}
          <div className="detail-section">
            <div className="detail-section-title">Resolution Evidence</div>
            <div className={`resolution-state ${c.resolutionEvidence?.verificationState === 'verified' ? 'resolution-verified' : c.resolutionEvidence ? 'resolution-awaiting' : 'resolution-none'}`}>
              {verificationLabel}
            </div>
            {c.resolutionEvidence && (
              <div className="detail-ai-row" style={{ marginTop: '0.5rem' }}>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Before</span>
                  <span className="detail-ai-value">{c.resolutionEvidence.beforeNote}</span>
                </div>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">After</span>
                  <span className="detail-ai-value">{c.resolutionEvidence.afterNote}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Citizen Actions ── */}
          {role === 'citizen' && (
            <div className="detail-section">
              <div className="detail-section-title">Community Interaction</div>
              <div className="detail-vote-row">
                <button className="vote-btn vote-btn-active-up">
                  <ThumbsUp size={13} strokeWidth={1.75}/> Support · {c.supportCount}
                </button>
                <button className="vote-btn">
                  <ThumbsDown size={13} strokeWidth={1.75}/> Not Relevant · {c.dislikeCount}
                </button>
              </div>
            </div>
          )}

          {/* ── Department Actions ── */}
          {role === 'dept' && (
            <div className="detail-section">
              <div className="detail-section-title">Department Actions</div>
              <div className="detail-actions-col">
                <div>
                  <label className="detail-field-label">Update Status</label>
                  <div className="detail-status-select-row">
                    {DEPT_STATUSES.map(s => (
                      <button key={s}
                        className={`status-select-btn ${currentStatus === s ? 'status-select-active' : ''}`}
                        onClick={() => setStatusOverride(s)}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="detail-field-label">Internal Note</label>
                  <textarea className="detail-textarea"
                    placeholder="Add an internal note for your team…"
                    value={note} onChange={e => setNote(e.target.value)} rows={3}
                  />
                </div>
                <div>
                  <label className="detail-field-label">Upload Resolution Evidence</label>
                  <div className="detail-upload-zone">
                    <Upload size={18} strokeWidth={1.75} color="var(--text-muted)" />
                    <span>Click to upload before/after images</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>JPG, PNG, MP4</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="civic-btn civic-btn-primary">Save Changes</button>
                  <button className="civic-btn civic-btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Admin Actions ── */}
          {role === 'admin' && (
            <div className="detail-section">
              <div className="detail-section-title">Admin Controls</div>
              <div className="detail-actions-col">
                <div>
                  <label className="detail-field-label">Assigned Department</label>
                  <div className="detail-admin-info">{c.dept ? c.dept.charAt(0).toUpperCase() + c.dept.slice(1) + ' Department' : 'Unassigned'}</div>
                </div>
                {c.internalNotes.length > 0 && (
                  <div>
                    <label className="detail-field-label">Department Notes</label>
                    {c.internalNotes.map((n, i) => (
                      <div key={i} className="detail-admin-note">{n}</div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="civic-btn civic-btn-primary">Reassign Department</button>
                  <button className="civic-btn civic-btn-ghost">Escalate</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ComplaintDetail;
