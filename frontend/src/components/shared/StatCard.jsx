import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Reuses .card, .counter-item, .counter-icon patterns
const StatCard = ({ icon, label, value, trend, trendUp, accent = false }) => {
  return (
    <div className={`card stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="stat-card-top">
        <div className="counter-icon stat-icon">{icon}</div>
        {trend !== undefined && (
          <span className={`badge ${trendUp ? 'badge-yellow' : 'badge-dark'} stat-trend`}>
            {trendUp
              ? <TrendingUp size={9} strokeWidth={2.5} style={{ display:'inline', verticalAlign:'middle' }}/>
              : <TrendingDown size={9} strokeWidth={2.5} style={{ display:'inline', verticalAlign:'middle' }}/>
            }{' '}{trend}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
};

export default StatCard;
