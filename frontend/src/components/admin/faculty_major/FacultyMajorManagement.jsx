import React, { useState, useEffect } from 'react';
import { Building, Layers, Users } from 'lucide-react';
import FacultiesTab from './FacultiesTab';
import MajorsTab from './MajorsTab';
import AdminClassesTab from './AdminClassesTab';

const styles = {
  tabBtn: { padding: "10px 20px", border: "none", borderBottom: "2px solid transparent", background: "transparent", cursor: "pointer", fontWeight: "600", fontSize: "1rem", color: "#64748b", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s" },
  activeTab: { color: "#106fa6", borderBottom: "2px solid #106fa6" }
};

const FacultyMajorManagement = ({ API_BASE = 'http://localhost:8000', showToast }) => {
  const [activeTab, setActiveTab] = useState('faculties'); 
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [facRes, majRes] = await Promise.all([
        fetch(`${API_BASE}/api/faculties/`),
        fetch(`${API_BASE}/api/majors/`)
      ]);
      if (facRes.ok) setFaculties(await facRes.json());
      if (majRes.ok) setMajors(await majRes.json());
    } catch (err) {
      showToast?.("Lỗi kết nối dữ liệu hệ thống", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TAB NAVIGATION HEADER */}
      <div style={{ background: "#ffffff", padding: "15px 20px 0 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
          <Building size={26} color="#106fa6" />
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý Đơn vị, Chuyên ngành & Lớp biên chế</h2>
        </div>
        
        <div style={{ display: "flex", gap: "20px", borderTop: "1px solid #f1f5f9" }}>
          <button style={{ ...styles.tabBtn, ...(activeTab === 'faculties' ? styles.activeTab : {}) }} onClick={() => setActiveTab('faculties')}>
            <Building size={18}/> Danh sách Khoa
          </button>
          <button style={{ ...styles.tabBtn, ...(activeTab === 'majors' ? styles.activeTab : {}) }} onClick={() => setActiveTab('majors')}>
            <Layers size={18}/> Danh sách Ngành
          </button>
          <button style={{ ...styles.tabBtn, ...(activeTab === 'classes' ? styles.activeTab : {}) }} onClick={() => setActiveTab('classes')}>
            <Users size={18}/> Quản lý Lớp biên chế
          </button>
        </div>
      </div>

      {/* RENDER TAB CONTENT */}
      {activeTab === 'faculties' && <FacultiesTab API_BASE={API_BASE} showToast={showToast} faculties={faculties} fetchAllData={fetchAllData} loading={loading} />}
      {activeTab === 'majors' && <MajorsTab API_BASE={API_BASE} showToast={showToast} majors={majors} faculties={faculties} fetchAllData={fetchAllData} loading={loading} />}
      {activeTab === 'classes' && <AdminClassesTab API_BASE={API_BASE} showToast={showToast} majors={majors} faculties={faculties} />}
    </div>
  );
};

export default FacultyMajorManagement;