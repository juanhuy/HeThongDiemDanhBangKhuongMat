import React from 'react';

const ListStack = ({ children, className = '' }) => (
  <div className={`list-stack ${className}`.trim()}>{children}</div>
);

export default ListStack;
