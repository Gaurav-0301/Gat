import React, { useState } from 'react';
import { useSignup } from '../../hooks/useSignup';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('visitor');
  const [department, setDepartment] = useState('');
  const { signup, isLoading, error } = useSignup();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    await signup(name, email, password, phone, role, department || undefined);

    // Check if signup was successful
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('user'));
    } catch {
      user = null;
    }

    if (user) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container signup">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>

        <div className="form-group">
          <label htmlFor="signup-name">Name:</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-email">Email:</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">Password:</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <small>Password must contain uppercase, lowercase, number, and special character</small>
        </div>

        <div className="form-group">
          <label htmlFor="signup-phone">Phone:</label>
          <input
            id="signup-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-department">Department (optional):</label>
          <input
            id="signup-department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. HR, Security, Engineering"
          />
          <small>Leave blank if not applicable.</small>
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading...' : 'Sign Up'}
        </button>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
