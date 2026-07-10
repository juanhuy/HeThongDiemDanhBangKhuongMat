import React, { useState, useRef } from 'react';
import { Zap, UploadCloud } from 'lucide-react';

const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged }) => {
  const [activeTab, setActiveTab] = useState('attendance');

  // Form register states
  const [regMssv, setRegMssv] = useState('');
  const [regName, setRegName] = useState('');
  const [regLop, setRegLop] = useState('');
  const [regPhoto, setRegPhoto] = useState(null);
  const [regPhotoName, setRegPhotoName] = useState('');

  // Form Schedule states
  const [schClass, setSchClass] = useState('D22CQCNPM02-N');
  const [schDate, setSchDate] = useState(new Date().toISOString().substring(0, 10));
  const [schRoom, setSchRoom] = useState('A2-301');
  const [schTime, setSchTime] = useState('07:30');

  // Form structure states
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [ccCode, setCcCode] = useState('');
  const [ccSub, setCcSub] = useState('');

  // AI recognition states
  const [recognizeImageSrc, setRecognizeImageSrc] = useState('');
  const [recognizeFile, setRecognizeFile] = useState(null);
  
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  const styles = {
    card: {
      backgroundColor: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
    },
    cardHeader: {
      backgroundColor: "#ffffff",
      padding: "12px 20px",
      borderBottom: "1px solid #e2edf5",
      color: "#106fa6",
      fontWeight: "600",
      fontSize: "0.95rem",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    cardBody: {
      padding: "20px"
    },
    aiContainer: {
      display: "grid",
      gridTemplateColumns: "1.3fr 1fr",
      gap: "1.5rem"
    },
    dropzone: {
      position: "relative",
      width: "100%",
      minHeight: "260px",
      border: "2px dashed #b9d5e8",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
      background: "#f8fbfd",
      overflow: "hidden"
    },
    dropzonePrompt: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      textAlign: "center",
      color: "var(--text-muted)",
      padding: "2rem"
    },
    previewWrapper: {
      position: "relative",
      maxWidth: "100%"
    },
    previewImage: {
      width: "100%",
      display: "block",
      borderRadius: "6px"
    },
    detectionCanvas: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      marginBottom: "12px"
    },
    label: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "var(--text-muted)"
    },
    input: {
      background: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "6px",
      padding: "8px 12px",
      color: "var(--text-main)",
      fontSize: "0.9rem",
      outline: "none"
    },
    btn: {
      backgroundColor: "#1d92d1",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      padding: "10px 18px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.2s"
    },
    btnSecondary: {
      backgroundColor: "#f0f4f8",
      border: "1px solid #d0e0eb",
      color: "#106fa6"
    },
    tabs: {
      display: "flex",
      borderBottom: "1px solid #d0e0eb",
      gap: "1.5rem",
      marginBottom: "1.25rem"
    },
    tabBtn: {
      background: "none",
      border: "none",
      color: "var(--text-muted)",
      fontSize: "0.9rem",
      fontWeight: "500",
      padding: "8px 4px 10px 4px",
      cursor: "pointer",
      position: "relative"
    },
    tabBtnActive: {
      color: "#1d92d1",
      fontWeight: "600"
    }
  };

  const processImage = (file) => {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng tải lên file ảnh chân dung.", "danger");
      return;
    }
    setRecognizeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setRecognizeImageSrc(e.target.result);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImage(files[0]);
    }
  };

  const triggerRecognition = async () => {
    if (!recognizeFile) {
      showToast("Vui lòng kéo thả hoặc tải ảnh lên để đối chiếu.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("file", recognizeFile);
    showToast("AI đang xử lý nhận dạng khuôn mặt...");

    try {
      const res = await fetch(`${API_BASE}/api/recognize`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Nhận diện xong! Tìm thấy ${data.faces_detected} sinh viên.`);
        drawBoundingBoxes(data.results);
        if (onAttendanceLogged) {
          onAttendanceLogged();
        }
      } else {
        showToast(data.detail || "Lỗi xử lý đối chiếu", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối hệ thống AI.", "danger");
    }
  };

  const drawBoundingBoxes = (results) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    results.forEach(res => {
      const [x1, y1, x2, y2] = res.box;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      const color = res.is_known ? "#10b981" : "#ef4444";

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = color;
      ctx.font = "bold 13px 'Inter', sans-serif";
      const label = res.is_known ? `${res.fullname} (${res.mssv})` : "Chưa đăng ký";
      const textWidth = ctx.measureText(label).width;

      ctx.fillRect(bx, by - 24, textWidth + 14, 24);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, bx + 7, by - 7);
    });
  };

  const resetRecognition = () => {
    setRecognizeFile(null);
    setRecognizeImageSrc('');
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regPhoto) {
      showToast("Vui lòng chọn ảnh chân dung sinh viên.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("mssv", regMssv);
    formData.append("ho_ten", regName);
    formData.append("lop_base", regLop);
    formData.append("file", regPhoto);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đăng ký thành công thông tin & khuôn mặt sinh viên!");
        setRegPhoto(null);
        setRegPhotoName('');
        setRegMssv('');
        setRegName('');
        setRegLop('');
      } else {
        showToast(data.detail || "Đăng ký thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ.", "danger");
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const timeVal = schTime + (schTime.length === 5 ? ":00" : "");
    const formData = new FormData();
    formData.append("ma_lop_tc", schClass);
    formData.append("ngay_hoc", schDate);
    formData.append("phong_hoc", schRoom);
    formData.append("gio_bat_dau", timeVal);

    try {
      const res = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Thêm lịch học thành công!");
        setSchRoom('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("ma_mon", subCode);
    formData.append("ten_mon", subName);

    try {
      const res = await fetch(`${API_BASE}/api/mon_hoc`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã lưu môn học mới.");
        setSubCode('');
        setSubName('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleCreateCreditClass = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("ma_lop_tc", ccCode);
    formData.append("ma_mon", ccSub);

    try {
      const res = await fetch(`${API_BASE}/api/lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã lưu lớp tín chỉ.");
        setCcCode('');
        setCcSub('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Zap size={16} /> Phân hệ điểm danh khuôn mặt AI
      </div>
      <div style={styles.cardBody}>
        <div style={styles.aiContainer}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div 
              style={styles.dropzone}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={(e) => { if(e.target.files.length > 0) processImage(e.target.files[0]); }} 
              />
              
              {!recognizeImageSrc ? (
                <div style={styles.dropzonePrompt}>
                  <UploadCloud size={40} color="#1d92d1" />
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#106fa6" }}>
                    Kéo thả ảnh hoặc nhấp để chọn tệp điểm danh
                  </p>
                  <p style={{ fontSize: "0.75rem" }}>Định dạng cho phép: JPEG, PNG</p>
                </div>
              ) : (
                <div style={styles.previewWrapper}>
                  <img 
                    ref={imageRef} 
                    src={recognizeImageSrc} 
                    alt="Preview" 
                    style={styles.previewImage} 
                    onLoad={() => {
                      if (canvasRef.current && imageRef.current) {
                        canvasRef.current.width = imageRef.current.clientWidth;
                        canvasRef.current.height = imageRef.current.clientHeight;
                      }
                    }}
                  />
                  <canvas ref={canvasRef} style={styles.detectionCanvas}></canvas>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={resetRecognition}
                className="btn btn-secondary" 
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Làm mới
              </button>
              <button onClick={triggerRecognition} style={styles.btn}>
                Khởi chạy đối chiếu AI
              </button>
            </div>
          </div>

          <div style={{ borderLeft: "1px solid #d0e0eb", paddingLeft: "1.5rem" }}>
            <div style={styles.tabs}>
              <button 
                style={{ ...styles.tabBtn, ...(activeTab === 'attendance' ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab('attendance')}
              >
                Đăng ký SV
              </button>
              <button 
                style={{ ...styles.tabBtn, ...(activeTab === 'schedule' ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab('schedule')}
              >
                Lịch học
              </button>
              <button 
                style={{ ...styles.tabBtn, ...(activeTab === 'structure' ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab('structure')}
              >
                Môn học
              </button>
            </div>

            {activeTab === 'attendance' && (
              <form onSubmit={handleRegister}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>MSSV</label>
                  <input 
                    type="text" 
                    required 
                    style={styles.input} 
                    value={regMssv}
                    onChange={(e) => setRegMssv(e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Họ tên sinh viên</label>
                  <input 
                    type="text" 
                    required 
                    style={styles.input} 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lớp chuyên ngành</label>
                  <input 
                    type="text" 
                    required 
                    style={styles.input} 
                    value={regLop}
                    onChange={(e) => setRegLop(e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ảnh chân dung</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="reg-photo-file-ptit" 
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if(e.target.files.length > 0) {
                        setRegPhoto(e.target.files[0]);
                        setRegPhotoName(e.target.files[0].name);
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    style={{ ...styles.btn, ...styles.btnSecondary, padding: "8px 14px", fontSize: "0.8rem" }}
                    onClick={() => document.getElementById("reg-photo-file-ptit").click()}
                  >
                    Chọn file ảnh chân dung
                  </button>
                  {regPhotoName && (
                    <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px" }}>
                      ✓ {regPhotoName}
                    </div>
                  )}
                </div>
                <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Đăng ký khuôn mặt</button>
              </form>
            )}

            {activeTab === 'schedule' && (
              <form onSubmit={handleCreateSchedule}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lớp tín chỉ</label>
                  <input 
                    type="text" 
                    required 
                    style={styles.input} 
                    value={schClass}
                    onChange={(e) => setSchClass(e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ngày học</label>
                  <input 
                    type="date" 
                    required 
                    style={styles.input} 
                    value={schDate}
                    onChange={(e) => setSchDate(e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phòng học</label>
                  <input 
                    type="text" 
                    required 
                    style={styles.input} 
                    value={schRoom}
                    onChange={(e) => setSchRoom(e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Giờ bắt đầu</label>
                  <input 
                    type="time" 
                    required 
                    style={styles.input} 
                    value={schTime}
                    onChange={(e) => setSchTime(e.target.value)}
                  />
                </div>
                <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Thêm buổi học</button>
              </form>
            )}

            {activeTab === 'structure' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <form onSubmit={handleCreateSubject} style={{ borderBottom: "1px solid #d0e0eb", paddingBottom: "12px" }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Môn học mới</label>
                    <input 
                      type="text" 
                      placeholder="Mã môn (VD: INT1306)" 
                      required 
                      style={{ ...styles.input, marginBottom: "6px" }}
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Tên môn học" 
                      required 
                      style={styles.input}
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                    />
                  </div>
                  <button type="submit" style={{ ...styles.btn, width: "100%", padding: "8px" }}>Tạo môn</button>
                </form>

                <form onSubmit={handleCreateCreditClass} style={{ borderBottom: "1px solid #d0e0eb", paddingBottom: "12px" }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lớp tín chỉ</label>
                    <input 
                      type="text" 
                      placeholder="Mã lớp TC (VD: INT1306_01)" 
                      required 
                      style={{ ...styles.input, marginBottom: "6px" }}
                      value={ccCode}
                      onChange={(e) => setCcCode(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Mã môn liên kết" 
                      required 
                      style={styles.input}
                      value={ccSub}
                      onChange={(e) => setCcSub(e.target.value)}
                    />
                  </div>
                  <button type="submit" style={{ ...styles.btn, width: "100%", padding: "8px" }}>Tạo lớp TC</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAttendance;
