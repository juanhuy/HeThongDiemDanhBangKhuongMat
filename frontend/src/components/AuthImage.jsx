import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

// Tải ảnh khuôn mặt qua apiFetch (tự gắn token) rồi hiển thị bằng Blob URL.
// Cần API_BASE; fallback là chữ cái đầu tiên của tên nếu ảnh chưa có.
const AuthImage = ({ API_BASE, filename, alt = "", fallback = "?" }) => {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const load = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/images/${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error("not found");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    setFailed(false);
    setSrc(null);
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [API_BASE, filename]);

  if (failed || !src) {
    return (
      <span
        style={{
          width: 64, height: 64, borderRadius: "50%",
          backgroundColor: "#d0e0eb", color: "#106fa6",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: "700", fontSize: "1.2rem"
        }}
      >
        {fallback}
      </span>
    );
  }

  return <img src={src} alt={alt} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />;
};

export default AuthImage;