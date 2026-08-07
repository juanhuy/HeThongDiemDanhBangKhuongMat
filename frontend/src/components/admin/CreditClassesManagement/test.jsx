import React from 'react';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  loadingMessage = 'Đang tải...',
  rowKey = 'id',
}) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={col.onHeaderClick}
                style={{
                  padding: '10px 14px',
                  textAlign: col.align || 'left',
                  color: '#475569',
                  width: col.width,
                  cursor: col.onHeaderClick ? 'pointer' : 'default',
                  ...col.headerStyle,
                }}
              >
                {col.headerRender ? col.headerRender() : col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                {loadingMessage}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row[rowKey] ?? index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      padding: '10px 14px',
                      textAlign: col.align || 'left',
                      ...col.cellStyle,
                    }}
                  >
                    {col.render
                      ? col.render(row, index)
                      : col.accessor
                      ? row[col.accessor] ?? '—'
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;