import React from 'react';
import './Loader.css';

const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className="loader-container" role="status" aria-live="polite">
      <div className="loader" aria-hidden="true" />
      <span className="loader-text">{message}</span>
    </div>
  );
};

export default Loader;