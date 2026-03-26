import React, { useState } from 'react';
import { useLogin } from '../../hooks/useLogin';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    await login(email, password);

    // Check if login was successful
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
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>

        <div className="form-group">
          <label htmlFor="login-email">Email:</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password:</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>

        <p className="auth-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
