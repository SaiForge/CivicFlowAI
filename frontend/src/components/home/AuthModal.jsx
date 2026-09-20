import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, User, Mail, Phone, MapPin, Lock, 
  ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';

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
        name: formData.name || 'New Citizen',
        email: formData.identifier || 'citizen@civicflow.gov.in',
        password: formData.password || 'demo123',
        ward: formData.ward || 'Ward 14, Central Zone',
      });
    } else {
      loginUser({
        email: formData.identifier || 'citizen@civicflow.gov',
        password: formData.password || 'demo123',
      });
    }
  };

  const handleDemoLogin = (roleName, demoName, ward) => {
    loginUser({ _demo: true, role: roleName, name: demoName, ward });
  };

  return (
    <div className="auth-overlay" onClick={closeAuthModal}>
      <div 
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
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
              Register Complaints
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
          {authModalTab === 'signup' ? (
            <>
              <div className="auth-title-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                  <ShieldCheck size={14} /> Official Citizen Portal
                </div>
                <h3 className="auth-heading">Register to File Complaints</h3>
                <p className="auth-sub">
                  Create a profile to report issues, receive real-time SLA updates, and verify municipal repairs.
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
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Mobile Number or Email</label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. +91 98765 43210 or email"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Your Ward / Area</label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Ward 14, MG Road, Sector 5"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
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
                      placeholder="Create secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  <span>Register & File First Complaint</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-title-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Sparkles size={14} color="#d97706" /> Welcome Back
                </div>
                <h3 className="auth-heading">Sign In to CivicFlow</h3>
                <p className="auth-sub">
                  Track your active grievances, monitor department SLA, or sign in as administrator.
                </p>
              </div>

              {/* Default Admin Credentials Banner */}
              <div className="auth-admin-cred-box">
                <div className="admin-cred-top">
                  <div className="admin-cred-title">
                    <ShieldCheck size={13} color="#b45309" />
                    <span>Default Administrator Credentials</span>
                  </div>
                  <button
                    type="button"
                    className="admin-autofill-btn"
                    onClick={() => setFormData({ ...formData, identifier: 'admin@civicflow.gov', password: 'admin123' })}
                  >
                    Auto-Fill Admin
                  </button>
                </div>
                <div className="admin-cred-body">
                  <div className="admin-cred-row">
                    <span className="admin-cred-label">Username:</span>
                    <code className="admin-cred-val">admin@civicflow.gov</code>
                    <span className="admin-cred-or">or</span>
                    <code className="admin-cred-val">admin</code>
                  </div>
                  <div className="admin-cred-row">
                    <span className="admin-cred-label">Password:</span>
                    <code className="admin-cred-val">admin123</code>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Mobile Number, Email, or Username</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. admin@civicflow.gov or citizen"
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  <span>Sign In & Open Workspace</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </form>
            </>
          )}

          {/* Quick Demo Access Bar */}
          <div className="auth-demo-section">
            <div className="auth-demo-divider">
              <span>OR 1-CLICK INSTANT DEMO LOGIN</span>
            </div>
            <div className="auth-demo-grid">
              <button
                type="button"
                className="auth-demo-card"
                onClick={() => handleDemoLogin('citizen', 'Aarav Sharma (Citizen)', 'Ward 14')}
              >
                <div className="auth-demo-badge citizen">Citizen</div>
                <span className="auth-demo-text">Citizen Grievance Portal</span>
              </button>

              <button
                type="button"
                className="auth-demo-card"
                onClick={() => handleDemoLogin('dept', 'Eng. Rajesh (Road Dept)', 'Central Zone')}
              >
                <div className="auth-demo-badge dept">Authority</div>
                <span className="auth-demo-text">Field Officer & Dispatch</span>
              </button>

              <button
                type="button"
                className="auth-demo-card"
                onClick={() => handleDemoLogin('admin', 'Dr. Meera Patel (City Admin)', 'Municipal HQ')}
              >
                <div className="auth-demo-badge admin">Admin</div>
                <span className="auth-demo-text">City Admin (admin / admin123)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
