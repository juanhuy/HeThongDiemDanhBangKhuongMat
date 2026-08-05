import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const Toast = ({ toast }) => {
  if (!toast.visible) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div style={{
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      background: "#ffffff",
      borderLeft: `4px solid ${isSuccess ? 'var(--primary)' : 'var(--danger)'}`,
      borderRadius: "6px",
      padding: "12px 20px",
      color: "var(--text-main)",
      boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      border: "1px solid #d0e0eb"
    }}>
      {isSuccess ? <CheckCircle size={18} color="var(--primary)" /> : <AlertCircle size={18} color="var(--danger)" />}
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;
