// PassDetail.js (fixed)
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { passesAPI } from '../../services/api';
import Loader from '../Shared/Loader';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import './Pass.css';

const PassDetail = () => {
  const { id } = useParams();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);

  // moved function above useEffect for clarity & lint compliance
  const fetchPassDetails = async () => {
    try {
      setLoading(true);
      const data = await passesAPI.getOne(id);
      // API might return the pass directly or nested in an object
      const received = data?.pass || data;
      setPass(received || null);
    } catch (error) {
      console.error('Error fetching pass details:', error);
      setPass(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPassDetails();
    // we want to re-fetch when id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (!pass) {
    return <div className="pass-not-found">Pass not found</div>;
  }

  const safeFormat = (dateStr, pattern = 'MMM dd, yyyy HH:mm') => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return format(d, pattern);
    } catch {
      return 'N/A';
    }
  };

  const status = pass.status || 'unknown';

  return (
    <div className="pass-detail-container">
      <div className="pass-card">
        <div className="pass-header">
          <h2>VISITOR PASS</h2>
          <p className="pass-number">#{pass.passNumber || '—'}</p>
        </div>

        <div className="pass-body">
          <div className="pass-section">
            <h3>Visitor Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Name:</label>
                <span>{pass.visitor?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{pass.visitor?.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{pass.visitor?.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Company:</label>
                <span>{pass.visitor?.company || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="pass-section">
            <h3>Pass Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Valid From:</label>
                <span>{safeFormat(pass.validFrom)}</span>
              </div>
              <div className="info-item">
                <label>Valid Until:</label>
                <span>{safeFormat(pass.validUntil)}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span
                  className={`badge ${
                    status === 'active' ? 'badge-green' : status === 'expired' ? 'badge-orange' : 'badge-red'
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="info-item">
                <label>Issued By:</label>
                <span>{pass.issuedBy?.name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {pass.host && (
            <div className="pass-section">
              <h3>Host Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{pass.host.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Department:</label>
                  <span>{pass.host.department || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {pass.accessAreas && pass.accessAreas.length > 0 && (
            <div className="pass-section">
              <h3>Access Areas</h3>
              <div className="access-areas">
                {pass.accessAreas.map((area, index) => (
                  <span key={index} className="badge badge-blue">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pass.specialInstructions && (
            <div className="pass-section">
              <h3>Special Instructions</h3>
              <p>{pass.specialInstructions}</p>
            </div>
          )}

          <div className="pass-section qr-section">
            <h3>QR Code</h3>
            <div className="qr-code-container">
              {pass.qrCode ? <QRCode value={String(pass.qrCode)} size={200} /> : <div>No QR data</div>}
            </div>
            <p className="qr-instruction">Scan this QR code at the entrance</p>
          </div>
        </div>

        <div className="pass-footer">
          {pass.pdfPath ? (
            <a
              href={pass.pdfPath.startsWith('http') ? pass.pdfPath : `http://localhost:5000/${pass.pdfPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              📄 Download PDF Badge
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PassDetail;
