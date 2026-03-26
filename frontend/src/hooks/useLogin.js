import { useState } from 'react';
import { useAuthContext } from './useAuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const useLogin = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const json = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setError(json?.error || json?.message || 'Login failed');
        return false;
      }

      // Save the complete response that contains token/user
      localStorage.setItem('user', JSON.stringify(json));
      dispatch({ type: 'LOGIN', payload: json });
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      setError('Network error. Please check your connection.');
      return false;
    }
  };

  return { login, isLoading, error };
};

export default useLogin;