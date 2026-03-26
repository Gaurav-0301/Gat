import React from 'react';
import PropTypes from 'prop-types';
import './StatCard.css';

const StatCard = ({ title, value, icon, color }) => {
  // Ensure 0 displays correctly
  const displayValue = value !== null && value !== undefined ? value : 'N/A';
  const safeColor = ['blue', 'green', 'orange', 'red'].includes(color) ? color : 'blue';

  return (
    <div 
      className={`stat-card stat-card-${safeColor}`} 
      role="article" 
      aria-label={`${title}: ${displayValue}`}
    >
      <div className="stat-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{displayValue}</h3>
        <p className="stat-title">{title}</p>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  icon: PropTypes.node,
  color: PropTypes.oneOf(['blue', 'green', 'orange', 'red'])
};

StatCard.defaultProps = {
  value: 0,
  icon: '📊',
  color: 'blue'
};

export default StatCard;