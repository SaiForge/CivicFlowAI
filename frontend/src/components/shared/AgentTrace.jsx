import React, { useState } from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle, ChevronDown, ChevronUp, Bot, Sparkles } from 'lucide-react';

const AgentTrace = ({ steps, compact = false, onRerun, isRerunning }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!steps || steps.length === 0) {
    return (
      <div className="agent-trace" style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        No audit log entries recorded yet.
      </div>
    );
  }

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className={`agent-trace ${compact ? 'agent-trace-compact' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div className="agent-trace-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Bot size={16} color="#b45309" />
          <span>7-Specialist Agent Audit Trail (स्वायत्त ऑडिट ट्रेल)</span>
        </div>
        {onRerun && (
          <button
            className="civic-btn civic-btn-xs civic-btn-ghost"
            onClick={onRerun}
            disabled={isRerunning}
            style={{ fontSize: '0.6875rem' }}
          >
            {isRerunning ? 'Rerunning Verification...' : '↻ Rerun AI Quality Gate'}
          </button>
        )}
      </div>

      <div className="agent-trace-steps">
        {steps.map((step, i) => {
          const isDone = step.status === 'done' || step.success;
          const isError = step.status === 'error' || step.success === false;
          const isExpanded = expandedIndex === i;

          return (
            <div key={i} className="agent-step">
              <div className="agent-step-line">
                {isDone ? (
                  <div className="agent-step-dot agent-step-done">
                    <CheckCircle2 size={12} strokeWidth={2.5} />
                  </div>
                ) : isError ? (
                  <div className="agent-step-dot" style={{ background: '#dc2626', color: '#fff' }}>
                    <AlertCircle size={12} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="agent-step-dot agent-step-active">
                    <Loader2 size={11} strokeWidth={2.5} className="spin" />
                  </div>
                )}
                {i < steps.length - 1 && <div className="agent-step-connector" />}
              </div>

              <div className="agent-step-content" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="agent-step-name" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{step.name || step.agent_name}</span>
                    {step.attempt > 0 && (
                      <span className="badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                        Retry #{step.attempt}
                      </span>
                    )}
                  </div>

                  {step.output && (
                    <button
                      className="btn-icon"
                      onClick={() => toggleExpand(i)}
                      style={{ padding: '0.15rem', width: 'auto', height: 'auto', background: 'none' }}
                      title="Toggle output details"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {step.detail && (
                  <div className="agent-step-detail" style={{ marginTop: '0.15rem' }}>
                    {step.detail}
                  </div>
                )}

                {/* Expanded Output JSON & Reasoning View */}
                {isExpanded && step.output && (
                  <div style={{ marginTop: '0.4rem', padding: '0.5rem 0.75rem', background: 'rgba(26,26,26,0.06)', borderRadius: '0.5rem', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    {step.reasoning && (
                      <div style={{ marginBottom: '0.35rem', color: '#b45309', fontWeight: 600 }}>
                        Reasoning: {step.reasoning}
                      </div>
                    )}
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: '8rem', overflowY: 'auto' }}>
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  </div>
                )}

                {step.ts && !compact && (
                  <div className="agent-step-ts" style={{ marginTop: '0.15rem' }}>
                    {new Date(step.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentTrace;
