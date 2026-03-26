import { useAuthContext } from './useAuthContext';
import { useNavigate } from 'react-router-dom';

export const useLogout = () => {
  const { dispatch } = useAuthContext();
  const navigate = useNavigate();

  const logout = () => {
    try {
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return { logout };
};

export default useLogout;