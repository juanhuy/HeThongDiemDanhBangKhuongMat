const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,.05)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
  },

  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  buttonGroup: {
    display: "flex",
    gap: "10px",
  },

  searchBar: {
    padding: "15px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    gap: "10px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
    textAlign: "left",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modal: {
    width: "500px",
    maxWidth: "95%",
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)",
  },

  modalHeader: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  modalBody: {
    padding: "20px",
  },

  form: {
    display: "grid",
    gap: "15px",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "10px",
  }
};