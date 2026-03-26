import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { passesAPI } from "../../services/api";

const MyPass = () => {
  const [pass, setPass] = useState(null);

  const fetchMyPass = async () => {
    try {
      const res = await passesAPI.getMy();

      setPass(res.data.data || null);
    } catch (err) {
      console.error("Failed to fetch pass", err);
    }
  };

  useEffect(() => {
    fetchMyPass();
  }, []);

  if (!pass) {
    return <p style={{ textAlign: "center" }}>No active visitor pass found</p>;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          width: 360,
          textAlign: "center",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h2>My Visitor Pass</h2>

        {/* QR */}
        {pass.qrCode ? (
          <img
            src={pass.qrCode}
            alt="QR Code"
            style={{ width: 180, height: 180 }}
          />
        ) : (
          <QRCode value={pass.passNumber} size={180} />
        )}

        {/* Details */}
        <div style={{ marginTop: 16, textAlign: "left" }}>
          <p><strong>Pass No:</strong> {pass.passNumber}</p>
          <p><strong>Status:</strong> {pass.status}</p>
          <p><strong>Valid From:</strong> {new Date(pass.validFrom).toLocaleString()}</p>
          <p><strong>Valid Until:</strong> {new Date(pass.validUntil).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default MyPass;
