import React, { useState, useRef } from 'react';
import { Camera, UploadCloud } from 'lucide-react';
import { authFetch } from '../../api/client';

export default function FaceBiometrics({ user, showToast }) {
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCam, setUseCam] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);

  const mssv = user?.mssv || user?.username?.toUpperCase();

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setStream(s);
      setUseCam(true);
      setPreview('');
      setFile(null);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 100);
    } catch (err) {
      showToast?.('Không mở được camera: ' + err.message, 'danger');
    }
  };

  const stopCam = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setUseCam(false);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `${mssv}_face.jpg`, { type: 'image/jpeg' });
      setFile(f);
      setPreview(URL.createObjectURL(blob));
      stopCam();
    }, 'image/jpeg');
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    stopCam();
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) {
      showToast?.('Chưa có ảnh khuôn mặt', 'danger');
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('mssv', mssv);
      fd.append('file', file);
      const res = await authFetch(`/api/face-registration`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast?.(data.message || 'Đăng ký Face ID thành công – chờ duyệt');
        setFile(null);
        setPreview('');
      } else {
        showToast?.(data.detail || 'Đăng ký thất bại', 'danger');
      }
    } catch {
      showToast?.('Lỗi kết nối', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#106fa6', fontWeight: 700 }}>Sinh trắc học Face ID</h2>
        <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
          MSSV: <strong>{mssv}</strong> — Chụp hoặc upload ảnh khuôn mặt rõ, nhìn thẳng
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {!useCam ? (
            <button onClick={startCam} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              <Camera size={16} /> Bật camera
            </button>
          ) : (
            <>
              <button onClick={capture} style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                Chụp ảnh
              </button>
              <button onClick={stopCam} style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}>
                Tắt
              </button>
            </>
          )}
          <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            <UploadCloud size={16} /> Upload
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </div>

        <div style={{ background: '#0f172a', borderRadius: 10, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 }}>
          {useCam ? (
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
          ) : preview ? (
            <img src={preview} alt="face" style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} />
          ) : (
            <span style={{ color: '#64748b' }}>Chưa có ảnh</span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !file}
          style={{
            width: '100%',
            padding: 12,
            background: loading || !file ? '#94a3b8' : '#106fa6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading || !file ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Đang gửi...' : 'Gửi đăng ký Face ID'}
        </button>
      </div>
    </div>
  );
}