import { useState } from 'react';
import { useAuthContext } from './useAuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const useSignup = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();

  const signup = async (name, email, password, phone, role, department) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role, department })
      });

      const json = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setError(json?.error || json?.message || 'Signup failed');
        return false;
      }

      localStorage.setItem('user', JSON.stringify(json));
      dispatch({ type: 'LOGIN', payload: json });
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      setIsLoading(false);
      setError('Network error. Please check your connection.');
      return false;
    }
  };

  return { signup, isLoading, error };
};

export default useSignup;