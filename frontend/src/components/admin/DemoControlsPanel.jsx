import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';

const DEMO_TOGGLES = [
  { key: "demo_mode", label: "Chế độ DEMO (bật tổng thể)", hint: "Bật banner cảnh báo DEMO khắp hệ thống." },
  { key: "bypass_registration_window", label: "Bỏ qua đợt đăng ký (mở/đóng)", hint: "Cho phép đăng ký kể cả khi ngoài thời gian mở/đóng." },
  { key: "bypass_semester", label: "Bỏ qua học kỳ / niên khóa", hint: "Đăng ký được lớp thuộc học kỳ khác với học kỳ đang mở." },
  { key: "bypass_capacity", label: "Bỏ qua sĩ số tối đa lớp", hint: "Đăng ký vào lớp đã đủ chỗ." },
  { key: "bypass_prerequisites", label: "Bỏ qua môn tiên quyết", hint: "Đăng ký môn dù chưa học môn tiên quyết." },
  { key: "bypass_credit_limit", label: "Bỏ qua giới hạn tín chỉ", hint: "Đăng ký vượt quá số tín chỉ tối đa cho phép." },
  { key: "bypass_eligibility", label: "Bỏ qua học vụ & khóa học", hint: "Cho phép sinh viên bảo lưu / sai khóa đăng ký." },
  { key: "bypass_duplicate_subject", label: "Cho phép đăng ký trùng môn", hint: "Đăng ký cùng một môn học ở nhiều lớp." },
  { key: "allow_unenroll_after_attendance", label: "Cho phép hủy đăng ký dù đã điểm danh", hint: "Bỏ chặn khi sinh viên đã có buổi điểm danh trong lớp." },
  { key: "allow_after_hours_leave", label: "Cho phép nộp đơn nghỉ sau giờ học", hint: "Cho nộp đơn nghỉ kể cả khi buổi học đã bắt đầu." },
  { key: "allow_override_present_leave", label: "Cho phép duyệt đơn ghi đè buổi có mặt", hint: "Duyệt đơn nghỉ sẽ ghi đè buổi sinh viên đã có mặt thành Có phép." }
];

const styles = {
  card: {
    background: "#ffffff",
    border: "1px solid #d0e0eb",
    borderRadius: "10px",
    padding: "15px"
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9"
  },
  label: { fontWeight: "600", fontSize: "0.82rem", color: "#1e293b" },
  hint: { fontSize: "0.72rem", color: "#94a3b8" },
  tip: {
    marginTop: "14px",
    fontSize: "0.78rem",
    color: "#106fa6",
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "6px",
    padding: "8px 10px"
  }
};

export default function DemoControlsPanel({ showToast }) {
  const [controls, setControls] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchControls = async () => {
      try {
        const data = await apiFetch(`/api/admin/demo/controls`);
        setControls(data.controls || {});
      } catch {
        showToast?.("Không tải được bảng điều khiển demo.", "danger");
      }
    };
    fetchControls();
  }, [showToast]);

  const handleToggle = async (key, value) => {
    const prev = { ...(controls || {}) };
    setControls(prevState => ({ ...(prevState || {}), [key]: value }));
    setSaving(true);
    try {
      const data = await apiFetch(`/api/admin/demo/controls`, {
        method: "PUT",
        body: JSON.stringify({ [key]: value })
      });
      setControls(data.controls || { ...prev, [key]: value });
      showToast?.(value ? `Đã bật "${key}".` : `Đã tắt "${key}".`, "success");
    } catch (err) {
      setControls(prevState => ({ ...(prevState || {}), [key]: !value }));
      showToast?.(err.message || "Cập nhật demo thất bại.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0" }}>Bảng điều khiển DEMO</h4>
        {saving && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Đang lưu...</span>}
      </div>
      <p style={{ fontSize: "0.8rem", color: "#6c8da3", margin: "0 0 14px 0" }}>
        Dùng để "nới" các quy tắc đăng ký ngay trong lúc demo với thầy cô. Các lựa chọn được lưu
        hệ thống và áp dụng ngay, không cần khởi động lại server.
      </p>

      {!controls ? (
        <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Đang tải cài đặt...</p>
      ) : (
        <div style={styles.card}>
          {DEMO_TOGGLES.map(t => {
            const on = !!controls[t.key];
            return (
              <div key={t.key} style={styles.row}>
                <div>
                  <div style={styles.label}>{t.label}</div>
                  <div style={styles.hint}>{t.hint}</div>
                </div>
                <button
                  onClick={() => handleToggle(t.key, !on)}
                  disabled={saving}
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    background: on ? (t.key === 'demo_mode' ? "#e11d48" : "#10b981") : "#cbd5e1",
                    position: "relative",
                    transition: "background 0.2s"
                  }}
                  aria-label={t.label}
                >
                  <span style={{
                    position: "absolute",
                    top: 3,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    left: on ? 23 : 3,
                    transition: "left 0.2s"
                  }} />
                </button>
              </div>
            );
          })}

          <div style={styles.tip}>
            💡 Mẹo: Tắt hết các công tắc để demo "đúng quy định", bật từng cái để trình diễn
            hệ thống vẫn <b>vận hành linh hoạt</b> khi cần.
          </div>
        </div>
      )}
    </div>
  );
}
