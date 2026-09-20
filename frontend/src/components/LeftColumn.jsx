import React from 'react';
import { ChevronDown, Laptop2, MoreVertical, Apple } from 'lucide-react';

const LeftColumn = () => {
  return (
    <div className="col-left">
      {/* Profile Card */}
      <div className="card profile-card">
        <div className="profile-img-wrap">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnhDMl7tPBiUlkGWdSLKHKA8qLfyY03a8LhZxs7ZJAw7pN_4uSZikmgCZDuYzQlpnC01toYlfFjhNrnLeAgCeYbHIVqcp90PTDfc1-KCnPkz7HKRehzZH7_RwqPX_Ul-pghIFnplASK1ItrIITNyl-XBOOE4K17OCVI-C9huVMcaSuEKsiCilRtMKWlp98Sic15ExzLGVg7Lh2IKoL8AU8ZizcKx6bt6BLRMJYJ2SSe7zJkVKAcGJYaa1DF6J0Qpz2JQ"
            alt="Lora Piterson"
            className="profile-img"
          />
          <div className="salary-badge">$1,200</div>
        </div>
        <div style={{ width: '100%' }}>
          <h3 className="profile-name">Lora Piterson</h3>
          <p className="profile-role">UX/UI Designer</p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="accordion-list">
        <div className="accordion-item">
          <span className="accordion-item-label">Pension contributions</span>
          <ChevronDown size={14} strokeWidth={2} />
        </div>

        {/* Expanded: Devices */}
        <div className="accordion-expanded">
          <div className="accordion-expanded-header">
            <span className="accordion-item-label">Devices</span>
            <ChevronDown size={14} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div className="device-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div className="device-icon">
                <Laptop2 size={18} strokeWidth={1.5} />
              </div>
              <div>
                <div className="device-info">MacBook Air</div>
                <div className="device-sub">Version M1</div>
              </div>
            </div>
            <button className="btn-dots">
              <MoreVertical size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="accordion-item">
          <span className="accordion-item-label">Compensation Summary</span>
          <ChevronDown size={14} strokeWidth={2} />
        </div>

        <div className="accordion-item">
          <span className="accordion-item-label">Employee Benefits</span>
          <ChevronDown size={14} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

export default LeftColumn;
