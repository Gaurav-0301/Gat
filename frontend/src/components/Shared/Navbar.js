import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogout } from '../../hooks/useLogout';
import { useAuthContext } from '../../hooks/useAuthContext';
import './Navbar.css';

const Navbar = () => {
  const { logout } = useLogout();
  const { user } = useAuthContext();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
          🎫 Visitor Pass System
        </Link>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-icon">
            {mobileMenuOpen ? '✕' : '☰'}
          </span>
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {user ? (
            <>
              <Link className="navbar-link" to="/dashboard" onClick={closeMobileMenu}>
                Dashboard
              </Link>

              {isAdmin && (
                <>
                  <Link className="navbar-link" to="/visitors" onClick={closeMobileMenu}>
                    Visitors
                  </Link>
                  <Link className="navbar-link" to="/users" onClick={closeMobileMenu}>
                    Users
                  </Link>
                  {/* Passes, Check Logs hidden for ADMIN per requirements */}
                </>
              )}

              {(isAdmin || role === 'employee') && (
                <Link className="navbar-link" to="/appointments" onClick={closeMobileMenu}>
                  Appointments
                </Link>
              )}

              {/* Users hidden for ADMIN per requirements */}

              {user.role === 'visitor' && (
                <Link className="navbar-link" to="/my-pass" onClick={closeMobileMenu}>
                  My Pass
                </Link>
              )}
              {(user.role === 'visitor' || user.role === 'employee') && (
                <Link className="navbar-link" to="/profile" onClick={closeMobileMenu}>
                  Profile
                </Link>
              )}

              <div className="navbar-user">
                <span className="navbar-username">
                  {user.name} <small>({
                    user.role === 'admin' ? 'Admin' :
                    user.role === 'security' ? 'Security' :
                    user.role === 'employee' ? 'Employee' :
                    user.role === 'visitor' ? 'Visitor' : user.role
                  })</small>
                </span>
                <button 
                  className="btn-logout" 
                  onClick={handleLogout} 
                  aria-label="Log out"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link className="navbar-link" to="/login" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link className="navbar-link" to="/signup" onClick={closeMobileMenu}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;