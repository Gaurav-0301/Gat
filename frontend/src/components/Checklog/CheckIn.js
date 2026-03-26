// CheckIn.js (fixed)
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkLogsAPI, passesAPI } from '../../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import './CheckLog.css';
import { notifySuccess, notifyError } from '../../utils/notifications';

const CheckIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [passNumber, setPassNumber] = useState('');
  const [pass, setPass] = useState(null);
  const [visitorPhoto, setVisitorPhoto] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrRef = useRef(null);
  const decodeReadyRef = useRef(false);
  const warmupTimerRef = useRef(null);
  const scannerRegionId = 'qr-reader-checkin';

  const toAbsoluteUrl = (path) => {
    if (!path) return null;
    const str = String(path);
    if (/^https?:\/\//i.test(str)) return str;
    const baseApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const base = baseApi.replace(/\/api\/?$/, '');
    const normalized = str.startsWith('/') ? str : `/${str}`;
    return `${base}${normalized}`;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizePass = (value) => (value || '').toString().trim();
  const coerceToStringId = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (typeof value === 'object') {
      if (value.$oid) return String(value.$oid).trim();
      if (value._id) return coerceToStringId(value._id);
      if (value.hexString) return String(value.hexString).trim();
      if (typeof value.toString === 'function') {
        const s = value.toString();
        if (typeof s === 'string' && s !== '[object Object]') return s.trim();
      }
      return '';
    }
    return '';
  };

  const handleVerifyPass = async (overrideValue) => {
    const candidate = (typeof overrideValue === 'string' || typeof overrideValue === 'number')
      ? overrideValue
      : passNumber;
    const trimmed = normalizePass(candidate);
    if (!trimmed) {
      setError('Please enter a pass number');
      return;
    }
    if (trimmed === '[object Object]') {
      setError('Invalid QR payload. Please rescan the code.');
      return;
    }
    setPassNumber(trimmed);
    setVerifying(true);
    setError(null);
    setScanMessage('');
    try {
      const result = await passesAPI.verify(trimmed);
      const isValid = result?.valid || result?.success || (result?.status === 'valid');
      const receivedPass = result?.pass || result?.data || result;

      if (isValid) {
        setPass(receivedPass || null);
        // Try to get photo from multiple possible locations in the response
        const photoUrl = receivedPass?.visitorPhoto || 
            result?.visitorPhoto || 
            receivedPass?.visitor?.photo || 
            result?.visitor?.photo || 
            null;
        console.log('Photo URL extracted:', photoUrl, 'from result:', result);
        setVisitorPhoto(toAbsoluteUrl(photoUrl));
        setError(null);
     } else {
        let errMsg = result?.error || result?.message || 'Pass is not valid';
        if (typeof errMsg === 'object') {
          errMsg = errMsg?.message || JSON.stringify(errMsg);
        }
        const finalMsg = String(errMsg).trim();
        setError(finalMsg);
        setPass(null);
        setVisitorPhoto(null);
      }
    } catch (err) {
      console.error('verify error', err);
      setError(err?.message || 'Failed to verify pass');
      setPass(null);
      setVisitorPhoto(null);
    } finally {
      setVerifying(false);
    }
  };

  const stopCamera = async () => {
    if (warmupTimerRef.current) {
      clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
    decodeReadyRef.current = false;
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
      }
    } catch (err) {
    } finally {
      html5QrRef.current = null;
      setIsCameraActive(false);
    }
  };

  const parseQRData = (decodedText) => {
    try {
      const parsed = typeof decodedText === 'string' ? JSON.parse(decodedText) : decodedText;
      const idStr = coerceToStringId(parsed?.appointmentId);
      if (idStr) return idStr;
      const passStr = coerceToStringId(parsed?.passNumber || parsed?.pass?.passNumber);
      if (passStr) return passStr;
      return String(decodedText || '').trim();
    } catch {
      return String(decodedText || '').trim();
    }
  };

  const handleScanSuccess = async (decodedText) => {
    try {
      const appointmentId = parseQRData(decodedText);
      if (!appointmentId) {
        setScanMessage('QR detected, but no valid appointment ID found');
        return;
      }
      setScanMessage('Pass detected from QR. Click "Verify Pass" to continue.');
      await stopCamera();
      setPassNumber(coerceToStringId(appointmentId) || String(appointmentId || '').trim());
    } catch (err) {
      console.error('QR parse error', err);
      setError(err?.message || 'Invalid QR code. Please try again.');
      setScanMessage('');
      await stopCamera();
    }
  };

  const handleScanFailure = (err) => {
    if (!decodeReadyRef.current) return;
    setScanMessage('Unable to detect QR code. Please upload a clear QR image.');
  };

  const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  const startCameraScan = async () => {
    if (isCameraActive) {
      await stopCamera();
      return;
    }
    setScanMessage('Requesting camera permission...');
    setError(null);
    decodeReadyRef.current = false;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError('Camera not supported in this browser. Try QR image upload instead.');
        return;
      }

      const videoConstraints = isMobileDevice()
        ? { facingMode: { ideal: 'environment' } }
        : { facingMode: 'environment' };

      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      permissionStream.getTracks().forEach((t) => t.stop());

      setIsCameraActive(true);
      await sleep(80);

      const qr = new Html5Qrcode(scannerRegionId);
      html5QrRef.current = qr;
      const startConfig = { fps: 10, qrbox: 250 };
      const cameraConfig = { facingMode: 'environment' };
      await qr.start(
        cameraConfig,
        startConfig,
        (decodedText, decodedResult) => {
          if (!decodeReadyRef.current) return;
          handleScanSuccess(decodedText, decodedResult);
        },
        (err) => {
          if (!decodeReadyRef.current) return;
          handleScanFailure(err);
        }
      );

      setScanMessage('Warming up camera...');
      warmupTimerRef.current = setTimeout(() => {
        decodeReadyRef.current = true;
        setScanMessage('Camera ready. Align QR inside the box.');
      }, 400);
    } catch (err) {
      console.error('Camera scan error', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
        setError('Camera unavailable or permission denied. Please allow access or use QR image upload.');
      } else {
        setError('Unable to access camera. Please allow permission or try file upload.');
      }
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.clear();
        } catch (clearErr) {
        }
      }
      html5QrRef.current = null;
      setIsCameraActive(false);
    }
  };

  const handleFileScan = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setScanMessage('Scanning image...');
    setError(null);
    try {
      const qr = new Html5Qrcode(`${scannerRegionId}-file`);
      const text = await qr.scanFile(file, true);
      await qr.clear();
      const appointmentId = parseQRData(text);
      if (!appointmentId) {
        setScanMessage('QR image found, but no valid appointment ID extracted.');
        return;
      }
      setPassNumber(coerceToStringId(appointmentId) || String(appointmentId || '').trim());
      setScanMessage('Pass detected from image. Click "Verify Pass" to continue.');
    } catch (err) {
      console.error('File scan error', err);
      setError('Unable to detect QR code. Please upload a clear QR image.');
    }
  };

  useEffect(() => {
    const initial = location?.state?.passNumber;
    if (initial !== undefined && initial !== null) {
      const coerced = coerceToStringId(initial);
      if (coerced) {
        setPassNumber(coerced);
      }
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!pass || !pass._id) throw new Error('No valid pass selected');

      const now = new Date();
      const validUntil = pass.validUntil ? new Date(pass.validUntil) : null;
      const validFrom = pass.validFrom ? new Date(pass.validFrom) : null;
      if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
        throw new Error('Pass is not valid at this time');
      }

      const checkInData = {
        passId: pass._id,
        visitorId: pass?.visitor?._id || pass?.visitor?.id
      };

      const res = await checkLogsAPI.checkIn(checkInData);
      if (res?.error || res?.success === false) throw res;

      notifySuccess('Visitor checked in successfully!');
      navigate('/checklogs');
    } catch (err) {
      console.error('Check in error:', err);
      const message = err?.message || err?.error || err?.msg || 'Failed to check in visitor';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCheckIn = () => {
    if (window.confirm('Are you sure you want to reject this visitor check-in?')) {
      setPass(null);
      setPassNumber('');
      setVisitorPhoto(null);
      setError(null);
      notifySuccess('Check-in rejected. Form cleared.');
    }
  };

  return (
    <div className='checkin-page'>
      <div className='checkin-card'>
        <h2 className='checkin-heading'>Visitor Check-In</h2>

        <div className="verify-section-checkin">
          <input
            className='pass-input-checkin'
            type='text'
            value={passNumber}
            onChange={(e) => setPassNumber(e.target.value)}
            placeholder='Enter Pass Number'
          />
          <button className='verify-btn-checkin' onClick={() => handleVerifyPass()} disabled={verifying || !passNumber.trim()}>
            {verifying ? 'Verifying...' : 'Verify Pass'}
          </button>

          <div className="qr-actions">
            <button
              type="button"
              className='verify-btn-checkin outline'
              onClick={startCameraScan}
              disabled={verifying}
            >
              {isCameraActive ? 'Stop Camera Scan' : 'Scan QR (Camera)'}
            </button>

            <label className='upload-label'>
              <input
                type='file'
                accept='image/*'
                onChange={handleFileScan}
                style={{ display: 'none' }}
                disabled={verifying}
              />
              <span className='verify-btn-checkin outline'>Upload QR Image</span>
            </label>
          </div>

          <div className='qr-preview-shell'>
            <div
              id={scannerRegionId}
              className='qr-viewer'
              style={{ visibility: isCameraActive ? 'visible' : 'hidden' }}
            />
          </div>

          <div id={`${scannerRegionId}-file`} style={{ display: 'none' }} />

          {scanMessage && <div className='info-text'>{scanMessage}</div>}
        </div>

      {error && <div className='error' role="alert">{error}</div>}

      {pass && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Visitor:</strong> {pass?.visitor?.name || 'N/A'}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Valid Until:</strong> {pass?.validUntil ? new Date(pass.validUntil).toLocaleString() : 'N/A'}
          </div>

          {visitorPhoto && (
            <div style={{ marginTop: '16px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #ddd', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Visitor Photo</h3>
              <img
                src={visitorPhoto}
                alt="Visitor identity at check-in"
                style={{
                  maxWidth: '200px',
                  maxHeight: '250px',
                  borderRadius: '4px',
                  border: '2px solid #3498db',
                  marginTop: '10px'
                }}
              onError={(e) => {
                console.error('Photo load error:', visitorPhoto);
                e.target.style.display = 'none';
              }}
            />
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type='submit' disabled={loading}>
              {loading ? 'Checking in...' : '✅ Check In Visitor'}
            </button>
            <button 
              type='button' 
              onClick={handleRejectCheckIn}
              disabled={loading}
            >
              ❌ Reject Check In
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
};

export default CheckIn;
