import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ icon, label, value, change, trend, trendUp, accent = false, color }) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon;
      return <IconComponent size={20} color={color || '#b45309'} strokeWidth={2} />;
    }
    return null;
  };

  const trendText = trend || change;

  return (
    <div className={`card stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="stat-card-top">
        <div className="counter-icon stat-icon">
          {renderIcon()}
        </div>
        {trendText && (
          <span className={`badge ${trendUp || trend === 'up' ? 'badge-yellow' : 'badge-dark'} stat-trend`} style={{ fontSize: '0.75rem' }}>
            {trendUp || trend === 'up' ? (
              <TrendingUp size={11} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
            ) : trend === 'down' ? (
              <TrendingDown size={11} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
            ) : null}
            {trendText}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
};

export default StatCard;
