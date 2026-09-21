import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useComplaint } from '../../hooks/useApi';
import { complaintsApi } from '../../services/api';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import AgentTrace from './AgentTrace';
import { X, MapPin, ThumbsUp, ThumbsDown, Upload, Loader2, Mic, Play, Pause, FileAudio } from 'lucide-react';

const DEPT_STATUSES = ['Submitted','Under Review','Assigned','In Progress','Resolution Submitted','Verification Pending','Resolved'];

const ComplaintDetail = () => {
  const { role, detailOpen, closeDetail, selectedComplaintId, currentUser, triggerRefresh } = useApp();
  const { data: c, loading, refetch } = useComplaint(selectedComplaintId);
  const [note, setNote] = useState('');
  const [statusOverride, setStatusOverride] = useState(null);
  const [saving, setSaving] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [resolutionFiles, setResolutionFiles] = useState([]);
  const [playingVoice, setPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const detailAudioRef = React.useRef(null);

  if (!detailOpen) return null;

  if (loading) return (
    <>
      <div className="detail-backdrop" onClick={closeDetail} />
      <div className="detail-drawer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    </>
  );

  if (!c) return null;

  const currentStatus = statusOverride || c.status;

  const fmtTs = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  const verificationLabel = c.resolutionEvidence?.verificationState === 'verified'
    ? '✓ Resolution Verified'
    : c.resolutionEvidence?.verificationState === 'awaiting'
    ? '⏳ Awaiting AI Verification'
    : '— No Resolution Submitted';

  const handleVote = async (direction) => {
    setVoteLoading(true);
    try {
      await complaintsApi.vote(c.id, direction);
      await refetch();
      if (triggerRefresh) triggerRefresh();
    } catch { /* ignore */ }
    finally { setVoteLoading(false); }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (statusOverride) payload.status = statusOverride;
      if (note.trim()) payload.internal_note = note.trim();
      await complaintsApi.update(c.id, payload);

      // Upload resolution images if any
      if (resolutionFiles.length > 0) {
        await complaintsApi.uploadResolutionImages(c.id, resolutionFiles, 'resolution_after');
      }

      await refetch();
      if (triggerRefresh) triggerRefresh();
      setNote('');
      setResolutionFiles([]);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleEscalate = async () => {
    setSaving(true);
    try {
      await complaintsApi.update(c.id, { status: 'Escalated' });
      await refetch();
      if (triggerRefresh) triggerRefresh();
      setStatusOverride('Escalated');
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleToggleVoicePlayback = () => {
    if (!detailAudioRef.current) return;
    if (playingVoice) {
      detailAudioRef.current.pause();
      setPlayingVoice(false);
    } else {
      detailAudioRef.current.play()
        .then(() => setPlayingVoice(true))
        .catch(err => console.warn('Playback error:', err));
    }
  };

  const voiceNoteItem = (c.images || []).find(img => img.image_type === 'voice_note' || img.mime_type?.startsWith('audio/'));
  const voiceUrl = c.voiceNoteUrl || (voiceNoteItem ? `${import.meta.env.VITE_API_URL || ''}${voiceNoteItem.url}` : null);
  const photoImages = (c.images || []).filter(img => img.image_type !== 'voice_note' && !img.mime_type?.startsWith('audio/'));

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

          {/* Citizen Recorded Voice Grievance Card */}
          {voiceUrl && (
            <div className="detail-section">
              <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mic size={14} color="#b45309" />
                <span>Recorded Voice Grievance</span>
              </div>
              <div className="detail-voice-card">
                <audio
                  ref={detailAudioRef}
                  src={voiceUrl}
                  onEnded={() => setPlayingVoice(false)}
                  onTimeUpdate={(e) => setVoiceProgress(e.target.currentTime)}
                  onLoadedMetadata={(e) => setVoiceDuration(e.target.duration)}
                  preload="metadata"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className={`detail-voice-play-btn ${playingVoice ? 'playing' : ''}`}
                  onClick={handleToggleVoicePlayback}
                  title={playingVoice ? 'Pause Voice Note' : 'Listen to Voice Grievance'}
                >
                  {playingVoice ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
                </button>
                <div className="detail-voice-content">
                  <div className="detail-voice-title">Citizen Spoken Explanation</div>
                  <div className="detail-voice-track">
                    <div className="voice-track-waveform detail-waveform-mini">
                      {[30, 60, 90, 50, 20, 80, 100, 70, 40, 85, 60, 95, 40, 75, 55, 30].map((h, i) => (
                        <span
                          key={i}
                          className={`voice-track-bar ${playingVoice ? 'bar-animating' : ''}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <span className="detail-voice-time">
                      {Math.floor(voiceProgress / 60)}:{String(Math.floor(voiceProgress % 60)).padStart(2, '0')}
                      {voiceDuration ? ` / ${Math.floor(voiceDuration / 60)}:${String(Math.floor(voiceDuration % 60)).padStart(2, '0')}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Images */}
          {photoImages.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Uploaded Evidence ({photoImages.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {photoImages.map((img) => (
                  <a key={img.id} href={`${import.meta.env.VITE_API_URL || ''}${img.url}`} target="_blank" rel="noopener noreferrer">
                    {img.mime_type?.startsWith('image/') ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || ''}${img.url}`}
                        alt={img.original_filename || 'evidence'}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 80, height: 80, background: 'var(--dark-card)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.25rem' }}>
                        {img.original_filename || 'media'}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Classification */}
          {c.aiClassification && (
            <div className="detail-section">
              <div className="detail-section-title">AI Classification</div>
              <div className="detail-ai-row">
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Category</span>
                  <span className="detail-ai-value">{c.aiClassification.category}</span>
                </div>
                <div className="detail-ai-item">
                  <span className="detail-ai-label">Confidence</span>
                  <span className="detail-ai-value">{Math.round((c.aiClassification.confidence || 0) * 100)}%</span>
                </div>
                {c.aiSeverity && (
                  <div className="detail-ai-item">
                    <span className="detail-ai-label">Priority Reasoning</span>
                    <span className="detail-ai-value" style={{ fontSize: '0.75rem' }}>{c.aiSeverity.reasoning}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent Trace */}
          {(role === 'admin' || role === 'dept') && c.agentSteps?.length > 0 && (
            <div className="detail-section">
              <AgentTrace steps={c.agentSteps} />
            </div>
          )}

          {/* Timeline */}
          <div className="detail-section">
            <div className="detail-section-title">Activity Timeline</div>
            <div className="detail-timeline">
              {(c.timeline || []).map((evt, i) => (
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
                <button className="vote-btn vote-btn-active-up" disabled={voteLoading} onClick={() => handleVote('up')}>
                  <ThumbsUp size={13} strokeWidth={1.75}/> Support · {c.supportCount}
                </button>
                <button className="vote-btn" disabled={voteLoading} onClick={() => handleVote('down')}>
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
                  <div className="detail-upload-zone" onClick={() => document.getElementById('res-file-input').click()} style={{ cursor: 'pointer' }}>
                    <Upload size={18} strokeWidth={1.75} color="var(--text-muted)" />
                    <span>Click to upload before/after images</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>JPG, PNG, MP4</span>
                  </div>
                  <input id="res-file-input" type="file" accept="image/*,video/mp4" multiple style={{ display: 'none' }}
                    onChange={(e) => setResolutionFiles(Array.from(e.target.files))}
                  />
                  {resolutionFiles.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>
                      {resolutionFiles.length} file(s) ready to upload
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="civic-btn civic-btn-primary" onClick={handleSaveChanges} disabled={saving}>
                    {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
                  </button>
                  <button className="civic-btn civic-btn-ghost" onClick={() => { setStatusOverride(null); setNote(''); }}>Cancel</button>
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
                {c.internalNotes?.length > 0 && (
                  <div>
                    <label className="detail-field-label">Department Notes</label>
                    {c.internalNotes.map((n, i) => (
                      <div key={i} className="detail-admin-note">{n}</div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="civic-btn civic-btn-primary">Reassign Department</button>
                  <button className="civic-btn civic-btn-ghost" onClick={handleEscalate} disabled={saving}>
                    {saving ? 'Escalating…' : 'Escalate'}
                  </button>
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
