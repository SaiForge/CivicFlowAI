import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SPECIALIST_AGENTS, agentApi } from '../../services/agentApi';
import {
  Bot, ShieldCheck, Play, RefreshCw, CheckCircle2, AlertTriangle,
  Cpu, Wrench, Layers, Clock, ArrowRight, Sparkles, Activity, FileText, Check
} from 'lucide-react';

const PRESET_SCENARIOS = [
  {
    title: 'Severe Indiranagar Pothole',
    text: 'Massive crater-like pothole near Indiranagar 100 Feet Road metro pillar 42. Extremely hazardous for two-wheelers in the rain.',
    area: 'Indiranagar 100ft Road, Bengaluru',
    lat: 12.9783,
    lng: 77.6408,
    ward: 'Indiranagar',
    expectedDept: 'Roads & Infrastructure Department',
    expectedSeverity: 'Critical',
  },
  {
    title: 'Commercial Garbage Overflow',
    text: 'Massive uncollected garbage accumulation outside Russell Market for 5 days. Foul stench and stray dogs tearing open black bags.',
    area: 'Russell Market, Shivajinagar, Bengaluru',
    lat: 12.9856,
    lng: 77.6033,
    ward: 'Shivajinagar',
    expectedDept: 'Sanitation Department',
    expectedSeverity: 'High',
  },
  {
    title: 'Jal Board Pipeline Leakage',
    text: 'Main drinking water pipeline burst near Koramangala 5th Block water tank. Thousands of liters clean water wasting into storm drain.',
    area: '5th Block, Koramangala, Bengaluru',
    lat: 12.9345,
    lng: 77.6265,
    ward: 'Koramangala',
    expectedDept: 'Water Board',
    expectedSeverity: 'High',
  },
  {
    title: 'Dark Streetlight Corridor',
    text: 'Entire row of 12 streetlights non-functional on BTM 2nd Stage Ring Road. Road pitch dark for 800 meters leading to mugging fears.',
    area: 'BTM Layout 2nd Stage, Bengaluru',
    lat: 12.9165,
    lng: 77.6101,
    ward: 'BTM Layout',
    expectedDept: 'Electrical Department',
    expectedSeverity: 'Medium',
  },
];

