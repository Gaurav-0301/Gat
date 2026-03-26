import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const handleGoHome = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          Oops! The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="notfound-actions">
          <button className="btn-primary" onClick={handleGoHome}>
            🏠 {user ? 'Go to Dashboard' : 'Go to Login'}
          </button>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;