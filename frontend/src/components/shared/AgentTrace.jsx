import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const AgentTrace = ({ steps, compact = false }) => {
  return (
    <div className={`agent-trace ${compact ? 'agent-trace-compact' : ''}`}>
      {!compact && <div className="agent-trace-title">AI Agent Activity</div>}
      <div className="agent-trace-steps">
        {steps.map((step, i) => (
          <div key={i} className="agent-step">
            <div className="agent-step-line">
              {step.status === 'done' ? (
                <div className="agent-step-dot agent-step-done">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                </div>
              ) : step.status === 'active' ? (
                <div className="agent-step-dot agent-step-active">
                  <Loader2 size={11} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="agent-step-dot agent-step-pending">
                  <Circle size={8} strokeWidth={2} />
                </div>
              )}
              {i < steps.length - 1 && <div className="agent-step-connector" />}
            </div>
            <div className="agent-step-content">
              <div className="agent-step-name">{step.name}</div>
              {step.detail && <div className="agent-step-detail">{step.detail}</div>}
              {step.ts && !compact && (
                <div className="agent-step-ts">
                  {new Date(step.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentTrace;
