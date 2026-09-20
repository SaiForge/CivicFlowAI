import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, ChevronRight, ChevronLeft, Camera, 
  Bot, ShieldCheck, Sparkles, Check, ArrowRight
} from 'lucide-react';

const steps = [
  {
    step: 1,
    tag: 'Step 1 · Snap & Report',
    title: 'Snap & Geotag Issues',
    subtitle: 'Spot a problem in your neighborhood?',
    description: 'Take a quick photo or describe the issue — potholes, broken streetlights, garbage overflow, or water leaks. Your GPS automatically pinpoints the exact ward and road coordinates.',
    tip: '📸 Supports instant photo and video uploads with geotags',
    icon: Camera,
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.12)',
    accentColor: '#f59e0b',
  },
  {
    step: 2,
    tag: 'Step 2 · AI Multi-Agent Triage',
    title: 'Instant Autonomous Routing',
    subtitle: 'Zero municipal red tape or lost complaints',
    description: 'CivicFlow’s 5 autonomous AI agents instantly verify evidence, detect nearby duplicate reports, calculate the priority score, and route directly to the designated department.',
    tip: '⚡ AI agents triage and assign issues in under 10 seconds',
    icon: Bot,
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    accentColor: '#3b82f6',
  },
  {
    step: 3,
    tag: 'Step 3 · Track & Verify',
    title: 'Live SLA & Proof of Work',
    subtitle: 'Complete transparency from start to finish',
    description: 'Track your complaint live as it moves from Assigned to In-Progress to Resolved. Field officers must submit before/after photo proof of work before the ticket is closed.',
    tip: '✅ Community upvotes and citizen feedback verify resolutions',
    icon: ShieldCheck,
    color: '#16a34a',
    bgColor: 'rgba(22, 163, 74, 0.14)',
    accentColor: '#10b981',
  },
];

const OnboardingTourModal = () => {
  const { onboardingOpen, dismissOnboarding, openAuthModal } = useApp();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!onboardingOpen) return null;

  const currentStep = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;
  const IconComponent = currentStep.icon;

  const handleNext = () => {
    if (isLast) {
      dismissOnboarding();
      openAuthModal('signup');
    } else {
      setCurrentStepIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  return (
    <div className="onboarding-overlay" onClick={dismissOnboarding}>
      <div 
        className="onboarding-android-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CivicFlow Quick Start Guide"
      >
        {/* Top Header Bar with Android-Style Corner Controls: Skip on Left, Close (X) on Right */}
        <div className="onboarding-top-bar">
          <button 
            type="button"
            className="onboarding-skip-btn"
            onClick={dismissOnboarding}
            aria-label="Skip walkthrough"
          >
            Skip
          </button>

          <span className="onboarding-step-counter">
            {currentStepIndex + 1} of {steps.length}
          </span>

          <button 
            type="button"
            className="onboarding-close-btn"
            onClick={dismissOnboarding}
            aria-label="Close guide"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Card Body with Android Material Feel */}
        <div className="onboarding-body">
          {/* Animated Illustrated Icon Badge */}
          <div 
            className="onboarding-icon-container"
            style={{ 
              backgroundColor: currentStep.bgColor, 
              color: currentStep.color,
              boxShadow: `0 8px 24px ${currentStep.bgColor}`,
            }}
          >
            <IconComponent size={36} strokeWidth={1.8} />
          </div>

          {/* Step Tag */}
          <span 
            className="onboarding-tag"
            style={{ color: currentStep.color, backgroundColor: currentStep.bgColor }}
          >
            <Sparkles size={11} strokeWidth={2.5} style={{ display: 'inline', marginRight: '4px' }} />
            {currentStep.tag}
          </span>

          {/* Titles & Text */}
          <h3 className="onboarding-title">{currentStep.title}</h3>
          <p className="onboarding-subtitle">{currentStep.subtitle}</p>
          <p className="onboarding-desc">{currentStep.description}</p>

          {/* Quick Tip Box */}
          <div className="onboarding-tip-box">
            <span>{currentStep.tip}</span>
          </div>
        </div>

        {/* Android Dot / Pill Stepper */}
        <div className="onboarding-stepper-wrap">
          <div className="onboarding-dot-stepper">
            {steps.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                className={`onboarding-dot ${idx === currentStepIndex ? 'onboarding-dot-active' : ''}`}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Bar: Android Style Previous & Next / Get Started Buttons */}
        <div className="onboarding-footer-bar">
          <button
            type="button"
            className="onboarding-nav-btn onboarding-prev-btn"
            onClick={handlePrev}
            disabled={isFirst}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            <span>Previous</span>
          </button>

          <button
            type="button"
            className={`onboarding-nav-btn onboarding-next-btn ${isLast ? 'onboarding-finish-btn' : ''}`}
            onClick={handleNext}
          >
            <span>{isLast ? 'Get Started' : 'Next'}</span>
            {isLast ? <ArrowRight size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTourModal;