const AgentConsole = () => {
  const { backendConnected, agentHealth, submitComplaintViaAgent } = useApp();
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0]);
  const [customText, setCustomText] = useState(PRESET_SCENARIOS[0].text);
  const [customArea, setCustomArea] = useState(PRESET_SCENARIOS[0].area);
  const [hasPhotoProof, setHasPhotoProof] = useState(true);

  // Live test run states
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(null); // 1, 2, 3
  const [pipelineResult, setPipelineResult] = useState(null);
  const [activeTab, setActiveTab] = useState('agents'); // 'agents' | 'tester' | 'rubric'

  const handleSelectPreset = (scenario) => {
    setSelectedScenario(scenario);
    setCustomText(scenario.text);
    setCustomArea(scenario.area);
    setPipelineResult(null);
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setPipelineResult(null);

    // Simulate animated execution stages progression
    setCurrentStage(1);
    await new Promise(r => setTimeout(r, 600));

    setCurrentStage(2);
    await new Promise(r => setTimeout(r, 600));

    setCurrentStage(3);
    await new Promise(r => setTimeout(r, 600));

    // Resolve location
    const geocode = await agentApi.forwardGeocode(customArea);

    const res = await submitComplaintViaAgent({
      description: customText,
      imageBase64: hasPhotoProof ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null,
      location: geocode || { lat: 12.9783, lng: 77.6408, ward: 'Indiranagar' },
    });

    setIsRunning(false);
    setCurrentStage(null);

    if (res.success) {
      setPipelineResult(res.ticket);
    }
  };

  return (
    <div className="civic-page agent-console-page">
      {/* ── Header Banner ── */}
      <div className="civic-page-header">
        <div>
          <div className="indian-civic-badge" style={{ marginBottom: '0.4rem' }}>
            <span className="tricolor-marker" />
            <span>स्वायत्त नियंत्रण कक्ष · Autonomous Multi-Agent Core</span>
          </div>
          <h2 className="welcome-text">
            Multi-Agent <span>AI Operations Hub</span>
          </h2>
          <p className="card-sub" style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600 }}>
            7 Coordinated Specialist Agents with Autonomous Verification & Self-Correction Cascade
          </p>
        </div>

        {/* Live Backend Connection Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span 
            className="badge" 
            style={{ 
              background: backendConnected ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.15)',
              color: backendConnected ? '#15803d' : '#b45309',
              padding: '0.45rem 0.85rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span className={backendConnected ? 'live-pulsing-dot' : 'chakra-dot'} />
            {backendConnected ? 'FastAPI Backend: Live & Connected' : 'Resilient Dual-Mode (Offline Engine Active)'}
          </span>
        </div>
      </div>

      {/* ── Top Navigation Tabs ── */}
      <div className="section-tabs-wrap">
        <div className="section-tabs">
          <button
            className={`section-tab ${activeTab === 'agents' ? 'section-tab-active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <Bot size={15} />
            <span>Specialist Agents Registry (7 एजेंट)</span>
          </button>
          <button
            className={`section-tab ${activeTab === 'tester' ? 'section-tab-active' : ''}`}
            onClick={() => setActiveTab('tester')}
          >
            <Play size={15} />
            <span>Interactive Pipeline Runner (लाइव टेस्ट)</span>
          </button>
          <button
            className={`section-tab ${activeTab === 'rubric' ? 'section-tab-active' : ''}`}
            onClick={() => setActiveTab('rubric')}
          >
            <ShieldCheck size={15} />
            <span>4-Factor Severity & Quality Gate</span>
          </button>
        </div>
      </div>

      {/* ── View 1: 7 Specialist Agents Registry ── */}
      {activeTab === 'agents' && (
        <div className="agent-registry-view">
          <div className="card admin-ai-engine-banner" style={{ marginBottom: '1.25rem' }}>
            <div className="admin-ai-banner-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="admin-ai-badge-icon">
                  <Sparkles size={22} color="#1e3a8a" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a' }}>
                    Orchestrated 3-Stage Pipeline Architecture
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Managed by central <code>ManagerAgent</code> with parallel execution of Stage 1 & 2, bounded by Stage 3 Verification Quality Gate.
                  </span>
                </div>
              </div>

              <div className="admin-ai-stats-strip">
                <div className="ai-stat-mini">
                  <span className="ai-stat-val">7</span>
                  <span className="ai-stat-lbl">Specialists</span>
                </div>
                <div className="ai-stat-mini">
                  <span className="ai-stat-val">3</span>
                  <span className="ai-stat-lbl">Stages</span>
                </div>
                <div className="ai-stat-mini">
                  <span className="ai-stat-val">&gt; 0.70</span>
                  <span className="ai-stat-lbl">Conf. Gate</span>
                </div>
                <div className="ai-stat-mini">
                  <span className="ai-stat-val">2</span>
                  <span className="ai-stat-lbl">Max Retries</span>
                </div>
              </div>
            </div>
          </div>

          <div className="specialist-agents-grid">
            {SPECIALIST_AGENTS.map((agent, index) => (
              <div key={agent.id} className="card agent-card">
                <div className="agent-card-top">
                  <div className="agent-badge-num" style={{ background: `${agent.color}18`, color: agent.color }}>
                    0{index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="agent-card-title">{agent.name}</div>
                    <div className="agent-card-stage">{agent.stage}</div>
                  </div>
                  <span className="badge badge-yellow" style={{ fontSize: '0.65rem' }}>{agent.status}</span>
                </div>

                <div className="agent-hindi-sub">{agent.hindi}</div>
                <div className="agent-card-role">{agent.role}</div>
                <p className="agent-card-desc">{agent.description}</p>

                <div className="agent-tools-wrap">
                  <span className="agent-tools-lbl">Assigned Tools:</span>
                  <div className="agent-tools-pills">
                    {agent.tools.map(t => (
                      <span key={t} className="agent-tool-tag">
                        <Wrench size={10} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View 2: Interactive Pipeline Runner ── */}
      {activeTab === 'tester' && (
        <div className="pipeline-tester-view">
          {/* Preset Scenario Selector */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem', color: '#b45309' }}>
              Select Live Civic Scenario to Test:
            </div>
            <div className="scenario-chips-row">
              {PRESET_SCENARIOS.map((sc, i) => (
                <button
                  key={i}
                  className={`scenario-chip ${selectedScenario.title === sc.title ? 'scenario-chip-active' : ''}`}
                  onClick={() => handleSelectPreset(sc)}
                >
                  <span style={{ fontWeight: 700 }}>{sc.title}</span>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.75 }}>({sc.ward})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="civic-two-col" style={{ alignItems: 'flex-start' }}>
            {/* Input Form Column */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                Pipeline Input Parameters
              </div>

              <div>
                <label className="detail-field-label">Complaint Description (नागरिक विवरण):</label>
                <textarea
                  className="detail-textarea"
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter detailed civic problem..."
                />
              </div>

              <div>
                <label className="detail-field-label">Location / Area (वार्ड या पता):</label>
                <input
                  type="text"
                  className="detail-input"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="e.g. Indiranagar 100 Feet Road"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <input
                  type="checkbox"
                  id="hasPhotoCheck"
                  checked={hasPhotoProof}
                  onChange={(e) => setHasPhotoProof(e.target.checked)}
                  style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                />
                <label htmlFor="hasPhotoCheck" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                  Simulate High-Resolution Geotagged Photographic Proof (EvidenceAgent Input)
                </label>
              </div>

              <button
                className="civic-btn civic-btn-primary"
                onClick={handleRunPipeline}
                disabled={isRunning}
                style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                {isRunning ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Executing 7-Agent Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Execute 7-Agent Pipeline (लाइव चलाएं)</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Stepper & Results Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Animated Execution Stages */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.875rem' }}>
                  Execution Pipeline Progress
                </div>

                <div className="tester-stages-stepper">
                  <div className={`tester-step ${currentStage === 1 ? 'tester-step-active' : currentStage > 1 || pipelineResult ? 'tester-step-done' : ''}`}>
                    <div className="tester-step-indicator">1</div>
                    <div className="tester-step-info">
                      <div className="tester-step-name">Stage 1: Ingestion & Analysis</div>
                      <div className="tester-step-sub">IssueAgent, EvidenceAgent, SeverityAgent (Parallel)</div>
                    </div>
                  </div>

                  <div className={`tester-step ${currentStage === 2 ? 'tester-step-active' : currentStage > 2 || pipelineResult ? 'tester-step-done' : ''}`}>
                    <div className="tester-step-indicator">2</div>
                    <div className="tester-step-info">
                      <div className="tester-step-name">Stage 2: Operationalization</div>
                      <div className="tester-step-sub">RoutingAgent, IncidentAgent, WorkflowAgent (Parallel)</div>
                    </div>
                  </div>

                  <div className={`tester-step ${currentStage === 3 ? 'tester-step-active' : pipelineResult ? 'tester-step-done' : ''}`}>
                    <div className="tester-step-indicator">3</div>
                    <div className="tester-step-info">
                      <div className="tester-step-name">Stage 3: Verification Quality Gate</div>
                      <div className="tester-step-sub">VerificationAgent: Completeness & Consistency Check</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline Output Result Card */}
              {pipelineResult && (
                <div className="card" style={{ padding: '1.5rem', border: '1.5px solid #047857' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={20} color="#047857" />
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#047857' }}>
                        Ticket Verified & Dispatched
                      </span>
                    </div>
                    <span className="badge badge-dark" style={{ fontFamily: 'monospace' }}>
                      {pipelineResult.id}
                    </span>
                  </div>

                  <div className="pipeline-output-grid">
                    <div>
                      <span className="output-lbl">Assigned Department</span>
                      <span className="output-val">{pipelineResult.dept === 'road' ? 'Roads & Infrastructure (PWD)' : pipelineResult.dept === 'waste' ? 'Sanitation Department (Nagar Nigam)' : pipelineResult.dept === 'water' ? 'Water Supply Board (Jal Board)' : 'Electrical Department (DISCOM)'}</span>
                    </div>
                    <div>
                      <span className="output-lbl">Severity Rubric Score</span>
                      <span className="output-val" style={{ color: pipelineResult.priority === 'Critical' ? '#dc2626' : '#b45309' }}>
                        {pipelineResult.aiSeverity?.score || 85}/100 ({pipelineResult.priority})
                      </span>
                    </div>
                    <div>
                      <span className="output-lbl">Evidence Grounding</span>
                      <span className="output-val">
                        {Math.round((pipelineResult.groundingScore || 0.88) * 100)}% Verified
                      </span>
                    </div>
                    <div>
                      <span className="output-lbl">Municipal SLA Window</span>
                      <span className="output-val">
                        {pipelineResult.priority === 'Critical' ? '4-Hour Emergency' : '48-Hour Charter'}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '0.75rem', fontSize: '0.8125rem' }}>
                    <strong>Immediate Recommendation:</strong> {pipelineResult.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: 4-Factor Severity & Quality Gate ── */}
      {activeTab === 'rubric' && (
        <div className="rubric-view">
          <div className="civic-two-col">
            {/* 4-Factor Rubric Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 className="card-title" style={{ marginBottom: '0.25rem' }}>
                4-Factor Weighted Severity Rubric (SeverityAgent)
              </h4>
              <p className="card-sub" style={{ marginBottom: '1.25rem' }}>
                Deterministic formula producing objective 0-100 hazard scores.
              </p>

              <div className="rubric-factors-list">
                <div className="rubric-factor-item">
                  <div className="rubric-factor-header">
                    <span style={{ fontWeight: 700 }}>1. Safety & Physical Risk</span>
                    <span className="badge badge-yellow">35% Weight</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '35%', background: '#dc2626' }} />
                  </div>
                  <span className="rubric-factor-desc">
                    Immediate bodily injury, vehicular collisions, or structural cave-in risks.
                  </span>
                </div>

                <div className="rubric-factor-item">
                  <div className="rubric-factor-header">
                    <span style={{ fontWeight: 700 }}>2. Public Disruption & Traffic Volume</span>
                    <span className="badge badge-yellow">25% Weight</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '25%', background: '#d97706' }} />
                  </div>
                  <span className="rubric-factor-desc">
                    Proximity to metro stations, arterial bus routes, hospitals, or schools.
                  </span>
                </div>

                <div className="rubric-factor-item">
                  <div className="rubric-factor-header">
                    <span style={{ fontWeight: 700 }}>3. Historical Recurrence & Cluster Frequency</span>
                    <span className="badge badge-yellow">20% Weight</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '20%', background: '#2563eb' }} />
                  </div>
                  <span className="rubric-factor-desc">
                    Number of correlated citizen complaints logged in LongTermMemory for this coordinate.
                  </span>
                </div>

                <div className="rubric-factor-item">
                  <div className="rubric-factor-header">
                    <span style={{ fontWeight: 700 }}>4. Visual Hazard Magnitude</span>
                    <span className="badge badge-yellow">20% Weight</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '20%', background: '#7c3aed' }} />
                  </div>
                  <span className="rubric-factor-desc">
                    Pixel area of damage identified by EvidenceAgent computer vision.
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Gate Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 className="card-title" style={{ marginBottom: '0.25rem' }}>
                Stage 3 Quality Gate (VerificationAgent)
              </h4>
              <p className="card-sub" style={{ marginBottom: '1.25rem' }}>
                Rigorous quality constraints preventing hallucinatory or incomplete dispatches.
              </p>

              <div className="quality-gate-checklist">
                <div className="quality-item">
                  <div className="quality-item-icon done">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Completeness Criterion (100%)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      All required specialist fields (category, severity, department, SLA, summary) must be populated.
                    </div>
                  </div>
                </div>

                <div className="quality-item">
                  <div className="quality-item-icon done">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Consistency Criterion (100%)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      EvidenceAgent visual findings must agree with IssueAgent category without contradiction.
                    </div>
                  </div>
                </div>

                <div className="quality-item">
                  <div className="quality-item-icon done">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Confidence Threshold (&gt; 0.70)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Both issue confidence and routing confidence must exceed minimum reliability thresholds.
                    </div>
                  </div>
                </div>

                <div className="quality-item">
                  <div className="quality-item-icon done">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Autonomous Retry Cascade (Max 2)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      If any criterion fails, VerificationAgent injects targeted feedback and cascades retry to failed specialists.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentConsole;
