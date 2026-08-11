import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, UploadCloud, Users } from 'lucide-react';
import { attendanceApi, roomsApi } from '../../api';

export default function CameraDashboard({ showToast, onAttendanceLogged }) {
  const [cameraRoom, setCameraRoom] = useState('TEST-301');
  const [rooms, setRooms] = useState([]);
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [recognizeImageSrc, setRecognizeImageSrc] = useState('');
  const [recognizeFile, setRecognizeFile] = useState(null);
  const [passiveMode, setPassiveMode] = useState(false);
  const [passiveInterval, setPassiveInterval] = useState(5);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [snapshotCount, setSnapshotCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const snapshotTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await roomsApi.listRooms();
        const roomList = Array.isArray(res) ? res : (res?.items || res?.data || []);
        if (roomList.length > 0) {
          setRooms(roomList);
          if (roomList.some(r => r.room_id === 'TEST-301')) {
            setCameraRoom('TEST-301');
          } else {
            setCameraRoom(roomList[0].room_id);
          }
        }
      } catch (e) {
        console.error('Lỗi tải phòng học:', e);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    };
  }, [webcamStream]);

  useEffect(() => {
    if (!useWebcam || !webcamStream) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const temp = document.createElement('canvas');
      temp.width = video.videoWidth || 640;
      temp.height = video.videoHeight || 480;
      temp.getContext('2d').drawImage(video, 0, 0, temp.width, temp.height);

      temp.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const data = await attendanceApi.recognizeFace(blob, cameraRoom);
          setDetectionLogs(data.results || []);
          drawBoxes(data.results || [], temp);
          onAttendanceLogged?.();
        } catch (err) {
          console.error('Lỗi quét khuôn mặt:', err);
        }
      }, 'image/jpeg');
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [useWebcam, webcamStream, cameraRoom]);

  // Camera thụ động: quét định kỳ chụp snapshot hiện diện (demo: vài giây)
  useEffect(() => {
    if (!useWebcam || !webcamStream || !passiveMode) {
      if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      return;
    }

    const capture = () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const temp = document.createElement('canvas');
      temp.width = video.videoWidth || 640;
      temp.height = video.videoHeight || 480;
      temp.getContext('2d').drawImage(video, 0, 0, temp.width, temp.height);
      temp.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const data = await attendanceApi.presenceSnapshot(blob, cameraRoom);
          setLastSnapshot(data);
          setSnapshotCount((c) => c + 1);
          if (data?.status === 'success' && data.count > 0) {
            showToast?.(`📸 Snapshot: ${data.count} SV đang có mặt`, 'success');
          }
        } catch (err) {
          console.error('Lỗi chụp snapshot:', err);
        }
      }, 'image/jpeg');
    };

    snapshotTimerRef.current = setInterval(capture, Math.max(1, passiveInterval) * 1000);
    return () => {
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    };
  }, [useWebcam, webcamStream, passiveMode, passiveInterval, cameraRoom]);

  const drawBoxes = (results, sourceCanvas) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / (sourceCanvas.width || 640);
    const scaleY = canvas.height / (sourceCanvas.height || 480);

    results.forEach((item) => {
      const [x1, y1, x2, y2] = item.box || [0, 0, 0, 0];
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;
      const color = item.is_known ? '#10b981' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      const label = item.is_known ? `${item.fullname} – ${item.trang_thai}` : 'Chưa đăng ký';
      ctx.fillStyle = color;
      ctx.font = "bold 13px 'Inter', sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.fillRect(bx, by - 24, tw + 14, 24);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, bx + 7, by - 7);
    });
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setWebcamStream(stream);
      setUseWebcam(true);
      setRecognizeImageSrc('');
      setRecognizeFile(null);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      showToast?.('Không thể truy cập camera: ' + err.message, 'danger');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) webcamStream.getTracks().forEach((t) => t.stop());
    setWebcamStream(null);
    setUseWebcam(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecognizeFile(file);
    setRecognizeImageSrc(URL.createObjectURL(file));
    stopWebcam();
    try {
      const data = await attendanceApi.recognizeFace(file, cameraRoom);
      setDetectionLogs(data.results || []);
      onAttendanceLogged?.();
      showToast?.(`Nhận diện xong: ${(data.results || []).length} khuôn mặt`);
    } catch (err) {
      showToast?.(err.message || 'Lỗi nhận diện', 'danger');
    }
  };

  const takeSnapshotNow = async () => {
    if (!videoRef.current) {
      showToast?.('Hãy bật webcam trước khi chụp snapshot', 'warning');
      return;
    }
    const video = videoRef.current;
    const temp = document.createElement('canvas');
    temp.width = video.videoWidth || 640;
    temp.height = video.videoHeight || 480;
    temp.getContext('2d').drawImage(video, 0, 0, temp.width, temp.height);
    temp.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const data = await attendanceApi.presenceSnapshot(blob, cameraRoom);
        setLastSnapshot(data);
        setSnapshotCount((c) => c + 1);
        if (data?.status === 'success') {
          showToast?.(`📸 Snapshot thủ công: ${data.count} SV đang có mặt`, data.count > 0 ? 'success' : 'warning');
        } else {
          showToast?.(data?.message || 'Không chụp được snapshot', 'warning');
        }
      } catch (err) {
        showToast?.(err.message || 'Lỗi chụp snapshot', 'danger');
      }
    }, 'image/jpeg');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>Điểm danh Camera</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Phòng:</label>
          <select
            value={cameraRoom}
            onChange={(e) => setCameraRoom(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, minWidth: 140, fontWeight: 600, color: '#0369a1' }}
          >
            {rooms.length === 0 ? (
              <option value={cameraRoom}>{cameraRoom}</option>
            ) : (
              rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.room_id} {r.room_name ? `(${r.room_name})` : ''}
                </option>
              ))
            )}
            {rooms.length > 0 && !rooms.some(r => r.room_id === cameraRoom) && (
              <option value={cameraRoom}>{cameraRoom}</option>
            )}
          </select>
          {!useWebcam ? (
            <button onClick={startWebcam} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              <Camera size={16} /> Bật webcam
            </button>
          ) : (
            <button onClick={stopWebcam} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              <StopCircle size={16} /> Tắt webcam
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer', color: '#334155' }}
          >
            <UploadCloud size={16} /> Upload ảnh
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />

          {/* Camera thụ động */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #e2edf5', paddingLeft: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              <input type="checkbox" checked={passiveMode} onChange={(e) => setPassiveMode(e.target.checked)} />
              <Users size={16} /> Snapshot thụ động
            </label>
            {passiveMode && (
              <>
                <label style={{ fontSize: '0.8rem', color: '#475569' }}>mỗi</label>
                <input
                  type="number" min={1} value={passiveInterval}
                  onChange={(e) => setPassiveInterval(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 60, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.8rem' }}
                />
                <label style={{ fontSize: '0.8rem', color: '#475569' }}>giây</label>
                <button onClick={takeSnapshotNow} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                  <Camera size={14} /> Chụp ngay
                </button>
              </>
            )}
          </div>
          {lastSnapshot && (
            <div style={{ fontSize: '0.75rem', color: passiveMode ? '#059669' : '#64748b', fontWeight: 600 }}>
              {lastSnapshot.status === 'success'
                ? `Đã chụp ${snapshotCount} snapshot · ${lastSnapshot.count} SV có mặt · ${lastSnapshot.scanned_at}`
                : lastSnapshot.message}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Preview */}
        <div style={{ background: '#0f172a', borderRadius: 10, position: 'relative', minHeight: 360, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {useWebcam ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            </>
          ) : recognizeImageSrc ? (
            <img src={recognizeImageSrc} alt="preview" style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain' }} />
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center' }}>
              <Camera size={48} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>Bật webcam hoặc upload ảnh để nhận diện</p>
            </div>
          )}
        </div>

        {/* Logs */}
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden', maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
            Kết quả nhận diện ({detectionLogs.length})
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
            {detectionLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: 20 }}>Chưa có kết quả</p>
            ) : (
              detectionLogs.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px',
                    marginBottom: 6,
                    borderRadius: 8,
                    background: item.is_known ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${item.is_known ? '#bbf7d0' : '#fecaca'}`,
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: item.is_known ? '#16a34a' : '#dc2626' }}>
                    {item.is_known ? item.fullname || item.mssv : 'Chưa đăng ký'}
                  </div>
                  {item.is_known && (
                    <div style={{ color: '#64748b', marginTop: 2 }}>
                      {item.mssv} · {item.trang_thai}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}