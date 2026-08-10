// Các style dùng chung cho toàn bộ phân hệ Điểm danh / Quản lý (AIAttendance)
export const cardStyles = {
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
    display: "block",
    gridTemplateColumns: "1fr",
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
    color: "#6c8da3",
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
    color: "#54738c"
  },
  input: {
    background: "#ffffff",
    border: "1px solid #d0e0eb",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "#1c3240",
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
    gap: "1rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap"
  },
  tabBtn: {
    background: "none",
    border: "none",
    color: "#6c8da3",
    fontSize: "0.85rem",
    fontWeight: "500",
    padding: "8px 4px 10px 4px",
    cursor: "pointer",
    position: "relative"
  },
  tabBtnActive: {
    color: "#1d92d1",
    fontWeight: "600"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "8px",
    fontSize: "0.85rem"
  },
  th: {
    backgroundColor: "#f0f4f8",
    color: "#106fa6",
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #d0e0eb"
  },
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #eef3f7",
    color: "#2a3d4a"
  }
};