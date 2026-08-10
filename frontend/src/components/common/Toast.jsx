import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const COLOR_MAP = {
  success: '#10b981',
  danger: '#ef4444',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#1d92d1',
};

const ICON_MAP = {
  success: CheckCircle,
  danger: AlertCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const Toast = ({ toast }) => {
  if (!toast.visible) return null;

  const type = toast.type || 'success';
  const color = COLOR_MAP[type] || COLOR_MAP.info;
  const Icon = ICON_MAP[type] || Info;

  return (
    <div style={{
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      background: "#ffffff",
      borderLeft: `4px solid ${color}`,
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
      <Icon size={18} color={color} />
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;
