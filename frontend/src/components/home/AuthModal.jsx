import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, User, Mail, Phone, MapPin, Lock, 
  ArrowRight, ShieldCheck, CheckCircle2, Sparkles, KeyRound
} from 'lucide-react';

const DEMO_CITIZEN = {
  name: 'Aarav Sharma',
  email: 'citizen@civicflow.gov.in',
  password: 'Citizen@123',
  ward: 'Ward 112 - Indiranagar',
  role: 'citizen'
};

const DEMO_ADMIN = {
  name: 'Dr. Meera Iyer',
  email: 'admin@civicflow.gov.in',
  password: 'Admin@123',
  ward: 'City Central Command',
  role: 'admin'
};

const AuthModal = () => {
  const { authModalOpen, closeAuthModal, authModalTab, setAuthModalTab, loginUser, registerUser } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    identifier: '',
    ward: '',
    password: '',
  });

  if (!authModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authModalTab === 'signup') {
      registerUser({
        name: formData.name || 'Aarav Sharma',
        email: formData.identifier || 'citizen@civicflow.gov.in',
        password: formData.password || 'Citizen@123',
        ward: formData.ward || 'Ward 112 - Indiranagar',
        role: 'citizen'
      });
    } else {
      const email = formData.identifier || 'citizen@civicflow.gov.in';
      const roleTarget = email.toLowerCase().includes('admin') ? 'admin' : 'citizen';
      loginUser({
        name: roleTarget === 'admin' ? 'Dr. Meera Iyer' : 'Aarav Sharma',
        email: email,
        password: formData.password || (roleTarget === 'admin' ? 'Admin@123' : 'Citizen@123'),
        ward: roleTarget === 'admin' ? 'Municipal HQ' : 'Ward 112 - Indiranagar',
        role: roleTarget,
      });
    }
  };

  const handleInstantDemoLogin = (demoAccount) => {
    loginUser({
      name: demoAccount.name,
      email: demoAccount.email,
      password: demoAccount.password,
      ward: demoAccount.ward,
      role: demoAccount.role,
    });
  };

  const autofillCredentials = (demoAccount) => {
    setFormData({
      name: demoAccount.name,
      identifier: demoAccount.email,
      password: demoAccount.password,
      ward: demoAccount.ward,
    });
  };

  return (
    <div className="auth-overlay" onClick={closeAuthModal}>
      <div 
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '520px' }}
      >
        {/* Header Tabs & Close */}
        <div className="auth-header">
          <div className="auth-tab-group">
            <button
              type="button"
              className={`auth-tab-btn ${authModalTab === 'login' ? 'active' : ''}`}
              onClick={() => setAuthModalTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authModalTab === 'signup' ? 'active' : ''}`}
              onClick={() => setAuthModalTab('signup')}
            >
              Register Account
            </button>
          </div>

          <button 
            type="button" 
            className="auth-close-btn" 
            onClick={closeAuthModal}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="auth-body">
          {/* Quick Demo Credentials Info Banner */}
          <div style={{ background: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#b45309', marginBottom: '0.4rem' }}>
              <KeyRound size={16} /> Demo Credentials (Pre-seeded in Supabase)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div 
                onClick={() => autofillCredentials(DEMO_CITIZEN)}
                style={{ background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)' }}
                title="Click to auto-fill form"
              >
                <div style={{ fontWeight: 700, color: '#15803d' }}>Citizen Demo</div>
                <div style={{ color: 'var(--text-dark)' }}>citizen@civicflow.gov.in</div>
                <div style={{ color: 'var(--text-muted)' }}>Pass: <strong>Citizen@123</strong></div>
              </div>

              <div 
                onClick={() => autofillCredentials(DEMO_ADMIN)}
                style={{ background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)' }}
                title="Click to auto-fill form"
              >
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>Admin & Authority Demo</div>
                <div style={{ color: 'var(--text-dark)' }}>admin@civicflow.gov.in</div>
                <div style={{ color: 'var(--text-muted)' }}>Pass: <strong>Admin@123</strong></div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
              Click any box to auto-fill, or use 1-click buttons below
            </div>
          </div>

          {authModalTab === 'signup' ? (
            <>
              <div className="auth-title-box">
                <h3 className="auth-heading" style={{ fontSize: '1.25rem' }}>Create Citizen Account</h3>
                <p className="auth-sub" style={{ fontSize: '0.875rem' }}>
                  Register to file civic complaints with automated AI triaging, real-time SLA tracking, and resolution verification.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Aarav Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="citizen@civicflow.gov.in"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Municipal Ward</label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Ward 112 - Indiranagar"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Create secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  <span>Register Account & Enter</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-title-box">
                <h3 className="auth-heading" style={{ fontSize: '1.25rem' }}>Sign In to CivicFlow</h3>
                <p className="auth-sub" style={{ fontSize: '0.875rem' }}>
                  Enter your credentials or choose a demo account to access your portal.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="citizen@civicflow.gov.in or admin@civicflow.gov.in"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  <span>Sign In to Portal</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </form>
            </>
          )}

          {/* 1-Click Instant Demo Login */}
          <div className="auth-demo-section" style={{ marginTop: '1.25rem' }}>
            <div className="auth-demo-divider">
              <span>OR 1-CLICK INSTANT DEMO LOGIN</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="auth-demo-card"
                onClick={() => handleInstantDemoLogin(DEMO_CITIZEN)}
                style={{ padding: '0.75rem' }}
              >
                <div className="auth-demo-badge citizen" style={{ marginBottom: '0.35rem' }}>Citizen</div>
                <span className="auth-demo-text" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Login as Aarav Sharma</span>
              </button>

              <button
                type="button"
                className="auth-demo-card"
                onClick={() => handleInstantDemoLogin(DEMO_ADMIN)}
                style={{ padding: '0.75rem' }}
              >
                <div className="auth-demo-badge admin" style={{ marginBottom: '0.35rem' }}>Admin / Authority</div>
                <span className="auth-demo-text" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Login as Dr. Meera Iyer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
