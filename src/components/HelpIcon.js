import React, { useState } from 'react';

const HelpIcon = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className="help-icon-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="help-icon">?</span>
      {show && <div className="help-tooltip">{text}</div>}
    </div>
  );
};

export default HelpIcon;
