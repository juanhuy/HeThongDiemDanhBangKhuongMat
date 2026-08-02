import React from 'react';

const PanelCard = ({ children, className = '' }) => (
  <section className={`panel-card ${className}`.trim()}>{children}</section>
);

export default PanelCard;
