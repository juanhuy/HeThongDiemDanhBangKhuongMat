import React from 'react';

const ActionRow = ({ children, className = '' }) => (
  <div className={`action-row ${className}`.trim()}>{children}</div>
);

export default ActionRow;
