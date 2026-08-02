import React from 'react';

const PageHeader = ({ title, subtitle }) => (
  <div className="panel-header">
    <div>
      <h3>{title}</h3>
      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  </div>
);

export default PageHeader;
