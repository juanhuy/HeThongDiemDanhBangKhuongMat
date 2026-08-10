const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '16px',
    boxSizing: 'border-box',
  },

  container: {
    width: '100%',
    maxWidth: 1600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  card: {
    background: '#fff',
    border: '1px solid #d0e0eb',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    padding: 18,
    borderBottom: '1px solid #e2edf5',
  },

  titleWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },

  titleIcon: {
    width: 22,
    height: 22,
    color: '#106fa6',
    flexShrink: 0,
    marginTop: 2,
  },

  title: {
    margin: 0,
    color: '#1e293b',
    fontSize: '1.25rem',
    lineHeight: 1.3,
    fontWeight: 700,
  },

  description: {
    margin: '5px 0 0',
    color: '#64748b',
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },

  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },

  selectedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 6,
  },

  selectedText: {
    padding: '0 8px',
    color: '#075985',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  bulkSelect: {
    height: 32,
    padding: '0 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 5,
    background: '#fff',
    color: '#334155',
    fontSize: '0.75rem',
    outline: 'none',
    cursor: 'pointer',
  },

  secondaryButton: {
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 16px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    background: '#fff',
    color: '#334155',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },

  primaryButton: {
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 16px',
    border: 'none',
    borderRadius: 6,
    background: '#106fa6',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    padding: 16,
  },

  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 82,
    padding: 16,
    borderRadius: 8,
    boxSizing: 'border-box',
  },

  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  summaryLabel: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
  },

  summaryValue: {
    margin: 0,
    fontSize: '1.7rem',
    lineHeight: 1,
    fontWeight: 700,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  chartBox: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 280,
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 23, 42, 0.55)',
    padding: 16,
    boxSizing: 'border-box',
  },

  modalContainer: {
    width: '100%',
    maxWidth: 1160,
    height: '92vh',
    maxHeight: 'calc(100vh - 32px)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 28,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    boxShadow: '0 20px 70px rgba(15, 23, 42, 0.18)',
  },

  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '22px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#0f172a',
    color: '#ffffff',
  },

  modalHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'space-between',
  },

  modalHeaderIcon: {
    width: 48,
    height: 48,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 24,
    background: '#111827',
  },

  modalLabel: {
    margin: 0,
    fontSize: '0.75rem',
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },

  modalTitle: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
  },

  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    cursor: 'pointer',
  },

  modalContentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 24,
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    background: '#f8fafc',
    padding: 24,
  },

  modalPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 28,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    padding: 24,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  },

  modalPanelBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },

  modalPanelFooter: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
  },

  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#ffffff',
    display: 'flex',
    justifyContent: 'flex-end',
  },

  modalSection: {
    display: 'grid',
    gap: 16,
  },

  modalSectionHeader: {
    display: 'grid',
    gap: 6,
  },

  modalSectionTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
  },

  modalSectionSubtitle: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.95rem',
  },

  modalCard: {
    borderRadius: 24,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    padding: 18,
  },

  modalGridColumns: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  modalFormGrid: {
    display: 'grid',
    gap: 20,
  },

  modalField: {
    display: 'grid',
    gap: 8,
  },

  modalInput: {
    height: 44,
    width: '100%',
    padding: '0 16px',
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },

  modalTextarea: {
    width: '100%',
    minHeight: 100,
    padding: '12px 16px',
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },

  modalButtonPrimary: {
    height: 48,
    borderRadius: 24,
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },

  modalButtonSecondary: {
    height: 44,
    borderRadius: 24,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },

  modalInfoBox: {
    display: 'flex',
    gap: 10,
    borderRadius: 18,
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    padding: 14,
    color: '#1e3a8a',
  },

  modalScheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    paddingRight: 8,
    maxHeight: 360,
  },

  modalScheduleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    cursor: 'pointer',
  },

  modalScheduleDetails: {
    display: 'grid',
    gap: 8,
  },

  modalTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 700,
  },

  modalDangerButton: {
    height: 44,
    width: 44,
    borderRadius: 18,
    border: '1px solid transparent',
    background: '#fef2f2',
    color: '#b91c1c',
    cursor: 'pointer',
  },
};

export default styles;
