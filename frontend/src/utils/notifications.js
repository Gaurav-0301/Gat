import { toast } from 'react-toastify';

const baseOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'colored'
};

export const notifySuccess = (message, options = {}) =>
  toast.success(message || 'Success', { ...baseOptions, ...options });

export const notifyError = (message, options = {}) =>
  toast.error(message || 'Something went wrong', { ...baseOptions, ...options });

export const notifyInfo = (message, options = {}) =>
  toast.info(message || 'Notice', { ...baseOptions, ...options });

const notifications = {
  notifySuccess,
  notifyError,
  notifyInfo
};

export default notifications;
