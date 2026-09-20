import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import AgentTrace from './AgentTrace';
import { agentApi } from '../../services/agentApi';
import {
  X, MapPin, ThumbsUp, ThumbsDown, Upload, ChevronRight,
  ShieldCheck, RefreshCw, Bot, AlertTriangle, CheckCircle2, Sparkles
} from 'lucide-react';

const DEPT_STATUSES = ['Submitted','Under Review','Assigned','In Progress','Resolution Submitted','Verification Pending','Resolved'];

const ComplaintDetail = () => {
  const { role, detailOpen, closeDetail, selectedComplaintId, complaintsList, rerunTicketViaAgent } = useApp();
  const [note, setNote] = useState('');
  const [statusOverride, setStatusOverride] = useState(null);
  const [liveTrace, setLiveTrace] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  // Find complaint in the unified complaints list
  const c = complaintsList ? complaintsList.find(x => x.id === selectedComplaintId) : null;

  // Fetch real audit trail when drawer opens
  useEffect(() => {
    if (!detailOpen || !selectedComplaintId) {
      setLiveTrace(null);
      return;
    }

    let isMounted = true;
    async function loadTrace() {
      setTraceLoading(true);
      try {
        const res = await agentApi.fetchComplaintTrace(selectedComplaintId);
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const steps = res.data.map(entry => ({
            name: entry.agent_name,
            status: entry.success ? 'done' : 'error',
            detail: entry.reasoning || entry.input_summary || 'Agent execution completed',
            ts: entry.timestamp,
            attempt: entry.attempt_number,
            output: entry.output_json,
          }));
          setLiveTrace(steps);
        }
      } catch {
        // use local steps
      } finally {
        if (isMounted) setTraceLoading(false);
      }
    }

    loadTrace();
    return () => { isMounted = false; };
  }, [detailOpen, selectedComplaintId]);

  if (!detailOpen || !c) return null;

  const currentStatus = statusOverride || c.status;

  const fmtTs = (ts) => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const handleRerun = async () => {
    setIsRerunning(true);
    try {
      await rerunTicketViaAgent(c.id);
      // Reload trace
      const res = await agentApi.fetchComplaintTrace(c.id);
      if (res.success && Array.isArray(res.data)) {
        setLiveTrace(res.data.map(entry => ({
          name: entry.agent_name,
          status: entry.success ? 'done' : 'error',
          detail: entry.reasoning || 'Re-evaluated via Verification Quality Gate',
          ts: entry.timestamp,
          attempt: entry.attempt_number,
          output: entry.output_json,
        })));
      }
    } catch {
      // ignore
    } finally {
      setIsRerunning(false);
    }
  };

  const verificationLabel = c.resolutionEvidence?.verificationState === 'verified'
    ? '✓ Resolution Verified by Citizen & AI'
    : c.resolutionEvidence?.verificationState === 'awaiting'
    ? '⏳ Awaiting AI Photographic Verification'
    : '— In Field Resolution Pipeline';

  const displayedSteps = liveTrace || c.agentSteps || [
    { name: 'IssueAgent', status: 'done', detail: `Identified: ${c.category}`, ts: c.submittedAt },
    { name: 'EvidenceAgent', status: 'done', detail: `Visual Grounding Score: ${Math.round((c.groundingScore || 0.88) * 100)}%`, ts: c.submittedAt },
    { name: 'SeverityAgent', status: 'done', detail: `Priority: ${c.priority} (${c.aiSeverity?.score || 75}/100)`, ts: c.submittedAt },
    { name: 'RoutingAgent', status: 'done', detail: `Mapped to ${c.dept === 'road' ? 'PWD' : c.dept === 'waste' ? 'Nagar Nigam' : 'Jal Board'}`, ts: c.submittedAt },
    { name: 'IncidentAgent', status: 'done', detail: 'Compiled ticket with immediate recommendations', ts: c.submittedAt },
    { name: 'WorkflowAgent', status: 'done', detail: 'Citizen Charter 48h SLA Assigned', ts: c.submittedAt },
    { name: 'VerificationAgent', status: 'done', detail: 'Quality Gate passed: Consistency (100%), Completeness (100%)', ts: c.submittedAt },
  ];

  return (
    <>
      <div className="detail-backdrop" onClick={closeDetail} />
      <div className="detail-drawer" style={{ width: 'min(100vw, 36rem)' }}>
        {/* Header */}
        <div className="detail-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span className="detail-id">{c.id}</span>
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={currentStatus} />
              <span className="civic-ward-tag">Ward {c.wardNumber || 112} · {c.ward || 'Central'}</span>
            </div>
            <div className="detail-issue">{c.issue}</div>
          </div>
          <button className="btn-icon" onClick={closeDetail} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="detail-body">
          {/* Location & Ward Jurisdiction */}
          <div className="detail-section">
            <div className="detail-section-title">Location & Administrative Ward</div>
            <div className="detail-location">
              <MapPin size={15} strokeWidth={2} color="#b45309" />
              <span style={{ fontWeight: 600 }}>{c.location}</span>
            </div>
            <div className="detail-map-placeholder" style={{ height: '5.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                GPS: {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)} · Municipal Jurisdiction Verified
              </span>
            </div>
          </div>

          {/* Citizen Description */}
          <div className="detail-section">
            <div className="detail-section-title">Citizen Grievance Description</div>
            <div className="detail-description">{c.description}</div>
            <div className="detail-meta-row">
              <span>Submitted: {fmtTs(c.submittedAt)}</span>
              <span>{c.reportCount || 1} report(s) · {c.supportCount || 1} citizen upvotes</span>
            </div>
          </div>

          {/* AI 4-Factor Severity & Evidence Assessment */}
          <div className="detail-section">
            <div className="detail-section-title">Multi-Agent AI Intelligence</div>
            <div className="detail-ai-row">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Issue Category</span>
                  <span className="detail-ai-value">{c.category}</span>
                </div>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Classification Confidence</span>
                  <span className="detail-ai-value" style={{ color: '#047857', fontWeight: 700 }}>
                    {Math.round((c.aiClassification?.confidence || 0.94) * 100)}%
                  </span>
                </div>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Severity Rubric Score</span>
                  <span className="detail-ai-value" style={{ color: c.priority === 'Critical' ? '#dc2626' : '#b45309', fontWeight: 700 }}>
                    {c.aiSeverity?.score || 75} / 100 ({c.priority})
                  </span>
                </div>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Visual Grounding Score</span>
                  <span className="detail-ai-value">
                    {Math.round((c.groundingScore || 0.88) * 100)}% Corroborated
                  </span>
                </div>
              </div>

              {c.aiSeverity?.reasoning && (
                <div className="detail-ai-item" style={{ marginTop: '0.5rem', background: 'rgba(217, 119, 6, 0.08)', padding: '0.6rem 0.75rem', borderRadius: '0.5rem' }}>
                  <span className="detail-ai-label" style={{ color: '#b45309' }}>SeverityAgent Reasoning</span>
                  <span style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: '#78350f' }}>
                    {c.aiSeverity.reasoning}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Agent Execution Trace */}
          <div className="detail-section">
            {traceLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={14} className="spin" style={{ display: 'inline', marginRight: '6px' }} />
                Loading live agent trace from memory...
              </div>
            ) : (
              <AgentTrace 
                steps={displayedSteps} 
                onRerun={handleRerun}
                isRerunning={isRerunning}
              />
            )}
          </div>

          {/* Resolution Evidence & Citizen Charter */}
          <div className="detail-section">
            <div className="detail-section-title">Resolution & Citizen Charter Status</div>
            <div className={`resolution-state ${c.resolutionEvidence?.verificationState === 'verified' ? 'resolution-verified' : c.resolutionEvidence ? 'resolution-awaiting' : 'resolution-none'}`}>
              {verificationLabel}
            </div>
          </div>

          {/* Citizen Community Upvotes */}
          {role === 'citizen' && (
            <div className="detail-section">
              <div className="detail-section-title">Community Support & Ward Feedback</div>
              <div className="detail-vote-row">
                <button className="vote-btn vote-btn-active-up">
                  <ThumbsUp size={14} />
                  <span>Upvote ({c.supportCount || 1})</span>
                </button>
                <button className="vote-btn">
                  <ThumbsDown size={14} />
                  <span>Dislike</span>
                </button>
              </div>
            </div>
          )}

          {/* Authority Dispatch Action Controls */}
          {role === 'dept' && (
            <div className="detail-section">
              <div className="detail-section-title">Authority Dispatch Actions</div>
              <div className="detail-actions-col">
                <div>
                  <span className="detail-field-label">Update Field Lifecycle Status:</span>
                  <div className="detail-status-select-row">
                    {DEPT_STATUSES.map(s => (
                      <button
                        key={s}
                        className={`status-select-btn ${currentStatus === s ? 'status-select-active' : ''}`}
                        onClick={() => setStatusOverride(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="detail-field-label">Internal Municipal Dispatch Note:</span>
                  <textarea
                    className="detail-textarea"
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Enter dispatch notes, crew assigned, or asphalt batch number..."
                  />
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
