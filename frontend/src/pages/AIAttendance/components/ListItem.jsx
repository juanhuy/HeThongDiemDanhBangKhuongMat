import React from 'react';

const ListItem = ({ children, className = '' }) => (
  <div className={`list-item ${className}`.trim()}>{children}</div>
);

export default ListItem;
