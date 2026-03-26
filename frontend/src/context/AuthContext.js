import React, { createContext, useEffect, useReducer } from 'react';

export const AuthContext = createContext();

const initialState = {
  user: null,
  authIsReady: false
};

export const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload };
    case 'LOGOUT':
      return { ...state, user: null };
    case 'READY':
      return { ...state, user: action.payload || null, authIsReady: true };
    default:
      return state;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      dispatch({ type: 'READY', payload: user });
    } catch (err) {
      console.error('AuthContext: failed to parse stored user', err);
      dispatch({ type: 'READY', payload: null });
    }
  }, []);

  // Helper actions (optional - can be used instead of direct dispatch)
  const login = (userObj) => {
    try {
      localStorage.setItem('user', JSON.stringify(userObj));
    } catch (err) {
      console.warn('AuthContext: failed to persist user to localStorage', err);
    }
    dispatch({ type: 'LOGIN', payload: userObj });
  };

  const logout = () => {
    try {
      localStorage.removeItem('user');
    } catch (err) {
      console.warn('AuthContext: failed to remove user from localStorage', err);
    }
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;