// QRScanner.js (fixed)
import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
// Verification happens in CheckIn; do not call API here
import './QRScanner.css';

const QRScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5QrcodeScanner('qr-reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5
    });

    function onScanSuccess(decodedText) {
      if (!mounted) return;
      setScanning(false);
      // stop scanner and clear UI
      scanner.clear().catch(() => {/* ignore clear errors */});
      const passNumber = parseQrToString(decodedText);
      if (!passNumber) {
        setError('No valid value found in QR payload');
        return;
      }
      navigate('/checklogs/checkin', { state: { passNumber } });
    }

    function onScanError(err) {
      // handle scan error silently
      console.warn('QR Scan Error:', err);
    }

    scanner.render(onScanSuccess, onScanError);

    return () => {
      mounted = false;
      // ensure we clear scanner when component unmounts
      try {
        scanner.clear().catch(() => {/* ignore */});
      } catch (e) {
        // if scanner wasn't initialized, ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseQrToString = (decodedText) => {
    try {
      const parsed = typeof decodedText === 'string' ? JSON.parse(decodedText) : decodedText;
      const value = parsed?.appointmentId || parsed?.passNumber || parsed?.pass?.passNumber;
      return value ? String(value).trim() : '';
    } catch {
      return String(decodedText || '').trim();
    }
  };

  const resetScannerState = () => {
    setError(null);
    setResult(null);
    setScanning(true);
    // re-rendering scanner requires remounting #qr-reader element in the DOM; for simplicity
    // we reload the page fragment by navigating to this route again which will remount component.
    // Alternatively the parent could conditionally render <QRScanner key={Date.now()} />.
    window.location.reload();
  };

  const handleProceedToCheckIn = () => {
    navigate('/checklogs/checkin');
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-card">
        <h2>Scan Visitor Pass QR Code</h2>

        {scanning && (
          <div>
            <div id="qr-reader"></div>
            <p className="scanner-instruction">Position the QR code within the frame to scan</p>
          </div>
        )}

        {/* Result view removed: verification happens in CheckIn */}

        {error && (
          <div className="scan-result error">
            <h3>❌ Verification Failed</h3>
            <p>{error}</p>
            <button onClick={resetScannerState} className="btn-secondary">
              Scan Again
            </button>
          </div>
        )}

        <button onClick={() => navigate('/checklogs')} className="btn-secondary mt-2">
          Back to Check Logs
        </button>
      </div>
    </div>
  );
};

export default QRScanner;
